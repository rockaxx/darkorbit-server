const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readForce2D, resolveGameCloseAction } = require('../scripts/flash-display-mode');

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

test('public client intercepts Flash close without quitting app', () => {
  const source = fs.readFileSync(path.join(__dirname, '../scripts/public-client.js'), 'utf8');
  assert.match(source, /webContents\.on\('close'/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /reloadIgnoringCache|reload-game/);
  assert.match(source, /delete views\.game/);
});
