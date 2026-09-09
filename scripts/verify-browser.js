const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const origin = process.env.DO_WEB_ORIGIN || 'http://127.0.0.1';
const credentials = JSON.parse(
  fs.readFileSync(path.join(root, '.local/credentials.json'), 'utf8').replace(/^\uFEFF/, '')
);

async function login() {
  const response = await fetch(origin + '/api', {
    method: 'POST',
    body: new URLSearchParams({
      action: 'login',
      username: credentials.username,
      password: credentials.password,
    }),
  });
  assert.equal(response.status, 200, 'login HTTP status');
  assert.equal((await response.json()).status, true, 'CMS login');
  return response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
}

(async () => {
  const config = await fetch(origin + '/browser/native/protocol.mjs');
  assert.equal(config.status, 200, 'browser config route');
  assert.match(config.headers.get('content-type') || '', /^text\/javascript/);
  assert.match(await config.text(), /class Framer/);

  const runtime = await fetch(origin + '/browser/native/client.mjs');
  assert.equal(runtime.status, 200, 'Ruffle runtime route');
  assert.match(runtime.headers.get('content-type') || '', /^text\/javascript/);
  assert.ok((await runtime.arrayBuffer()).byteLength > 1000, 'native runtime body');

  const cookie = await login();
  const map = await fetch(origin + '/map-revolution', { headers: { cookie } });
  assert.equal(map.status, 200, 'map route');
  const html = await map.text();
  assert.match(html, /browser\/native\/client.mjs/);
  assert.doesNotMatch(html, /ruffle|\.swf|flashembed/);
  const session = await fetch(origin + '/native-session', { headers: { cookie } });
  assert.match(session.headers.get('cache-control'), /no-store/);
  assert.ok((await session.json()).userId > 0);
  assert.equal((await fetch(origin + '/native-session')).status, 401);

  console.log('PASS: native browser routes, authenticated session, no Flash embed.');
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
