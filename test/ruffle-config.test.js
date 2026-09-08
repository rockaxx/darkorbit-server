const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadConfig(location) {
  const source = fs.readFileSync(path.join(__dirname, '../web/ruffle-config.js'), 'utf8');
  const window = { location };
  vm.runInNewContext(source, { window, URL });
  return JSON.parse(JSON.stringify(window.darkOrbitRuffleConfig(location)));
}

test('HTTP page maps Flash TCP ports to local WebSocket gateway', () => {
  const config = loadConfig({ protocol: 'http:', hostname: '127.0.0.1', host: '127.0.0.1' });

  assert.deepEqual(config.socketProxy, [
    { host: '127.0.0.1', port: 8080, proxyUrl: 'ws://127.0.0.1:8081/game' },
    { host: '127.0.0.1', port: 9338, proxyUrl: 'ws://127.0.0.1:8081/chat' },
  ]);
});

test('HTTPS page uses same-origin secure WebSocket routes', () => {
  const config = loadConfig({ protocol: 'https:', hostname: 'play.example.test', host: 'play.example.test' });

  assert.deepEqual(config.socketProxy, [
    { host: 'play.example.test', port: 8080, proxyUrl: 'wss://play.example.test/socket/game' },
    { host: 'play.example.test', port: 9338, proxyUrl: 'wss://play.example.test/socket/chat' },
  ]);
});

test('bootstrap config self-hosts Ruffle and enables Flash networking', () => {
  const config = loadConfig({ protocol: 'http:', hostname: 'localhost', host: 'localhost' });

  assert.equal(config.publicPath, '/browser/ruffle/');
  assert.equal(config.allowNetworking, 'all');
  assert.equal(config.playerRuntime, 'flashPlayer');
});
