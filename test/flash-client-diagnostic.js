// Inspect an explicitly enabled local Electron debug port; no account/session access.
const fs = require('fs');
const WebSocket = require('ws');
(async () => {
  let targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
  if (process.env.DO_FLASH_TAB) {
    const shell = targets.find(t => t.url.endsWith('client-tabs.html'));
    const tabs = new WebSocket(shell.webSocketDebuggerUrl);
    await new Promise(resolve => tabs.once('open', resolve));
    const expression = process.env.DO_FLASH_TAB === 'hangar' ? 'window.clientTabs.hangar()' : 'window.clientTabs.select("game")';
    tabs.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression}}));
    await new Promise(resolve => tabs.once('message', resolve)); tabs.close();
    await new Promise(resolve => setTimeout(resolve, 2000));
    targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
  }
  const wanted = process.env.DO_FLASH_TAB === 'hangar' ? '/equipment' : '/map-revolution';
  const target = targets.find(t => t.url.endsWith(wanted)) || targets.find(t => t.type === 'page' && !t.url.startsWith('file:')) || targets[0];
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.once('open', resolve));
  let id = 0; const pending = new Map(); const requests = new Map();
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params }));
  });
  ws.on('message', data => {
    const m = JSON.parse(data);
    if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); return; }
    if (m.method === 'Network.requestWillBeSent') requests.set(m.params.requestId, m.params.request.url.split('?')[0]);
    if (m.method === 'Network.loadingFailed') console.log('FAILED', requests.get(m.params.requestId), m.params.errorText, m.params.blockedReason || '');
    if (m.method === 'Network.responseReceived' && /swf|xml|flashAPI/.test(m.params.response.url)) console.log('HTTP', m.params.response.status, m.params.response.url.split('?')[0]);
    if (m.method === 'Runtime.exceptionThrown') console.log('JS ERROR', m.params.exceptionDetails.text);
  });
  await send('Network.enable'); await send('Runtime.enable');
  if (process.env.DO_FLASH_TEST_CLEANUP === '1') { await send('Network.clearBrowserCookies'); ws.close(); return; }
  if (process.env.DO_FLASH_TEST_LOGIN === '1') {
    const file = '.local/flash-test-account.json';
    const credentials = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {username:'flashcheck_'+Date.now().toString(36),password:require('crypto').randomBytes(16).toString('hex')};
    fs.writeFileSync(file, JSON.stringify(credentials));
    const expression = `(async()=>{ const c=${JSON.stringify(credentials)}; const post=async(data)=>(await(await fetch('/api/',{method:'POST',body:new URLSearchParams(data)})).json()); await post({action:'register',...c,password_confirm:c.password,email:c.username+'@example.invalid'}); return (await post({action:'login',...c})).status; })()`;
    console.log('TEST LOGIN', (await send('Runtime.evaluate', {expression,awaitPromise:true,returnByValue:true})).result.value);
  }
  if (process.argv[2]) await send('Page.navigate', { url: process.argv[2] }); else if (!process.env.DO_FLASH_TAB) await send('Page.reload', { ignoreCache: true });
  await new Promise(resolve => setTimeout(resolve, 14000));
  console.log('PAGE', (await send('Runtime.evaluate', { expression: 'JSON.stringify({url:location.pathname,title:document.title,text:document.body.innerText.slice(0,160),flash:!!document.querySelector("object,embed")})', returnByValue: true })).result.value);
  const shot = await send('Page.captureScreenshot'); fs.writeFileSync('.local/logs/flash-diagnostic.png', Buffer.from(shot.data, 'base64'));
  ws.close();
})().catch(error => { console.error(error); process.exit(1); });
