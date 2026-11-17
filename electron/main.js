// Ayra Design — masaüstü uygulaması (Electron)
// Yerel modda gömülü sunucuyu başlatır; uzak modda ekibin sunucusuna bağlanır.
const { app, BrowserWindow, ipcMain, shell, Notification, dialog, Menu, nativeImage, Tray, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const ICON = path.join(__dirname, '..', 'build', 'icon.png');
const TRAY_ICON = path.join(__dirname, '..', 'build', 'tray.png');
let win = null;
let tray = null;
let quitting = false;
let trayHintShown = false;
let updateState = { state: 'idle' };
const TITLEBAR_H = 60;
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

// ---------------------------------------------------------------- açılış: küçük pencere -> büyüme
const SPLASH = { width: 640, height: 440 };
let splashing = false;
let grown = true;
function growWindow() {
  if (!win || grown) return;
  grown = true;
  const from = win.getBounds();
  const wa = screen.getDisplayMatching(from).workArea;
  const to = { x: wa.x, y: wa.y, width: wa.width, height: wa.height };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const dur = 750, t0 = Date.now();
  win.setResizable(true);
  const timer = setInterval(() => {
    if (!win || win.isDestroyed()) return clearInterval(timer);
    const k = ease(Math.min(1, (Date.now() - t0) / dur));
    const lerp = (a, b) => Math.round(a + (b - a) * k);
    win.setBounds({ x: lerp(from.x, to.x), y: lerp(from.y, to.y), width: lerp(from.width, to.width), height: lerp(from.height, to.height) });
    if (k >= 1) {
      clearInterval(timer);
      win.setMinimumSize(1024, 680);
      if (process.env.AYRA_MAXIMIZE !== '0') win.maximize();
    }
  }, 15);
}

async function createWindow() {
  splashing = !process.argv.includes('--hidden') && process.env.AYRA_SPLASH !== '0';
  grown = !splashing;
  win = new BrowserWindow({
    width: splashing ? SPLASH.width : 1440,
    height: splashing ? SPLASH.height : 900,
    center: true,
    resizable: !splashing,
    ...(splashing ? {} : { minWidth: 1024, minHeight: 680 }),
    title: 'Ayra Design',
    backgroundColor: '#0b0c10',
    icon: fs.existsSync(ICON) ? nativeImage.createFromPath(ICON) : undefined,
    show: false,
    autoHideMenuBar: true,
    // Windows'un beyaz başlık çubuğunu kaldır; pencere düğmeleri uygulamanın üst barına gömülür
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 18, y: 22 } }
      : { titleBarOverlay: { color: '#0b0c10', symbolColor: '#e9e9f0', height: TITLEBAR_H } }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => {
    if (process.argv.includes('--hidden')) return;
    win.show();
    if (splashing) setTimeout(growWindow, 9000); // güvenlik: arayüz istemese de büyü
    else if (process.env.AYRA_MAXIMIZE !== '0') win.maximize();
  });

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
  // Kapatma düğmesi uygulamayı kapatmaz; sağ alttaki sistem tepsisine küçültür
  win.on('close', (e) => {
    if (quitting || readConfig().closeToTray === false) return;
    e.preventDefault();
    win.hide();
    if (!trayHintShown && Notification.isSupported()) {
      trayHintShown = true;
      new Notification({ title: 'Ayra Design arka planda çalışıyor', body: 'Ekibiniz bağlı kalabilir. Sağ alttaki simgeden tekrar açabilir veya tamamen çıkabilirsiniz.', icon: fs.existsSync(ICON) ? ICON : undefined }).show();
    }
  });
  win.loadURL(await targetUrl());
}

function showWindow() {
  if (!win) return createWindow();
  growWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

// ---------------------------------------------------------------- sistem tepsisi
function buildTrayMenu() {
  const cfg = readConfig();
  const login = app.getLoginItemSettings();
  const upd = updateState.state === 'downloaded' ? [{ label: `Yeniden başlat ve güncelle (v${updateState.version})`, click: installUpdate }, { type: 'separator' }] : [];
  return Menu.buildFromTemplate([
    { label: 'Ayra Design\'ı aç', click: showWindow },
    { type: 'separator' },
    ...upd,
    { label: 'Güncellemeleri denetle', enabled: app.isPackaged, click: () => checkUpdates(true) },
    { label: 'Windows açılışında başlat', type: 'checkbox', checked: !!login.openAtLogin, click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked, args: ['--hidden'] }) },
    { label: 'Kapatınca arka planda çalış', type: 'checkbox', checked: cfg.closeToTray !== false, click: (i) => writeConfig({ ...readConfig(), closeToTray: i.checked }) },
    { type: 'separator' },
    { label: `Sürüm ${app.getVersion()}`, enabled: false },
    { label: 'Çıkış', click: () => { quitting = true; app.quit(); } },
  ]);
}
function createTray() {
  if (tray) return;
  const img = nativeImage.createFromPath(fs.existsSync(TRAY_ICON) ? TRAY_ICON : ICON).resize({ width: process.platform === 'darwin' ? 18 : 16, height: process.platform === 'darwin' ? 18 : 16 });
  tray = new Tray(img);
  tray.setToolTip('Ayra Design');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', showWindow);
  tray.on('double-click', showWindow);
  tray.on('right-click', () => tray.setContextMenu(buildTrayMenu()));
}

// ---------------------------------------------------------------- otomatik güncelleme (GitHub Releases)
let autoUpdater = null;
function sendUpdate(st) {
  updateState = { ...updateState, ...st };
  if (win && !win.isDestroyed()) win.webContents.send('ayra:update', updateState);
  if (tray) tray.setContextMenu(buildTrayMenu());
}
function setupUpdater() {
  if (!app.isPackaged) return;
  try { autoUpdater = require('electron-updater').autoUpdater; } catch (e) { console.error('[ayra] updater yok', e.message); return; }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => sendUpdate({ state: 'checking' }));
  autoUpdater.on('update-available', (i) => sendUpdate({ state: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('update-not-available', () => sendUpdate({ state: 'latest' }));
  autoUpdater.on('download-progress', (p) => sendUpdate({ state: 'downloading', percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (i) => {
    sendUpdate({ state: 'downloaded', version: i.version });
    if (Notification.isSupported()) {
      const n = new Notification({ title: 'Ayra Design güncellemesi hazır', body: `v${i.version} indirildi. Uygulamayı yeniden başlattığınızda kurulacak.`, icon: fs.existsSync(ICON) ? ICON : undefined });
      n.on('click', showWindow);
      n.show();
    }
  });
  autoUpdater.on('error', (e) => sendUpdate({ state: 'error', error: String((e && e.message) || e).slice(0, 200) }));
  setTimeout(() => checkUpdates(false), 8000);
  setInterval(() => checkUpdates(false), 2 * 60 * 60 * 1000);
}
function checkUpdates(manual) {
  if (!autoUpdater) { if (manual) sendUpdate({ state: 'dev' }); return; }
  autoUpdater.checkForUpdates().catch((e) => sendUpdate({ state: 'error', error: String(e.message || e).slice(0, 200) }));
}
function installUpdate() {
  if (!autoUpdater || updateState.state !== 'downloaded') return;
  quitting = true;
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
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
ipcMain.handle('ayra:appInfo', () => ({ version: app.getVersion(), packaged: app.isPackaged, update: updateState, closeToTray: readConfig().closeToTray !== false, openAtLogin: !!app.getLoginItemSettings().openAtLogin }));
ipcMain.on('ayra:checkUpdates', () => checkUpdates(true));
ipcMain.on('ayra:introGrow', () => growWindow());
ipcMain.on('ayra:fullscreen', (e, on) => { if (win) win.setFullScreen(!!on); });
ipcMain.on('ayra:installUpdate', installUpdate);
ipcMain.on('ayra:zoom', (e, f) => { const z = Math.max(0.7, Math.min(1.5, Number(f) || 1)); if (win) win.webContents.setZoomFactor(z); });
ipcMain.on('ayra:setDesktopPref', (e, { key, value }) => {
  if (key === 'closeToTray') writeConfig({ ...readConfig(), closeToTray: !!value });
  if (key === 'openAtLogin') app.setLoginItemSettings({ openAtLogin: !!value, args: ['--hidden'] });
  if (tray) tray.setContextMenu(buildTrayMenu());
});
ipcMain.on('ayra:titlebar', (e, { color, symbolColor }) => {
  try {
    if (win && process.platform !== 'darwin' && win.setTitleBarOverlay) {
      win.setTitleBarOverlay({ color: String(color || '#0b0c10'), symbolColor: String(symbolColor || '#e9e9f0'), height: TITLEBAR_H });
    }
  } catch {}
});
ipcMain.on('ayra:notify', (e, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      const n = new Notification({ title: String(title || 'Ayra Design'), body: String(body || '').slice(0, 200), icon: fs.existsSync(ICON) ? ICON : undefined });
      n.on('click', showWindow);
      n.show();
    }
    if (win && !win.isFocused()) win.flashFrame(true);
  } catch {}
});

// ---------------------------------------------------------------- lifecycle
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.setAppUserModelId('com.ayradesign.studio');
  app.whenReady().then(async () => { await createWindow(); createTray(); setupUpdater(); });
  app.on('window-all-closed', () => { if (quitting || readConfig().closeToTray === false) app.quit(); });
  app.on('before-quit', () => { quitting = true; });
  app.on('before-quit', () => { if (localServer) try { localServer.db.flush(); } catch {} });
  app.on('activate', showWindow);
}
