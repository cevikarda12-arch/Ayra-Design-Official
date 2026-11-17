// Ayra Design — güvenli köprü (renderer <-> ana süreç)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ayraDesktop', {
  getServer: () => ipcRenderer.invoke('ayra:getServer'),
  setServer: (url) => ipcRenderer.invoke('ayra:setServer', url),
  notify: (title, body) => ipcRenderer.send('ayra:notify', { title, body }),
  platform: process.platform,
});
