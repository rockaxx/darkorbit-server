const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const zlib = require('node:zlib');
const { WebSocketServer } = require('ws');
const { startTransport } = require('../scripts/client-transport');

test('Flash transport preserves POSTs and SWFs, decodes XML and tunnels TCP', async () => {
  const binary = Buffer.from([0x43,0x57,0x53,0,255,128,32,17]);
  const upstream = http.createServer((req,res) => {
    if (req.url === '/binary.swf') { res.writeHead(200, {'content-type':'application/x-shockwave-flash'}); res.end(binary); }
    else if (req.url === '/assets.xml') { res.writeHead(200, {'content-type':'application/xml','content-encoding':'gzip'}); res.end(zlib.gzipSync('<host>127.0.0.1</host>')); }
    else if (req.url === '/api' && req.method === 'POST') { const chunks=[]; req.on('data',c=>chunks.push(c)); req.on('end',()=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({body:Buffer.concat(chunks).toString(),cookie:req.headers.cookie}));}); }
    else { res.writeHead(404); res.end(); }
  });
  const wss = new WebSocketServer({server:upstream});
  wss.on('connection',ws=>ws.on('message',bytes=>ws.send(bytes)));
  await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));
  let transport;
  try {
    transport = await startTransport(`http://127.0.0.1:${upstream.address().port}`);
    const xml = await fetch(transport.origin+'//assets.xml');
    assert.equal(xml.status,200); assert.equal(xml.headers.get('content-encoding'),null);
    assert.equal(await xml.text(),'<host>127.0.0.2</host>');
    assert.deepEqual(Buffer.from(await (await fetch(transport.origin+'/binary.swf')).arrayBuffer()),binary);
    const reply=await (await fetch(transport.origin+'/api',{method:'POST',headers:{cookie:'PHPSESSID=test'},body:'action=load&data=%2B'})).json();
    assert.deepEqual(reply,{body:'action=load&data=%2B',cookie:'PHPSESSID=test'});
    for (const port of [8080,9338]) await new Promise((resolve,reject)=>{
      const tcp=net.connect(port,'127.0.0.2',()=>tcp.write(binary));
      tcp.setTimeout(5000,()=>{tcp.destroy();reject(new Error('TCP timeout'));});
      tcp.once('data',data=>{tcp.destroy();try{assert.deepEqual(data,binary);resolve();}catch(e){reject(e);}});tcp.on('error',reject);
    });
  } finally { if(transport)transport.close(); for(const ws of wss.clients)ws.terminate(); wss.close(); await new Promise(resolve=>upstream.close(resolve)); }
});
