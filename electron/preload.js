// Ayra Design — güvenli köprü (renderer <-> ana süreç)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ayraDesktop', {
  getServer: () => ipcRenderer.invoke('ayra:getServer'),
  setServer: (url) => ipcRenderer.invoke('ayra:setServer', url),
  notify: (title, body) => ipcRenderer.send('ayra:notify', { title, body }),
  setTitleBar: (color, symbolColor) => ipcRenderer.send('ayra:titlebar', { color, symbolColor }),
  setZoom: (f) => ipcRenderer.send('ayra:zoom', f),
  introGrow: () => ipcRenderer.send('ayra:introGrow'),
  setFullScreen: (on) => ipcRenderer.send('ayra:fullscreen', on),
  appInfo: () => ipcRenderer.invoke('ayra:appInfo'),
  checkUpdates: () => ipcRenderer.send('ayra:checkUpdates'),
  installUpdate: () => ipcRenderer.send('ayra:installUpdate'),
  setDesktopPref: (key, value) => ipcRenderer.send('ayra:setDesktopPref', { key, value }),
  onUpdate: (cb) => { const h = (e, st) => cb(st); ipcRenderer.on('ayra:update', h); return () => ipcRenderer.removeListener('ayra:update', h); },
  platform: process.platform,
});
