const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const puppeteer=require('puppeteer-core');
const root=path.join(__dirname,'..'),origin=process.env.DO_WEB_ORIGIN||'http://127.0.0.1';
const credentials=JSON.parse(fs.readFileSync(path.join(root,'.local/credentials.json'),'utf8').replace(/^\uFEFF/,''));
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
 try {
  const page=await browser.newPage();await page.setViewport({width:1440,height:900});const errors=[],requests=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});page.on('request',r=>requests.push(r.url()));
  assert.equal((await fetch(origin+'/native-session')).status,401,'session must require login');
  await page.goto(origin+'/');
  assert.equal(await page.evaluate(async v=>(await (await fetch('/api',{method:'POST',body:new URLSearchParams({action:'login',username:v.username,password:v.password})})).json()).status,credentials),true);
  await page.goto(origin+'/map-revolution');
  await page.waitForFunction(()=>window.orbitDebug?.connected,{timeout:20000});
  const before=await page.evaluate(()=>orbitDebug);assert.ok(before.hero.hp>0);assert.ok(before.hero.speed>0);
  console.log('INITIAL',JSON.stringify({map:before.hero.map,x:before.hero.x,y:before.hero.y,hp:before.hero.hp,speed:before.hero.speed,ships:before.ships,portals:before.portals}));
  const direction=before.hero.x>18000?-1:1;
  const mapWidth=[16,29].includes(before.hero.map)?41800:20800,mapHeight=[16,29].includes(before.hero.map)?26000:12800;
  const miniBox=await (await page.$('#minimap')).boundingBox();
  await page.mouse.click(miniBox.x+(before.hero.x+direction*200)/mapWidth*miniBox.width,miniBox.y+(before.hero.y+80)/mapHeight*miniBox.height);
  await page.waitForFunction(()=>orbitDebug.movesSent>0,{timeout:5000}).catch(async e=>{console.log('MOVE DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({debug:orbitDebug,notice:document.getElementById('notice').textContent}))));throw e;});
  await page.waitForFunction(()=>!orbitDebug.hero.motion,{timeout:10000});
  const moved=await page.evaluate(()=>orbitDebug.hero);
  assert.ok(Math.hypot(moved.x-before.hero.x,moved.y-before.hero.y)>100,'click causes travel');
  await page.screenshot({path:path.join(root,'.local/logs/native-client.png')});
  await page.reload();await page.waitForFunction(()=>orbitDebug?.connected,{timeout:20000});
  const confirmed=await page.evaluate(()=>orbitDebug);
  await page.waitForFunction(()=>orbitDebug.chatConnected,{timeout:10000});
  assert.ok(Math.hypot(confirmed.hero.x-moved.x,confirmed.hero.y-moved.y)<30,'server confirms position after reconnect');
  assert.deepEqual(errors,[]);assert.deepEqual(confirmed.errors,[]);
  assert.ok(!requests.some(u=>/\.swf(?:\?|$)|ruffle|\.wasm(?:\?|$)/i.test(u)),'no SWF/Ruffle dependency');
  if(process.argv.includes('--gameplay')){
    await page.click('[data-action="petOff"]');
    await page.click('[data-action="pet"]');
    await page.waitForFunction(()=>orbitDebug.entities.some(s=>s.pet),{timeout:10000});
    console.log('PASS: PET appeared from server.');
    await page.click('[data-action="guard"]');
    const gate=confirmed.gates.filter(g=>g.working).sort((a,b)=>Math.hypot(a.x-confirmed.hero.x,a.y-confirmed.hero.y)-Math.hypot(b.x-confirmed.hero.x,b.y-confirmed.hero.y))[0];
    assert.ok(gate,'working portal exists');
    const box=await (await page.$('#minimap')).boundingBox();
    await page.mouse.click(box.x+gate.x/mapWidth*box.width,box.y+gate.y/mapHeight*box.height);
    console.log('Flying to portal',JSON.stringify({x:gate.x,y:gate.y}));
    await page.waitForFunction(()=>!orbitDebug.hero.motion,{timeout:90000});
    await new Promise(r=>setTimeout(r,1200));
    await page.screenshot({path:path.join(root,'.local/logs/native-portal.png')});
    const npcHandle=await page.waitForFunction(()=>{
      const h=orbitDebug.hero;return orbitDebug.entities.filter(s=>s.npc).map(s=>({id:s.id,x:720+(s.x-h.x)*.55,y:450+(s.y-h.y)*.55,d:Math.hypot(s.x-h.x,s.y-h.y)})).find(s=>s.d<650&&s.x>320&&s.x<1100&&s.y>130&&s.y<600);
    },{timeout:20000});
    const npc=await npcHandle.jsonValue();await page.mouse.click(npc.x,npc.y);
    await page.waitForFunction(()=>!document.getElementById('target').hidden,{timeout:5000});
    await page.click('[data-action="attack"]');
    await page.waitForFunction(()=>orbitDebug.combatHits>0,{timeout:15000});
    console.log('PASS: targeted NPC; server confirmed player attack damage.');
    await page.screenshot({path:path.join(root,'.local/logs/native-combat.png')});
    await page.click('[data-action="stop"]');
    await page.click('[data-action="jump"]');
    await page.waitForFunction(map=>orbitDebug.hero.map!==map,{timeout:15000},confirmed.hero.map);
    assert.deepEqual(await page.evaluate(()=>orbitDebug.errors),[]);
    console.log('PASS: server portal jump reinitialized destination map.');
  }
  console.log('PASS: real Chrome CMS login, native canvas, game initialization, movement confirmed by server on reconnect, zero Flash/Ruffle requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
