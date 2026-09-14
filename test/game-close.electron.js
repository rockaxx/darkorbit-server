// Run with .local/electron/electron.exe, not Node. No live account or game server.
const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'do-close-test-')));
app.whenReady().then(async () => {
  const server = http.createServer((_req, res) => res.end('<html><body>Game lifecycle fixture</body></html>'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  const view = new BrowserView({ webPreferences: {
    preload: path.resolve(__dirname, '../scripts/game-zoom-preload.js'),
    contextIsolation: true, nodeIntegration: false
  } });
  window.setBrowserView(view);
  view.webContents.on('preload-error', (_event, _path, error) => console.error('Preload:', error.message));
  let nativeCloses = 0, gameCloses = 0;
  window.on('close', event => { nativeCloses++; event.preventDefault(); });
  ipcMain.on('game-close-request', event => { if (event.sender === view.webContents) gameCloses++; });
  try {
    await view.webContents.loadURL(`http://127.0.0.1:${server.address().port}/map-revolution`);
    await view.webContents.executeJavaScript('window.close()');
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.strictEqual(nativeCloses, 0, 'Flash close must not reach the application window');
    assert.strictEqual(gameCloses, 1, 'Flash close must reach the game-only lifecycle handler');
    assert.strictEqual(window.isDestroyed(), false);
    window.close();
    assert.strictEqual(nativeCloses, 1, 'explicit application close must retain native behavior');
    console.log('PASS: real Electron Flash close stays inside the game tab.');
    app.exit(0);
  } catch (error) {
    console.error(error.stack);
    app.exit(1);
  } finally {
    server.close();
  }
}).catch(error => { console.error(error.stack); app.exit(1); });
