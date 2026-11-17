// Açılış ekranı köprüsü
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('splash', { done: () => ipcRenderer.send('ayra:splashDone') });
