const { app, BrowserWindow, BrowserView, ipcMain, Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { startTransport } = require('./client-transport');
const { readForce2D, findLatestSol, resolveGameCloseAction } = require('./flash-display-mode');
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
  const gameUrl = () => transport.origin + '/map-revolution?clientReload=' + Date.now();
  async function closeGameTab(view) {
    if (window.getBrowserView() === view) window.removeBrowserView(view);
    view.webContents.destroy();
    delete views.game;
    select('home');
  }
  async function handleGameClose(view) {
    await new Promise(resolve => setTimeout(resolve, 250));
    const solRoot = path.join(app.getPath('userData'), 'Pepper Data', 'Shockwave Flash', 'WritableRoot', '#SharedObjects');
    const solPath = findLatestSol(solRoot);
    const force2D = solPath ? readForce2D(fs.readFileSync(solPath)) : null;
    const action = resolveGameCloseAction(force2D, gameForce2D);
    log(`Game requested close: ${action}; Flash force2D=${force2D}; page force2D=${gameForce2D}`);
    if (action !== 'reload-game') { await closeGameTab(view); return; }

    const version = force2D ? 'false' : 'true';
    const result = await view.webContents.executeJavaScript(`fetch('/api/', {
      method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({action: 'change_version', version: ${JSON.stringify(version)}})
    }).then(response => response.json())`);
    if (!result.status) throw new Error(result.message || 'Display mode could not be saved.');
    gameForce2D = force2D;
    await view.webContents.session.clearCache();
    await view.webContents.loadURL(gameUrl());
    select('game');
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
        } catch (error) { log(`Display mode read failed: ${error.message}`); }
      });
      view.webContents.on('close', event => {
        if (tab !== 'game') return;
        event.preventDefault();
        handleGameClose(view).catch(error => { log(`Game close handling failed: ${error.stack || error.message}`); closeGameTab(view); });
      });
      view.webContents.on('plugin-crashed', () => log('Flash plugin crashed'));
      view.webContents.loadURL(tab === 'game' ? gameUrl() : transport.origin + '/');
    }
    window.setBrowserView(views[tab]); active = tab;
    resize(); window.webContents.send('active-tab', tab);
  }
  function resize() { const [width, height] = window.getContentSize(); if (views[active]) views[active].setBounds({ x: 0, y: chromeHeight, width, height: Math.max(0, height - chromeHeight) }); }
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
