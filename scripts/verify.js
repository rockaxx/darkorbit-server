// Run with the game window closed: a successful login rotates its session.
const fs = require('fs');
const path = require('path');
const net = require('net');
const assert = require('assert').strict;
const credentials = JSON.parse(fs.readFileSync(path.join(__dirname, '../.local/credentials.json'), 'utf8').replace(/^\uFEFF/, ''));
const origin = 'http://127.0.0.1';
const gamePort = Number(process.env.DO_GAME_PORT || 18080);
async function post(body) {
  return fetch(origin + '/api', { method:'POST', body:new URLSearchParams(body) });
}
function loginPacket(id, session) {
  const sid = Buffer.from(session);
  const version = Buffer.from('10.0');
  const buffer = Buffer.alloc(2+2+4+4+2+2+sid.length+2+version.length);
  buffer.writeUInt16BE(buffer.length-2, 0);
  buffer.writeUInt16BE(10996, 2);
  buffer.writeUInt32BE(0x33000002, 4); // 563 rotated right by eight.
  buffer.writeUInt32BE(((id >>> 8) | (id << 24)) >>> 0, 8);
  buffer.writeUInt16BE(1, 12);
  buffer.writeUInt16BE(sid.length, 14);
  sid.copy(buffer, 16);
  buffer.writeUInt16BE(version.length, 16+sid.length);
  version.copy(buffer, 18+sid.length);
  return buffer;
}
function gameLogin(packet, expectShip) {
  return new Promise((resolve, reject) => {
    let received = Buffer.alloc(0);
    const initialized = new Set();
    const socket = net.connect(gamePort, '127.0.0.1', () => socket.write(packet));
    const timer = setTimeout(() => {
      socket.destroy();
      if (expectShip) reject(new Error('Game did not initialize ship and PET; received: '+[...initialized].join(',')));
      else resolve();
    }, expectShip ? 10000 : 600);
    socket.on('error', error => { clearTimeout(timer); reject(error); });
    socket.on('data', chunk => {
      if (!expectShip) { clearTimeout(timer); socket.destroy(); reject(new Error('Invalid session was accepted')); return; }
      received = Buffer.concat([received, chunk]);
      while (received.length >= 4) {
        const size = received.readUInt16BE(0) + 2;
        if (received.length < size) break;
        const commandId = received.readUInt16BE(2);
        if (commandId === 7511 || commandId === 9174) initialized.add(commandId);
        if (initialized.has(7511) && initialized.has(9174)) {
          clearTimeout(timer); socket.destroy(); resolve(); return;
        }
        received = received.subarray(size);
      }
    });
  });
}
(async () => {
  for (const route of ['/.git/config', '/server.sql', '/files/config.php']) {
    assert.equal((await fetch(origin+route)).status, 404, route+' must be private');
  }
  const denied = await (await post({action:'login', username:credentials.username, password:'invalid-test-password'})).json();
  assert.equal(denied.status, false);
  const response = await post({action:'login', username:credentials.username, password:credentials.password});
  assert.equal((await response.json()).status, true);
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const page = await (await fetch(origin+'/map-revolution', {headers:{cookie}})).text();
  const original3d = /"display2d":\s*"1"/.test(page);
  const setMode = async enabled => {
    const result = await (await fetch(origin+'/api', {method:'POST', headers:{cookie}, body:new URLSearchParams({action:'change_version',version:String(enabled)})})).json();
    assert.equal(result.status, true);
    return (await (await fetch(origin+'/map-revolution', {headers:{cookie}})).text());
  };
  assert.match(await setMode(false), /"display2d":\s*"2"/);
  assert.match(await setMode(true), /"display2d":\s*"1"/);
  await setMode(original3d);
  const id = Number(page.match(/"userID":\s*"(\d+)"/)[1]);
  const session = page.match(/"sessionID":\s*"([^"]+)"/)[1];
  await gameLogin(loginPacket(id, 'invalid-session'), false);
  await gameLogin(loginPacket(id, session), true);
  const swf = await fetch(origin+'/spacemap/main.swf');
  assert.equal(swf.status, 200);
  assert.ok((await swf.arrayBuffer()).byteLength > 3000000);
  console.log('PASS: private paths, rejected password/session, 2D/3D persistence, ship and PET initialization, SWF assets.');
})().catch(error => { console.error(error); process.exitCode=1; });
