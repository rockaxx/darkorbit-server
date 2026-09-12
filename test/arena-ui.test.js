const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('1v1 overlay supports nickname invite, polling, accept, decline and leaderboard', () => {
  const script = fs.readFileSync(path.join(root, 'web/cms/js/arena-ui.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'web/cms/css/arena-ui.css'), 'utf8');
  const installer = fs.readFileSync(path.join(root, 'scripts/apply-web-ui.ps1'), 'utf8');
  assert.doesNotThrow(() => new Function(script), 'arena overlay JavaScript must parse');
  assert.match(script, /arena-api\.php/);
  assert.match(script, /setInterval\([^,]+,\s*1000\)/s);
  for (const action of ['invite', 'poll', 'accept', 'decline', 'leaderboard']) assert.match(script, new RegExp(`['\"]${action}['\"]`));
  assert.match(script, /textContent\s*=/, 'remote nickname must be rendered safely');
  assert.match(css, /z-index\s*:\s*2147483647/);
  assert.match(installer, /arena-ui\.css/);
  assert.match(installer, /arena-ui\.js/);
  const tabs = fs.readFileSync(path.join(root, 'scripts/client-tabs.js'), 'utf8');
  const publicClient = fs.readFileSync(path.join(root, 'scripts/public-client.js'), 'utf8');
  assert.match(tabs, /arenaOpen/);
  assert.match(tabs, /pollArena/);
  assert.match(publicClient, /ipcMain\.handle\(['"]arena-api/);
  assert.match(publicClient, /chromeHeight\s*=\s*open\s*\?\s*250\s*:\s*48/);
  assert.match(tabs, /leaderboard/);
});
