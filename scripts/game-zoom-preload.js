'use strict';

const { ipcRenderer } = require('electron');
const { createWheelZoomHandler } = require('./client-zoom');

const handleZoomWheel = createWheelZoomHandler(deltaY => {
  ipcRenderer.send('game-zoom-wheel', deltaY);
});

window.addEventListener('wheel', event => {
  if (!window.location.pathname.includes('/map-revolution')) return;
  handleZoomWheel(event);
}, { capture: true, passive: false });
