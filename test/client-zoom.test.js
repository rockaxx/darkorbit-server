const test = require('node:test');
const assert = require('node:assert/strict');
const { nextZoomFactor } = require('../scripts/client-zoom');

test('Ctrl+mouse wheel changes 2D zoom in bounded steps', () => {
  assert.equal(nextZoomFactor(1, 120, true, true), 1.1);
  assert.equal(nextZoomFactor(1, -120, true, true), 0.9);
  assert.equal(nextZoomFactor(1, 120, false, true), 1);
  assert.equal(nextZoomFactor(1, 120, true, false), 1);
  assert.equal(nextZoomFactor(2, 120, true, true), 2);
  assert.equal(nextZoomFactor(0.5, -120, true, true), 0.5);
});

test('desktop client wires Ctrl+wheel to the game BrowserView', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(require('node:path').join(__dirname, '../scripts/public-client.js'), 'utf8');
  const localSource = fs.readFileSync(require('node:path').join(__dirname, '../scripts/client.js'), 'utf8');
  assert.match(source, /before-input-event/);
  assert.match(source, /setZoomFactor/);
  assert.match(source, /nextZoomFactor/);
  assert.match(localSource, /before-input-event/);
  assert.match(localSource, /setZoomFactor/);
  assert.match(localSource, /nextZoomFactor/);
});
