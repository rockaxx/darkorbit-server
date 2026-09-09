const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('clientTabs', {
  select: tab => ipcRenderer.send('select-tab', tab),
  hangar: () => ipcRenderer.send('open-hangar'),
  onActive: callback => ipcRenderer.on('active-tab', (_event, tab) => callback(tab))
});
