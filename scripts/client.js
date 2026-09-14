const { app, BrowserWindow, session, Menu, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { nextZoomFactor } = require('./client-zoom');
const { readProfileForce2D, createDisplayModeController, saveDisplayMode } = require('./flash-display-mode');
const local = path.resolve(__dirname, '../.local');
const origin = 'http://127.0.0.1';
app.setPath('userData', path.join(local, 'client-profile'));
app.commandLine.appendSwitch('ppapi-flash-path', path.join(local, 'client/pepflashplayer.dll'));
app.commandLine.appendSwitch('ppapi-flash-version', '32.0.0.344');
app.commandLine.appendSwitch('allow-outdated-plugins');
const log = message => fs.appendFileSync(path.join(local, 'logs/client.log'), `${new Date().toISOString()} ${message}\n`);
let window;
let gameForce2D = null;
let displayMode = null, closingGame = null;
app.whenReady().then(async () => {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const allowed = details.url.startsWith(origin + '/') || details.url.startsWith('data:') || details.url.startsWith('blob:');
    if (!allowed) log('Blocked external URL: ' + details.url);
    if (allowed && displayMode && new URL(details.url).pathname === '/map-revolution') {
      displayMode.synchronize().then(() => callback({ cancel: false }), error => {
        log(`Game reload blocked: ${error.message}`);
        callback({ cancel: true });
      });
    } else callback({ cancel: !allowed });
  });
  session.defaultSession.webRequest.onCompleted(details => {
    if (details.statusCode >= 400) log(`HTTP ${details.statusCode} ${details.url}`);
  });
  window = new BrowserWindow({ width: 1280, height: 850, title: 'DarkOrbit 10 - Local',
    webPreferences: { plugins: true, preload: path.join(__dirname, 'game-zoom-preload.js'), nodeIntegration: false, contextIsolation: true } });
  displayMode = createDisplayModeController({
    readMode: () => readProfileForce2D(app.getPath('userData'), origin),
    saveMode: async mode => {
      await saveDisplayMode(origin, session.defaultSession.cookies, mode);
      log(`Display mode saved: ${mode ? '2D' : '3D'}`);
    }
  });
  const modeTimer = setInterval(() => {
    displayMode.synchronize().catch(error => log(`Display mode save failed: ${error.message}`));
  }, 250);
  window.once('closed', () => clearInterval(modeTimer));
  ipcMain.on('game-close-request', event => {
    if (event.sender !== window.webContents || closingGame) return;
    closingGame = (async () => {
      await new Promise(resolve => setTimeout(resolve, 250));
      await displayMode.synchronize();
      const action = displayMode.closeAction();
      log(`Game requested close: ${action}`);
      await window.loadURL(origin + (action === 'reload-game' ? '/map-revolution?clientReload=' + Date.now() : '/'));
    })().catch(error => log(`Game close handling failed: ${error.message}`))
      .finally(() => { closingGame = null; });
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Hra', submenu:[
      {label:'Mapa', accelerator:'F2', click:()=>window.loadURL(origin+'/map-revolution')},
      {label:'Hangar', accelerator:'F3', click:()=>window.loadURL(origin+'/equipment')},
      {label:'Lode', click:()=>window.loadURL(origin+'/ships')},
      {label:'Pilotne schopnosti', click:()=>window.loadURL(origin+'/skill-tree')},
      {label:'Nastavenia', click:()=>window.loadURL(origin+'/settings')},
      {type:'separator'}, {role:'quit', label:'Zavriet'}
    ]}
  ]));
  window.webContents.on('console-message', (_, level, message) => log(`console ${level}: ${message}`));
  window.webContents.on('did-finish-load', async () => {
    if (!window.webContents.getURL().includes('/map-revolution')) {
      displayMode.pageLoaded(null);
      return;
    }
    const html = await window.webContents.executeJavaScript('document.documentElement.innerHTML');
    const match = html.match(/"display2d"\s*:\s*"([12])"/);
    gameForce2D = match ? match[1] === '2' : null;
    displayMode.pageLoaded(gameForce2D);
  });
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'mouseWheel' || !input.control || !window.webContents.getURL().includes('/map-revolution')) return;
    const current = window.webContents.getZoomFactor();
    const next = nextZoomFactor(current, input.deltaY, input.control, gameForce2D === true);
    if (next !== current) {
      event.preventDefault();
      window.webContents.setZoomFactor(next);
      log(`2D zoom changed to ${next.toFixed(1)}`);
    }
  });
  ipcMain.on('game-zoom-wheel', (event, deltaY) => {
    if (event.sender !== window.webContents || !Number.isFinite(deltaY) ||
        !window.webContents.getURL().includes('/map-revolution')) return;
    const current = window.webContents.getZoomFactor();
    const next = nextZoomFactor(current, deltaY, true, gameForce2D === true);
    if (next !== current) {
      window.webContents.setZoomFactor(next);
      log(`2D zoom changed to ${next.toFixed(1)}`);
    }
  });
  window.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    if (url.startsWith(origin + '/')) window.loadURL(url);
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin + '/')) event.preventDefault();
  });
  await window.loadURL(origin + '/');
  const { username, password } = JSON.parse(fs.readFileSync(path.join(local, 'credentials.json'), 'utf8').replace(/^\uFEFF/, ''));
  const result = await window.webContents.executeJavaScript(`(async () => {
    const response = await fetch('/api', { method: 'POST', body: new URLSearchParams(${JSON.stringify({ action: 'login', username, password })}) });
    const login = await response.json();
    if (!login.status) throw new Error(login.message);
    return 'Login successful';
  })()`);
  log(result);
  await window.loadURL(origin + '/map-revolution');
  for (const delay of [10000, 25000, 50000]) {
    setTimeout(async () => {
      if (window && !window.isDestroyed()) {
        const screenshot = await window.webContents.capturePage();
        fs.writeFileSync(path.join(local, `logs/client-${delay}.png`), screenshot.toPNG());
      }
    }, delay);
  }
}).catch(error => log(error.stack));
app.on('window-all-closed', () => app.quit());
