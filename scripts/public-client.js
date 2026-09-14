const { app, BrowserWindow, BrowserView, ipcMain, Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { startTransport } = require('./client-transport');
const { readProfileForce2D, createDisplayModeController, saveDisplayMode } = require('./flash-display-mode');
const { nextZoomFactor } = require('./client-zoom');
app.setPath('userData', path.join(app.getPath('appData'), 'DarkOrbit-Tunnel-Client'));
fs.mkdirSync(app.getPath('userData'), { recursive: true });
const serverFile = path.join(__dirname, 'server.txt');
const origin = (process.argv.find(value => /^https?:\/\//i.test(value)) || fs.readFileSync(serverFile, 'utf8').trim()).replace(/\/$/, '');
const log = message => fs.appendFileSync(path.join(app.getPath('userData'), 'client.log'), `${new Date().toISOString()} ${message}\n`);
app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname, 'pepflashplayer.dll'));
app.commandLine.appendSwitch('ppapi-flash-version', '32.0.0.344');
app.commandLine.appendSwitch('allow-outdated-plugins');
let transport, window;
app.whenReady().then(async () => {
  transport = await startTransport(origin, log);
  window = new BrowserWindow({ width: 1280, height: 900, title: 'DarkOrbit', webPreferences: { preload: path.join(__dirname, 'client-tabs-preload.js'), contextIsolation: true, nodeIntegration: false } });
  const views = {};
  let active = 'home';
  let chromeHeight = 48;
  let gameForce2D = null;
  let displayMode = null, closingGame = null;
  const gameUrl = () => transport.origin + '/map-revolution?clientReload=' + Date.now();
  window.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    if (!displayMode || !views.game || details.webContentsId !== views.game.webContents.id ||
        new URL(details.url).origin !== transport.origin || new URL(details.url).pathname !== '/map-revolution') {
      callback({ cancel: false });
      return;
    }
    // Includes F5, menu refresh and page-triggered navigation. Persist before PHP renders flashvars.
    displayMode.synchronize().then(() => callback({ cancel: false }), error => {
      log(`Game reload blocked: ${error.message}`);
      callback({ cancel: true });
    });
  });
  async function closeGameTab(view) {
    if (views.game !== view) return;
    if (window.getBrowserView() === view) window.removeBrowserView(view);
    view.webContents.destroy();
    delete views.game;
    displayMode = null;
    gameForce2D = null;
    select('home');
  }
  async function handleGameClose(view) {
    await new Promise(resolve => setTimeout(resolve, 250));
    if (views.game !== view || view.webContents.isDestroyed()) return;
    await displayMode.synchronize();
    const action = displayMode.closeAction();
    log(`Game requested close: ${action}`);
    if (action !== 'reload-game') { await closeGameTab(view); return; }
    await view.webContents.loadURL(gameUrl());
    select('game');
  }
  function requestGameClose(view) {
    if (closingGame) return;
    closingGame = handleGameClose(view).catch(error => {
      log(`Game close handling failed: ${error.stack || error.message}`);
      dialog.showErrorBox('Režim sa nepodarilo uložiť', 'Herná karta zostala otvorená. Skús obnoviť kartu.');
    }).finally(() => { closingGame = null; });
  }
  function select(tab) {
    if (!['home', 'game'].includes(tab)) return;
    if (!views[tab]) {
      const view = new BrowserView({ webPreferences: {
        plugins: true,
        preload: tab === 'game' ? path.join(__dirname, 'game-zoom-preload.js') : undefined,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false
      } });
      views[tab] = view;
      if (tab === 'game') {
        const controller = createDisplayModeController({
          readMode: () => readProfileForce2D(app.getPath('userData'), transport.origin),
          saveMode: async mode => {
            await saveDisplayMode(transport.origin, view.webContents.session.cookies, mode);
            log(`Display mode saved: ${mode ? '2D' : '3D'}`);
          }
        });
        displayMode = controller;
        const timer = setInterval(() => {
          controller.synchronize().catch(error => log(`Display mode save failed: ${error.message}`));
        }, 250);
        view.webContents.once('destroyed', () => clearInterval(timer));
      }
      view.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        if (url.startsWith(transport.origin + '/map-revolution')) select('game');
        else if (url.startsWith(transport.origin + '/')) view.webContents.loadURL(url);
      });
      view.webContents.on('will-navigate', (event, url) => {
        if (!url.startsWith(transport.origin + '/')) event.preventDefault();
        else if (tab === 'home' && url.includes('/map-revolution')) { event.preventDefault(); select('game'); }
      });
      view.webContents.on('did-fail-load', (_event, code, message) => log(`Page failed ${code}: ${message}`));
      view.webContents.on('before-input-event', (event, input) => {
        if (tab !== 'game' || input.type !== 'mouseWheel' || !input.control) return;
        const current = view.webContents.getZoomFactor();
        const next = nextZoomFactor(current, input.deltaY, input.control, gameForce2D === true);
        if (next !== current) {
          event.preventDefault();
          view.webContents.setZoomFactor(next);
          log(`2D zoom changed to ${next.toFixed(1)}`);
        }
      });
      view.webContents.on('did-finish-load', async () => {
        if (tab !== 'game') return;
        try {
          const html = await view.webContents.executeJavaScript('document.documentElement.innerHTML');
          const match = html.match(/"display2d"\s*:\s*"([12])"/);
          gameForce2D = match ? match[1] === '2' : null;
          displayMode.pageLoaded(gameForce2D);
        } catch (error) { log(`Display mode read failed: ${error.message}`); }
      });
      view.webContents.on('close', event => {
        if (tab !== 'game') return;
        event.preventDefault();
        requestGameClose(view);
      });
      view.webContents.on('plugin-crashed', () => log('Flash plugin crashed'));
      view.webContents.loadURL(tab === 'game' ? gameUrl() : transport.origin + '/');
    }
    window.setBrowserView(views[tab]); active = tab;
    resize(); window.webContents.send('active-tab', tab);
  }
  function resize() { const [width, height] = window.getContentSize(); if (views[active]) views[active].setBounds({ x: 0, y: chromeHeight, width, height: Math.max(0, height - chromeHeight) }); }
  ipcMain.on('game-close-request', event => {
    if (views.game && event.sender === views.game.webContents) requestGameClose(views.game);
  });
  ipcMain.on('select-tab', (event, tab) => { if (event.sender === window.webContents) select(tab); });
  ipcMain.on('game-zoom-wheel', (event, deltaY) => {
    const view = views.game;
    if (!view || event.sender !== view.webContents || !Number.isFinite(deltaY)) return;
    const current = view.webContents.getZoomFactor();
    const next = nextZoomFactor(current, deltaY, true, gameForce2D === true);
    if (next !== current) {
      view.webContents.setZoomFactor(next);
      log(`2D zoom changed to ${next.toFixed(1)}`);
    }
  });
  ipcMain.on('open-hangar', event => { if (event.sender === window.webContents) { select('home'); views.home.webContents.loadURL(transport.origin + '/equipment'); } });
  ipcMain.on('arena-open', (event, open) => { if (event.sender === window.webContents) { chromeHeight = open ? 250 : 48; resize(); } });
  ipcMain.handle('arena-api', async (event, payload) => {
    if (event.sender !== window.webContents || !views.home) return {status: false, message: 'Klient nie je pripravený.'};
    const request = {action: String(payload.action || '')};
    if (payload.nickname != null) request.nickname = String(payload.nickname);
    if (payload.inviteId != null) request.inviteId = String(payload.inviteId);
    return views.home.webContents.executeJavaScript(`fetch('/arena-api.php', {
      method: 'POST', credentials: 'same-origin', headers: {'Content-Type':'application/x-www-form-urlencoded'},
      body: new URLSearchParams(${JSON.stringify(request)})
    }).then(response => response.json())`);
  });
  window.on('resize', resize);
  window.on('closed', () => { for (const view of Object.values(views)) view.webContents.destroy(); });
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'Klient', submenu: [
    { label: 'Domov', accelerator: 'F3', click: () => select('home') },
    { label: 'Hra', accelerator: 'F2', click: () => select('game') },
    { label: 'Obnoviť aktívnu kartu', accelerator: 'F5', click: () => active === 'game' ? views.game.webContents.reloadIgnoringCache() : views.home.webContents.reload() },
    { role: 'quit', label: 'Zavrieť' }
  ] }]));
  await window.loadFile(path.join(__dirname, 'client-tabs.html'));
  select('home');
}).catch(error => { dialog.showErrorBox('Klient sa nemohol spustiť', error.message + '\nZatvor ostatné kópie klienta a skús znova.'); app.quit(); });
app.on('before-quit', () => { if (transport) transport.close(); });
app.on('window-all-closed', () => app.quit());
