// Ayra Design — masaüstü uygulaması (Electron)
// Yerel modda gömülü sunucuyu başlatır; uzak modda ekibin sunucusuna bağlanır.
const { app, BrowserWindow, ipcMain, shell, Notification, dialog, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const ICON = path.join(__dirname, '..', 'build', 'icon.png');
let win = null;
let localServer = null;
let localUrl = null;

const configPath = () => path.join(app.getPath('userData'), 'ayra-config.json');
function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); } catch { return {}; }
}
function writeConfig(c) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(c, null, 2));
}

async function startLocalServer() {
  if (localUrl) return localUrl;
  const { createServer } = require('../server');
  const dataDir = process.env.AYRA_DATA_DIR || path.join(app.getPath('userData'), 'data');
  localServer = createServer({ dataDir });
  const port = await localServer.start(Number(process.env.PORT) || 4321, '0.0.0.0');
  localUrl = `http://localhost:${port}`;
  console.log('[ayra] Yerel sunucu:', localUrl, 'veri:', dataDir);
  return localUrl;
}

async function targetUrl() {
  const cfg = readConfig();
  if (cfg.remote && /^https?:\/\//.test(cfg.remote)) return cfg.remote.replace(/\/+$/, '');
  return startLocalServer();
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Ayra Design',
    backgroundColor: '#0b0c10',
    icon: fs.existsSync(ICON) ? nativeImage.createFromPath(ICON) : undefined,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => { win.show(); if (process.env.AYRA_MAXIMIZE !== '0') win.maximize(); });

  // dış bağlantılar sistem tarayıcısında açılsın; yazdırma pencerelerine izin ver
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url || url === 'about:blank') return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, backgroundColor: '#ffffff' } };
    try {
      const u = new URL(url);
      const base = new URL(win.webContents.getURL());
      if (u.origin === base.origin && u.pathname.startsWith('/uploads/')) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true } };
    } catch {}
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && (input.key === 'F11')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.type === 'keyDown' && input.key === 'F12' && !app.isPackaged) win.webContents.toggleDevTools();
    if (input.type === 'keyDown' && input.control && input.key.toLowerCase() === 'r') { win.webContents.reload(); e.preventDefault(); }
  });
  win.webContents.on('did-fail-load', async (e, code, desc, url, isMain) => {
    if (!isMain) return;
    const cfg = readConfig();
    const r = await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Bağlantı kurulamadı',
      message: `Sunucuya bağlanılamadı:\n${url}`,
      detail: cfg.remote ? 'Uzak sunucu kapalı olabilir veya adres yanlış olabilir.' : desc,
      buttons: ['Yeniden dene', 'Yerel sunucuya dön', 'Çıkış'],
      defaultId: 0,
    });
    if (r.response === 0) win.loadURL(await targetUrl());
    else if (r.response === 1) { writeConfig({ ...cfg, remote: '' }); win.loadURL(await startLocalServer()); }
    else app.quit();
  });
  win.loadURL(await targetUrl());
}

// ---------------------------------------------------------------- IPC
ipcMain.handle('ayra:getServer', () => ({ remote: readConfig().remote || '', local: localUrl }));
ipcMain.handle('ayra:setServer', async (e, url) => {
  const cfg = readConfig();
  cfg.remote = typeof url === 'string' ? url.trim() : '';
  writeConfig(cfg);
  if (win) win.loadURL(await targetUrl());
  return true;
});
ipcMain.on('ayra:notify', (e, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      const n = new Notification({ title: String(title || 'Ayra Design'), body: String(body || '').slice(0, 200), icon: fs.existsSync(ICON) ? ICON : undefined });
      n.on('click', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
      n.show();
    }
    if (win && !win.isFocused()) win.flashFrame(true);
  } catch {}
});

// ---------------------------------------------------------------- lifecycle
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.setAppUserModelId('com.ayradesign.studio');
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { if (localServer) try { localServer.db.flush(); } catch {} });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
