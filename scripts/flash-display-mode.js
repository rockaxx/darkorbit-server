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

function findLatestSol(root) {
  let latest = null;
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.name.toLowerCase() === 'darkorbit.sol') {
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

module.exports = { readForce2D, findLatestSol, resolveGameCloseAction };
