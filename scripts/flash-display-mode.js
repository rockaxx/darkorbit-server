const fs = require('fs');
const path = require('path');

function readForce2D(buffer) {
  const key = Buffer.from('force2D');
  const offset = buffer.indexOf(key);
  if (offset < 0 || offset + key.length >= buffer.length) return null;
  const marker = buffer[offset + key.length];
  if (marker === 3) return true;
  if (marker === 2) return false;
  return null;
}

function findLatestSol(root, hostname) {
  let latest = null;
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.name.toLowerCase() === 'darkorbit.sol' &&
          (!hostname || path.relative(root, fullPath).split(path.sep)[1] === hostname)) {
        const modified = fs.statSync(fullPath).mtimeMs;
        if (!latest || modified > latest.modified) latest = { path: fullPath, modified };
      }
    }
  }
  visit(root);
  return latest ? latest.path : null;
}

function resolveGameCloseAction(force2D, pageForce2D) {
  return force2D !== null && pageForce2D !== null && force2D !== pageForce2D
    ? 'reload-game'
    : 'close-game-tab';
}

function readProfileForce2D(profile, origin) {
  const root = path.join(profile, 'Pepper Data', 'Shockwave Flash', 'WritableRoot', '#SharedObjects');
  const file = findLatestSol(root, new URL(origin).hostname);
  return file ? readForce2D(fs.readFileSync(file)) : null;
}

function createDisplayModeController({ readMode, saveMode }) {
  let observed = readMode();
  let pageMode = null, desired = null, saved = null, pending = null;
  async function synchronize() {
    if (pending) return pending.then(synchronize);
    const mode = readMode();
    if (mode !== null && mode !== observed) {
      observed = mode;
      if (pageMode !== null) desired = mode;
    }
    if (desired === null || desired === saved) return Promise.resolve();
    const choice = desired;
    pending = Promise.resolve().then(() => saveMode(choice)).then(() => {
      saved = choice;
    }).finally(() => { pending = null; });
    return pending;
  }
  return {
    pageLoaded(mode) { pageMode = mode; saved = mode; desired = null; },
    synchronize,
    closeAction() { return resolveGameCloseAction(saved, pageMode); }
  };
}

// Save outside the renderer so refresh/navigation cannot cancel the request.
async function saveDisplayMode(origin, cookies, force2D) {
  const url = new URL('/api/', origin);
  const jar = await cookies.get({ url: url.href });
  const body = new URLSearchParams({ action: 'change_version', version: force2D ? 'false' : 'true' }).toString();
  return new Promise((resolve, reject) => {
    const request = require(url.protocol === 'https:' ? 'https' : 'http').request(url, {
      method: 'POST', headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        Cookie: jar.map(cookie => `${cookie.name}=${cookie.value}`).join('; ')
      }
    }, response => {
      let result = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { result += chunk; });
      response.on('error', reject);
      response.on('end', () => {
        try {
          if (response.statusCode !== 200) throw new Error(`Display mode save failed (HTTP ${response.statusCode}).`);
          const parsed = JSON.parse(result);
          if (!parsed.status) throw new Error(parsed.message || 'Display mode could not be saved.');
          resolve();
        } catch (error) { reject(error); }
      });
    });
    request.setTimeout(5000, () => request.destroy(new Error('Display mode save timed out.')));
    request.on('error', reject);
    request.end(body);
  });
}

module.exports = { readForce2D, findLatestSol, resolveGameCloseAction, readProfileForce2D, createDisplayModeController, saveDisplayMode };
