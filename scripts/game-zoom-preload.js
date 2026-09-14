'use strict';

const { ipcRenderer, contextBridge, webFrame } = require('electron');
const { createWheelZoomHandler } = require('./client-zoom');

// Electron 11 routes BrowserView window.close() to its owning BrowserWindow.
// Replace the page's close function before Flash can terminate the whole client.
if (window.location.pathname.includes('/map-revolution')) {
  contextBridge.exposeInMainWorld('gameLifecycle', { close: () => ipcRenderer.send('game-close-request') });
  webFrame.executeJavaScript('window.close = () => window.gameLifecycle.close();');
}

const handleZoomWheel = createWheelZoomHandler(deltaY => {
  ipcRenderer.send('game-zoom-wheel', deltaY);
});

window.addEventListener('wheel', event => {
  if (!window.location.pathname.includes('/map-revolution')) return;
  handleZoomWheel(event);
}, { capture: true, passive: false });
