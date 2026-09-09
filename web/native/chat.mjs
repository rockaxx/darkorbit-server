export class Chat {
  constructor(){this.socket=null;this.pending='';this.decoder=new TextDecoder();this.ready=false;
    document.getElementById('chatForm').addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('chatInput');const text=input.value.trim();if(!text||!this.ready)return;if(/[%@#\x00-\x1f]/.test(text)){this.line('Znaky %, @ a # nie sú podporované chatom.');return;}this.socket.send(new TextEncoder().encode('a%1@'+text+'#'));input.value='';});
  }
  line(text){const box=document.getElementById('chatLines'),line=document.createElement('div');line.textContent=text;box.append(line);while(box.children.length>60)box.firstChild.remove();box.scrollTop=box.scrollHeight;}
  close(){if(this.socket){this.socket.onclose=null;this.socket.close();}this.ready=false;document.getElementById('chatInput').disabled=true;}
  connect(session){this.close();this.pending='';this.decoder=new TextDecoder();
    const url=location.protocol==='https:'?'wss://'+location.host+'/socket/chat':'ws://'+location.hostname+':8081/chat';
    const ws=new WebSocket(url);this.socket=ws;ws.binaryType='arraybuffer';
    ws.onopen=()=>ws.send(new TextEncoder().encode('#bu%0@0@'+session.userId+'@'+session.sessionId+'#'));
    ws.onmessage=e=>{this.pending+=this.decoder.decode(e.data,{stream:true});let end;while((end=this.pending.indexOf('#'))>=0){const message=this.pending.slice(0,end);this.pending=this.pending.slice(end+1);const divider=message.indexOf('%'),type=message.slice(0,divider),body=message.slice(divider+1);
      if(type==='bv'){this.ready=true;document.getElementById('chatInput').disabled=false;document.getElementById('chatStatus').textContent='●';}
      else if(type==='a'||type==='j'){const p=body.split('@');this.line(p[1]+': '+p[2]);}
      else if(type==='dq')this.line(body);
      else if(['at','as','au'].includes(type))this.line('Chat pozastavený serverom.');
    }if(this.pending.length>65536)ws.close();};
    ws.onclose=()=>{this.ready=false;document.getElementById('chatInput').disabled=true;document.getElementById('chatStatus').textContent='offline';};
    ws.onerror=()=>this.line('Chat momentálne nedostupný.');
  }
}
