const { app, BrowserWindow, BrowserView, ipcMain, Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { startTransport } = require('./client-transport');
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
  function select(tab) {
    if (!['home', 'game'].includes(tab)) return;
    if (!views[tab]) {
      const view = new BrowserView({ webPreferences: { plugins: true, nodeIntegration: false, contextIsolation: true, backgroundThrottling: false } });
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
      view.webContents.on('plugin-crashed', () => log('Flash plugin crashed'));
      view.webContents.loadURL(transport.origin + (tab === 'game' ? '/map-revolution' : '/'));
    }
    window.setBrowserView(views[tab]); active = tab;
    resize(); window.webContents.send('active-tab', tab);
  }
  function resize() { const [width, height] = window.getContentSize(); if (views[active]) views[active].setBounds({ x: 0, y: 48, width, height: Math.max(0, height - 48) }); }
  ipcMain.on('select-tab', (event, tab) => { if (event.sender === window.webContents) select(tab); });
  ipcMain.on('open-hangar', event => { if (event.sender === window.webContents) { select('home'); views.home.webContents.loadURL(transport.origin + '/equipment'); } });
  window.on('resize', resize);
  window.on('closed', () => { for (const view of Object.values(views)) view.webContents.destroy(); });
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: 'Klient', submenu: [
    { label: 'Domov', accelerator: 'F3', click: () => select('home') },
    { label: 'Hra', accelerator: 'F2', click: () => select('game') },
    { label: 'Obnoviť aktívnu kartu', accelerator: 'F5', click: () => views[active].webContents.reload() },
    { role: 'quit', label: 'Zavrieť' }
  ] }]));
  await window.loadFile(path.join(__dirname, 'client-tabs.html'));
  select('home');
}).catch(error => { dialog.showErrorBox('Klient sa nemohol spustiť', error.message + '\nZatvor ostatné kópie klienta a skús znova.'); app.quit(); });
app.on('before-quit', () => { if (transport) transport.close(); });
app.on('window-all-closed', () => app.quit());
