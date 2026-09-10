const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveGamePort, resolveWebSocketPort } = require('../scripts/ws-proxy-config');

test('WebSocket gateway targets configured internal game port', () => {
  assert.equal(resolveGamePort({}), 8080);
  assert.equal(resolveGamePort({ DO_GAME_PORT: '18080' }), 18080);
  assert.throws(() => resolveGamePort({ DO_GAME_PORT: 'bad' }), /DO_GAME_PORT/);
});

test('WebSocket gateway listens on configured public port', () => {
  assert.equal(resolveWebSocketPort({}), 8081);
  assert.equal(resolveWebSocketPort({ DO_WS_PORT: '19081' }), 19081);
  assert.throws(() => resolveWebSocketPort({ DO_WS_PORT: '0' }), /DO_WS_PORT/);
});
