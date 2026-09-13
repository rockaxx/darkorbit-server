const test = require('node:test');
const assert = require('node:assert/strict');
const { nextZoomFactor, createWheelZoomHandler } = require('../scripts/client-zoom');

test('Ctrl+mouse wheel changes 2D zoom in bounded steps', () => {
  assert.equal(nextZoomFactor(1, -120, true, true), 1.1);
  assert.equal(nextZoomFactor(1, 120, true, true), 0.9);
  assert.equal(nextZoomFactor(1, 120, false, true), 1);
  assert.equal(nextZoomFactor(1, 120, true, false), 1);
  assert.equal(nextZoomFactor(2, -120, true, true), 2);
  assert.equal(nextZoomFactor(0.5, 120, true, true), 0.5);
});

test('renderer wheel handler forwards Ctrl+wheel and prevents Flash from consuming it', () => {
  const forwarded = [];
  const handler = createWheelZoomHandler(deltaY => forwarded.push(deltaY));
  let prevented = false;
  handler({ ctrlKey: true, deltaY: -120, preventDefault: () => { prevented = true; } });
  assert.deepEqual(forwarded, [-120]);
  assert.equal(prevented, true);
});

test('renderer wheel handler ignores wheel without Ctrl', () => {
  const forwarded = [];
  const handler = createWheelZoomHandler(deltaY => forwarded.push(deltaY));
  handler({ ctrlKey: false, deltaY: -120, preventDefault: () => { throw new Error('must not prevent normal wheel'); } });
  assert.deepEqual(forwarded, []);
});
