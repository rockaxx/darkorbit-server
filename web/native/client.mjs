import { Framer, request } from './protocol.mjs';
import { drawSprite, mapName } from './art.mjs';
import { Chat } from './chat.mjs';

const $ = id => document.getElementById(id);
const canvas=$('space'), ctx=canvas.getContext('2d'), mini=$('minimap'), mc=mini.getContext('2d');
const chat=new Chat();
const state={hero:null,ships:new Map(),portals:new Map(),boxes:new Map(),selected:null,connected:false,received:0,movesSent:0,combatHits:0,errors:[],effects:[],zoom:.55};
// Read-only diagnostics for integration tests; credentials never enter this object.
Object.defineProperty(window,'orbitDebug',{get:()=>({connected:state.connected,chatConnected:chat.ready,combatHits:state.combatHits,hero:state.hero?{...state.hero}:null,ships:state.ships.size,entities:[...state.ships.values()].map(s=>({...s})),gates:[...state.portals.values()],portals:state.portals.size,received:state.received,movesSent:state.movesSent,errors:[...state.errors]})});
let socket,loginTimer,width=innerWidth,height=innerHeight,noticeUntil=0,renderTime=0;
const number=n=>Math.round(n||0).toLocaleString('sk-SK');
const bounds=()=>[16,29].includes(state.hero?.map)?{w:41800,h:26000}:{w:20800,h:12800};
function notice(text,ms=5000){$('notice').textContent=text;noticeUntil=performance.now()+ms;}
function status(text,connected=false){state.connected=connected;$('connection').textContent=text;$('connection').style.color=connected?'#66d6a6':'#f5c76a';$('reconnect').hidden=connected;document.querySelectorAll('[data-action]').forEach(b=>b.disabled=!connected&&b.dataset.action!=='fullscreen');}
function position(ship,now=performance.now()){
  if(!ship?.motion)return;
  const m=ship.motion,t=Math.min(1,Math.max(0,(now-m.start)/Math.max(1,m.duration)));
  ship.x=m.x+(m.tx-m.x)*t;ship.y=m.y+(m.ty-m.y)*t;
  if(t===1)delete ship.motion;
}
function moveShip(ship,x,y,duration){position(ship);ship.angle=Math.atan2(y-ship.y,x-ship.x);ship.motion={x:ship.x,y:ship.y,tx:x,ty:y,duration,start:performance.now()};}
function hud(){
  const h=state.hero;if(!h)return;
  $('name').textContent=h.name;$('map').textContent=mapName(h.map);$('level').textContent='LVL '+h.level;
  for(const key of ['hp','shield']){const max=h[key==='hp'?'maxHp':'maxShield'];$(key).max=Math.max(1,max);$(key).value=Math.max(0,h[key]);$(key+'Text').textContent=number(h[key])+' / '+number(max);}
  $('credits').textContent=number(h.credits);$('uridium').textContent=number(h.uridium);
  const target=state.ships.get(state.selected);$('target').hidden=!target;
  if(target){$('targetName').textContent=target.name;$('targetStats').textContent=target.hp===undefined?'Zameriavam…':'Trup '+number(target.hp)+' · Štít '+number(target.shield);}
}
function command(o){
  state.received++;
  switch(o.type){
    case 'hero': clearTimeout(loginTimer);state.ships.clear();state.portals.clear();state.boxes.clear();state.selected=null;state.hero=o;state.ships.set(o.id,o);$('death').hidden=true;status('● Pripojené',true);notice('Loď pripravená. Klikni do mapy a leť.');break;
    case 'ship':state.ships.set(o.id,o);break;
    case 'move':{const s=state.ships.get(o.id);if(s&&o.duration>0)moveShip(s,o.x,o.y,o.duration);break;}
    case 'remove':state.ships.delete(o.id);if(state.selected===o.id)state.selected=null;break;
    case 'destroyed':{const s=state.ships.get(o.id);if(s)state.effects.push({kind:'damage',x:s.x,y:s.y,text:'✦',end:performance.now()+1300});state.ships.delete(o.id);if(o.id===state.hero?.id){state.hero.hp=0;$('death').hidden=false;}if(state.selected===o.id)state.selected=null;break;}
    case 'death':clearTimeout(loginTimer);status('Loď zničená',true);$('death').hidden=false;break;
    case 'speed':if(state.hero)state.hero.speed=o.speed;break;
    case 'deselection':state.selected=null;break;
    case 'jumping':notice('Prechod do sektora '+o.map+'…');break;
    case 'box':state.boxes.set(o.id,o);break;
    case 'boxRemove':state.boxes.delete(o.id);break;
    case 'portal':state.portals.set(o.id,o);break;
    case 'selection':{const s=state.ships.get(o.id);if(s){Object.assign(s,o,{type:'ship'});state.selected=o.id;}break;}
    case 'hp':case 'shield':if(state.hero)Object.assign(state.hero,o,{type:'hero'});break;
    case 'hit':{if(o.attacker===state.hero?.id)state.combatHits++;const s=state.ships.get(o.id);if(s){Object.assign(s,{hp:o.hp,shield:o.shield,nano:o.nano});state.effects.push({kind:'damage',x:s.x,y:s.y,text:'−'+number(o.damage),end:performance.now()+1300});}break;}
    case 'laser':state.effects.push({...o,kind:'laser',end:performance.now()+220});break;
    case 'message':{
      const p=o.text.split('|');
      if(p[1]==='LM'&&p[2]==='ST'&&state.hero){const key={URI:'uridium',CRE:'credits',EP:'experience',HON:'honor'}[p[3]];if(key)state.hero[key]=Number(p[5]);}
      if(o.text.includes('|STM|')){const key=o.text.split('|STM|')[1];const translations={msg_equip_ready:'Vybavenie pripravené.',jumpgate_failed_no_gate:'Prileť bližšie k portálu.',jumpgate_failed_pvp_map:'Po boji chvíľu počkaj pred skokom.'};notice(translations[key]||key.replace(/\|/g,' '));}break;
    }
  }
  if(o.type!=='unknown')hud();
}
async function connect(){
  clearTimeout(loginTimer);if(socket){socket.onclose=null;socket.close();}
  chat.close();
  state.hero=null;state.ships.clear();state.portals.clear();status('Pripájam…');notice('Overujem prihlásenie…',30000);
  try{
    const response=await fetch('/native-session',{cache:'no-store'});
    if(response.status===401){location.assign('/');return;}
    if(!response.ok)throw new Error('Prihlásenie nie je dostupné');
    const session=await response.json();
    const url=location.protocol==='https:'?'wss://'+location.host+'/socket/game':'ws://'+location.hostname+':8081/game';
    const ws=new WebSocket(url);socket=ws;ws.binaryType='arraybuffer';
    let chatStarted=false;
    const framer=new Framer(o=>{command(o);if(state.connected&&!chatStarted){chatStarted=true;chat.connect(session);}});
    ws.onopen=()=>ws.send(request.login(session.userId,session.sessionId));
    ws.onmessage=e=>{try{framer.push(e.data);}catch(error){state.errors.push(error.message);notice('Chyba herného protokolu: '+error.message,60000);ws.close();}};
    ws.onerror=()=>notice('Herný server nedostupný. Skontroluj štart servera.',60000);
    ws.onclose=()=>{clearTimeout(loginTimer);chat.close();status('Odpojené');notice('Spojenie ukončené. Klikni Pripojiť znova.',60000);};
    loginTimer=setTimeout(()=>{if(!state.connected){notice('Server nepotvrdil prihlásenie. Prihlás sa znova v hangári.',60000);ws.close();}},15000);
  }catch(error){status('Chyba pripojenia');notice(error.message,60000);}
}
function send(bytes){if(state.connected&&socket?.readyState===WebSocket.OPEN)socket.send(bytes);}
function travel(x,y){
  const h=state.hero;if(!state.connected||!h||h.hp<=0)return;
  x=Math.round(Math.max(0,Math.min(bounds().w,x)));y=Math.round(Math.max(0,Math.min(bounds().h,y)));
  position(h);send(request.move(x,y,Math.round(h.x),Math.round(h.y)));state.movesSent++;
  moveShip(h,x,y,Math.hypot(x-h.x,y-h.y)/Math.max(1,h.speed)*1000);
}
function select(ship){const h=state.hero;state.selected=ship.id;send(request.select(ship.id,Math.round(h.x),Math.round(h.y)));hud();}
const actions={attack:()=>{if(state.selected)send(request.attack());else notice('Najprv vyber cieľ kliknutím na loď.');},stop:()=>send(request.stop()),rocket:()=>send(request.rocket()),jump:()=>send(request.jump()),pet:()=>send(request.pet(0)),petOff:()=>send(request.pet(1)),guard:()=>send(request.pet(3)),repair:()=>send(request.repair()),config1:()=>send(request.configuration(1)),config2:()=>send(request.configuration(2)),fullscreen:()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>notice('Celá obrazovka nie je dostupná.'));}};
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>actions[b.dataset.action]?.());
$('reconnect').onclick=connect;
for(const id of ['ammo','formation'])$(id).onchange=e=>{if(e.target.value)send(request.item(e.target.value));};
addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||e.repeat||e.ctrlKey||e.altKey||e.metaKey)return;const action={'1':'attack','2':'stop','3':'rocket',j:'jump',p:'pet'}[e.key.toLowerCase()];if(action){e.preventDefault();actions[action]();}});
function world(x,y){return{x:(x-width/2)/state.zoom+(state.hero?.x||0),y:(y-height/2)/state.zoom+(state.hero?.y||0)};}
function screen(x,y){return{x:(x-(state.hero?.x||0))*state.zoom+width/2,y:(y-(state.hero?.y||0))*state.zoom+height/2};}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!state.hero)return;const p=world(e.clientX,e.clientY);const ships=[...state.ships.values()].filter(s=>s.id!==state.hero.id);const found=ships.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(found&&Math.hypot(found.x-p.x,found.y-p.y)*state.zoom<32)select(found);else{const box=[...state.boxes.values()].find(b=>Math.hypot(b.x-p.x,b.y-p.y)*state.zoom<20);if(box)send(request.collect(box.id));else travel(p.x,p.y);}});
canvas.addEventListener('dblclick',()=>{if(state.selected)actions.attack();});
canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=Math.max(.15,Math.min(1.5,state.zoom*Math.exp(-e.deltaY*.001)));},{passive:false});
mini.addEventListener('pointerdown',e=>{const r=mini.getBoundingClientRect();travel((e.clientX-r.left)/r.width*bounds().w,(e.clientY-r.top)/r.height*bounds().h);});
function resize(){width=innerWidth;height=innerHeight;const d=Math.min(2,devicePixelRatio||1);canvas.width=width*d;canvas.height=height*d;ctx.setTransform(d,0,0,d,0,0);}
addEventListener('resize',resize);resize();
function drawShip(s,now){
  const p=screen(s.x,s.y),hero=s.id===state.hero?.id;if(p.x< -50||p.x>width+50||p.y< -50||p.y>height+50)return;
  const color=hero?'#8ceaff':s.npc?'#e89065':s.faction===state.hero?.faction?'#79cbb7':'#e78597';
  if(s.id===state.selected){ctx.strokeStyle='#ffba78';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,31,0,Math.PI*2);ctx.stroke();}
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(s.angle||0);const scale=Math.max(.55,Math.min(1.4,state.zoom*1.4));ctx.scale(scale,scale);
  if(s.motion){const glow=ctx.createLinearGradient(-16,0,-42,0);glow.addColorStop(0,'#8be7ff');glow.addColorStop(1,'#3498f000');ctx.fillStyle=glow;ctx.beginPath();ctx.moveTo(-13,-6);ctx.lineTo(-40-Math.sin(now*.05)*5,0);ctx.lineTo(-13,6);ctx.fill();}
  if(!drawSprite(ctx,s,state.zoom/scale)){
  ctx.fillStyle=hero?'#527b98':'#514851';ctx.strokeStyle=color;ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(-19,-17);ctx.lineTo(-10,-4);ctx.lineTo(-18,0);ctx.lineTo(-10,4);ctx.lineTo(-19,17);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=color;ctx.fillRect(0,-2,12,4);}
  ctx.restore();ctx.fillStyle=color;ctx.font='11px Segoe UI';ctx.textAlign='center';ctx.fillText(s.name||'Loď',p.x,p.y+Math.max(38,60*state.zoom));
}
function render(now){
  requestAnimationFrame(render);if(now-renderTime<16)return;renderTime=now;
  for(const s of state.ships.values())position(s,now);
  ctx.fillStyle='#050b16';ctx.fillRect(0,0,width,height);
  const nebula=ctx.createRadialGradient(width*.65,height*.35,10,width*.6,height*.4,width*.7);nebula.addColorStop(0,'#11293b');nebula.addColorStop(.5,'#0c172a');nebula.addColorStop(1,'#050b16');ctx.fillStyle=nebula;ctx.fillRect(0,0,width,height);
  const h=state.hero;
  for(let i=0;i<360;i++){const x=((i*7919-(h?.x||0)*.03)%width+width)%width,y=((i*3557-(h?.y||0)*.03)%height+height)%height;ctx.fillStyle=i%7?'#52728b':'#b6d8e9';ctx.fillRect(x,y,i%7?1:2,1);}
  if(h){
    ctx.strokeStyle='#244052';ctx.lineWidth=1;const edge=screen(0,0);ctx.strokeRect(edge.x,edge.y,bounds().w*state.zoom,bounds().h*state.zoom);
    for(const p of state.portals.values()){if(!p.visible)continue;const pos=screen(p.x,p.y);ctx.strokeStyle=p.working?'#50b6dc':'#777';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(pos.x,pos.y,35,45,now*.0001,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#265b86';ctx.lineWidth=8;ctx.beginPath();ctx.arc(pos.x,pos.y,28,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#94c8dc';ctx.font='10px Segoe UI';ctx.textAlign='center';ctx.fillText('PORTÁL · J',pos.x,pos.y+62);}
    if(h.motion){const p=screen(h.motion.tx,h.motion.ty);ctx.strokeStyle='#71d5eb66';ctx.setLineDash([3,9]);ctx.beginPath();ctx.moveTo(width/2,height/2);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);ctx.strokeRect(p.x-5,p.y-5,10,10);}
    for(const s of state.ships.values())drawShip(s,now);
    for(const b of state.boxes.values()){const p=screen(b.x,b.y);ctx.fillStyle='#e6c275';ctx.strokeStyle='#ffe5a0';ctx.fillRect(p.x-4,p.y-4,8,8);ctx.strokeRect(p.x-7,p.y-7,14,14);}
    state.effects=state.effects.filter(e=>e.end>now);
    for(const e of state.effects){if(e.kind==='damage'){const p=screen(e.x,e.y);ctx.font='bold 15px Segoe UI';ctx.fillStyle='#ffc18a';ctx.fillText(e.text,p.x,p.y-25-(1300-e.end+now)*.03);}else{const a=state.ships.get(e.attacker),b=state.ships.get(e.target);if(a&&b){const p=screen(a.x,a.y),q=screen(b.x,b.y);ctx.strokeStyle='#90ecff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}}}
    $('coords').textContent=Math.round(h.x)+' : '+Math.round(h.y);
    mc.fillStyle='#050e1a';mc.fillRect(0,0,240,150);mc.strokeStyle='#16324a';mc.strokeRect(0,0,240,150);
    for(const p of state.portals.values()){mc.strokeStyle='#56b7e3';mc.strokeRect(p.x/bounds().w*240-3,p.y/bounds().h*150-3,6,6);}
    for(const s of state.ships.values()){mc.fillStyle=s.id===h.id?'#fff':s.npc?'#e58c61':'#61b8c8';mc.fillRect(s.x/bounds().w*240-1,s.y/bounds().h*150-1,3,3);}
    mc.strokeStyle='#b4d9ea55';mc.strokeRect((h.x-width/2/state.zoom)/bounds().w*240,(h.y-height/2/state.zoom)/bounds().h*150,width/state.zoom/bounds().w*240,height/state.zoom/bounds().h*150);
  }
  if(noticeUntil<now)$('notice').textContent='';
}
requestAnimationFrame(render);connect();
