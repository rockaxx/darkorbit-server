const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { readForce2D, resolveGameCloseAction, createDisplayModeController, saveDisplayMode } = require('../scripts/flash-display-mode');

test('reads force2D from original Flash shared object', () => {
  assert.equal(readForce2D(Buffer.concat([Buffer.from('prefixforce2D'), Buffer.from([3])])), true);
  assert.equal(readForce2D(Buffer.concat([Buffer.from('prefixforce2D'), Buffer.from([2])])), false);
  assert.equal(readForce2D(Buffer.from('no display choice')), null);
});

test('renderer change reloads only game tab; normal logout closes only game tab', () => {
  assert.equal(resolveGameCloseAction(true, false), 'reload-game');
  assert.equal(resolveGameCloseAction(false, true), 'reload-game');
  assert.equal(resolveGameCloseAction(true, true), 'close-game-tab');
  assert.equal(resolveGameCloseAction(null, true), 'close-game-tab');
});

test('saves both renderer changes before logout or refresh, ignoring an old SOL on initial login', async () => {
  let flashMode = false;
  const saved = [];
  const controller = createDisplayModeController({
    readMode: () => flashMode,
    saveMode: async mode => saved.push(mode)
  });
  controller.pageLoaded(true);
  await controller.synchronize();
  assert.deepEqual(saved, [], 'stale Flash preferences must not override the account at login');
  // Flash initializes its SOL from the loaded page, then user selects 3D.
  flashMode = true;
  await controller.synchronize();
  flashMode = false;
  await controller.synchronize();
  assert.deepEqual(saved, [false]);
  assert.equal(controller.closeAction(), 'reload-game');
  controller.pageLoaded(false);
  assert.equal(controller.closeAction(), 'close-game-tab');
  flashMode = true;
  await controller.synchronize();
  assert.deepEqual(saved, [false, true]);
  assert.equal(controller.closeAction(), 'reload-game');
});

test('refresh waits for in-flight save and failed saves remain retryable', async () => {
  let flashMode = true, release;
  const saved = [];
  const controller = createDisplayModeController({
    readMode: () => flashMode,
    saveMode: mode => new Promise(resolve => { release = () => { saved.push(mode); resolve(); }; })
  });
  controller.pageLoaded(true);
  flashMode = false;
  const first = controller.synchronize();
  const refresh = controller.synchronize();
  await Promise.resolve();
  assert.deepEqual(saved, []);
  release();
  await Promise.all([first, refresh]);
  assert.deepEqual(saved, [false], 'concurrent poll/refresh must save once and await completion');

  let attempts = 0;
  const retry = createDisplayModeController({
    readMode: () => flashMode,
    saveMode: async () => { if (++attempts === 1) throw new Error('offline'); }
  });
  retry.pageLoaded(false);
  flashMode = true;
  await assert.rejects(retry.synchronize(), /offline/);
  await retry.synchronize();
  assert.equal(attempts, 2);
  assert.equal(retry.closeAction(), 'reload-game');
});

test('main-process mode save sends session cookie and correct 2D/3D API values', async () => {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      requests.push({ path: req.url, cookie: req.headers.cookie, body });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: req.headers.cookie === 'PHPSESSID=fixture' }));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const cookies = { get: async ({ url }) => {
    assert.equal(url, origin + '/api/');
    return [{ name: 'PHPSESSID', value: 'fixture' }];
  } };
  try {
    await saveDisplayMode(origin, cookies, false);
    await saveDisplayMode(origin, cookies, true);
    assert.deepEqual(requests.slice(0, 2), [
      { path: '/api/', cookie: 'PHPSESSID=fixture', body: 'action=change_version&version=true' },
      { path: '/api/', cookie: 'PHPSESSID=fixture', body: 'action=change_version&version=false' }
    ]);
    await assert.rejects(saveDisplayMode(origin, { get: async () => [] }, false), /could not be saved/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('public client intercepts Flash close without quitting app', () => {
  const source = fs.readFileSync(path.join(__dirname, '../scripts/public-client.js'), 'utf8');
  assert.match(source, /webContents\.on\('close'/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /reloadIgnoringCache|reload-game/);
  assert.match(source, /delete views\.game/);
});
