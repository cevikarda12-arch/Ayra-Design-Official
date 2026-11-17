// Ayra Design - Oyun Tasarım Stüdyosu sunucusu
// Express REST API + Socket.IO gerçek zamanlı katman + JSON veritabanı
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const { DB, uid } = require('./db');
const { seed } = require('./seed');

// ---------------------------------------------------------------------------
// Yetki tanımları
// ---------------------------------------------------------------------------
const PERMISSIONS = {
  manage_users: 'Kullanıcıları yönet (onay, rol, silme)',
  manage_projects: 'Proje oluştur / düzenle / sil',
  create: 'İçerik oluştur',
  edit_all: 'Başkalarının içeriğini düzenle',
  delete_all: 'Başkalarının içeriğini sil',
  manage_rooms: 'Sohbet odalarını yönet',
  announce: 'Duyuru yayınla',
  view_admin: 'Yönetim panelini görüntüle',
  manage_system: 'Sistem ayarları, yedekleme ve geri yükleme',
};

const DEFAULT_ROLES = {
  admin: { name: 'Yönetici (Admin)', color: '#f59f00', perms: Object.keys(PERMISSIONS), locked: true },
  lead: { name: 'Takım Lideri', color: '#9b87f5', perms: ['manage_projects', 'create', 'edit_all', 'delete_all', 'manage_rooms', 'announce', 'view_admin'] },
  member: { name: 'Takım Üyesi', color: '#20c997', perms: ['create', 'edit_all'] },
  viewer: { name: 'İzleyici', color: '#868e96', perms: [] },
};

// Genel CRUD koleksiyonları
// scoped: projeye bağlı; private: sahibine özel olabilir; createPerm: oluşturmak için gereken yetki
const COLLECTIONS = {
  projects: { createPerm: 'manage_projects', editPerm: 'manage_projects', deletePerm: 'manage_projects', label: 'Proje' },
  tasks: { scoped: true, label: 'Görev', title: 'title' },
  notes: { private: true, label: 'Not', title: 'title' },
  drawings: { scoped: true, label: 'Çizim Panosu', title: 'name' },
  gdd: { scoped: true, label: 'GDD Bölümü', title: 'title' },
  entities: { scoped: true, label: 'Varlık', title: 'name' },
  levels: { scoped: true, label: 'Seviye', title: 'name' },
  dialogues: { scoped: true, label: 'Diyalog', title: 'name' },
  bugs: { scoped: true, label: 'Hata Kaydı', title: 'title' },
  events: { label: 'Etkinlik', title: 'title' },
  ideas: { scoped: true, label: 'Fikir', title: 'text' },
  pixelart: { scoped: true, label: 'Piksel Çizim', title: 'name' },
  files: { label: 'Dosya', title: 'name' },
  announcements: { createPerm: 'announce', editPerm: 'announce', deletePerm: 'announce', label: 'Duyuru', title: 'title' },
  palettes: { label: 'Palet', title: 'name' },
  wiki: { scoped: true, label: 'Wiki Sayfası', title: 'title' },
  sounds: { scoped: true, label: 'Ses Kaydı', title: 'name' },
  playtests: { scoped: true, label: 'Oyun Testi', title: 'title' },
  milestones: { scoped: true, label: 'Kilometre Taşı', title: 'title' },
  builds: { scoped: true, label: 'Sürüm', title: 'version' },
  assets: { scoped: true, label: 'Varlık', title: 'name' },
};

// ---------------------------------------------------------------------------
function createServer(options = {}) {
  const dataDir = options.dataDir || process.env.AYRA_DATA_DIR || path.join(__dirname, '..', 'data');
  const uploadDir = path.join(dataDir, 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const db = new DB(path.join(dataDir, 'ayra-db.json'));
  if (!db.meta('roles')) db.meta('roles', DEFAULT_ROLES);
  else {
    // admin rolü her zaman tüm yetkilere sahip olur
    const roles = db.meta('roles');
    roles.admin = { ...DEFAULT_ROLES.admin, ...roles.admin, perms: Object.keys(PERMISSIONS), locked: true };
    db.meta('roles', roles);
  }
  if (!db.meta('settings')) {
    db.meta('settings', { registrationOpen: true, studioName: 'Ayra Design', welcomeMessage: 'Ayra Design stüdyosuna hoş geldin! Birlikte harika oyunlar tasarlayalım.' });
  }
  seed(db, bcrypt);

  // ------------------------------------------------------------- otomatik yedekleme (günde bir, son 14 yedek)
  const backupDir = path.join(dataDir, 'backups');
  function autoBackup(force = false) {
    try {
      fs.mkdirSync(backupDir, { recursive: true });
      const name = 'ayra-yedek-' + new Date().toISOString().slice(0, 10) + '.json';
      const file = path.join(backupDir, name);
      if (fs.existsSync(file) && !force) return null;
      db.flush();
      fs.writeFileSync(file, JSON.stringify(db.data));
      const all = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json')).sort();
      all.slice(0, Math.max(0, all.length - 14)).forEach((f) => { try { fs.unlinkSync(path.join(backupDir, f)); } catch {} });
      return name;
    } catch (e) { console.error('[yedek]', e.message); return null; }
  }
  setTimeout(() => autoBackup(), 5000);
  const backupTimer = setInterval(() => autoBackup(), 60 * 60 * 1000);
  backupTimer.unref && backupTimer.unref();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 2e7, cors: { origin: true, credentials: true } });

  app.disable('x-powered-by');
  app.use(express.json({ limit: '30mb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // ------------------------------------------------------------- helpers
  const roles = () => db.meta('roles') || DEFAULT_ROLES;
  const settings = () => db.meta('settings') || {};

  function permsOf(user) {
    if (!user) return [];
    if (user.role === 'admin') return Object.keys(PERMISSIONS);
    const r = roles()[user.role];
    return r ? r.perms : [];
  }
  function can(user, perm) {
    return permsOf(user).includes(perm);
  }
  function publicUser(u, full = false) {
    if (!u) return null;
    const out = {
      id: u.id, username: u.username, displayName: u.displayName, title: u.title || '',
      role: u.role, status: u.status, avatarColor: u.avatarColor, avatar: u.avatar || null,
      bio: u.bio || '', presence: u.presence || 'online', statusText: u.statusText || '',
      lastSeen: u.lastSeen || null, createdAt: u.createdAt, skills: u.skills || [],
    };
    if (full) {
      out.email = u.email || '';
      out.prefs = u.prefs || {};
      out.signupNote = u.signupNote || '';
      out.mustChangePassword = !!u.mustChangePassword;
    }
    return out;
  }
  function logActivity(userId, action, target = {}) {
    const item = db.insert('activity', { userId, action, ...target });
    const arr = db.col('activity');
    if (arr.length > 3000) arr.splice(0, arr.length - 3000);
    io.emit('activity', item);
    return item;
  }
  function notify(userId, text, link = '', icon = 'bell') {
    const n = db.insert('notifications', { userId, text, link, icon, read: false });
    io.to('user:' + userId).emit('notification', n);
    return n;
  }
  function notifyPerm(perm, text, link, icon) {
    db.find('users', (u) => u.status === 'active' && can(u, perm)).forEach((u) => notify(u.id, text, link, icon));
  }
  function emitToUsers(userIds, event, payload) {
    [...new Set(userIds)].forEach((id) => io.to('user:' + id).emit(event, payload));
  }

  function hashToken(t) {
    return crypto.createHash('sha256').update(t).digest('hex');
  }
  function userFromToken(token) {
    if (!token || typeof token !== 'string') return null;
    const s = db.findOne('sessions', (x) => x.tokenHash === hashToken(token));
    if (!s) return null;
    const u = db.get('users', s.userId);
    if (!u || u.status !== 'active') return null;
    return u;
  }

  function auth(req, res, next) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    const user = userFromToken(token);
    if (!user) return res.status(401).json({ error: 'Oturum geçersiz, lütfen tekrar giriş yapın.' });
    req.user = user;
    req.token = token;
    next();
  }
  function need(perm) {
    return (req, res, next) => (can(req.user, perm) ? next() : res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' }));
  }
  const wrap = (fn) => (req, res) => {
    try { fn(req, res); } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Sunucu hatası: ' + e.message });
    }
  };

  const cleanStr = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;

  // ------------------------------------------------------------- auth
  app.get('/api/status', (req, res) => {
    const s = settings();
    res.json({ ok: true, studioName: s.studioName, registrationOpen: s.registrationOpen !== false, version: require('../package.json').version });
  });

  // Giriş denemesi sınırlaması (kaba kuvvet koruması)
  const attempts = new Map();
  function tooMany(key) {
    const now = Date.now();
    const a = (attempts.get(key) || []).filter((t) => now - t < 10 * 60 * 1000);
    attempts.set(key, a);
    return a.length >= 10;
  }

  app.post('/api/auth/register', wrap((req, res) => {
    if (settings().registrationOpen === false) return res.status(403).json({ error: 'Kayıtlar şu anda yönetici tarafından kapatıldı.' });
    const username = cleanStr(req.body.username, 24).toLowerCase();
    const displayName = cleanStr(req.body.displayName, 40) || username;
    const email = cleanStr(req.body.email, 120);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const title = cleanStr(req.body.title, 60);
    const note = cleanStr(req.body.note, 500);
    if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Kullanıcı adı 3-24 karakter olmalı (harf, rakam, _ . -).' });
    if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
    if (db.findOne('users', (u) => u.username === username)) return res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
    const colors = ['#9b87f5', '#20c997', '#f06595', '#4dabf7', '#ffa94d', '#69db7c', '#ff6b6b', '#ffd43b', '#b197fc', '#38d9a9'];
    const u = db.insert('users', {
      username, displayName, email, title, signupNote: note,
      passwordHash: bcrypt.hashSync(password, 10), role: 'member', status: 'pending',
      avatarColor: colors[Math.floor(Math.random() * colors.length)], prefs: {},
    });
    logActivity(u.id, 'kayıt başvurusu yaptı', { kind: 'user' });
    notifyPerm('manage_users', `${displayName} (@${username}) hesap açmak için onayınızı bekliyor.`, 'admin', 'user-plus');
    io.emit('pending:changed');
    res.json({ ok: true, message: 'Başvurunuz alındı! Yönetici onayından sonra giriş yapabilirsiniz.' });
  }));

  app.post('/api/auth/login', wrap((req, res) => {
    const username = cleanStr(req.body.username, 60).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const key = (req.ip || '') + ':' + username;
    if (tooMany(key)) return res.status(429).json({ error: 'Çok fazla deneme yapıldı. 10 dakika sonra tekrar deneyin.' });
    const u = db.findOne('users', (x) => x.username === username || (x.email && x.email.toLowerCase() === username));
    if (!u || !bcrypt.compareSync(password, u.passwordHash)) {
      attempts.get(key).push(Date.now());
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }
    if (u.status === 'pending') return res.status(403).json({ error: 'Hesabınız henüz yönetici tarafından onaylanmadı. Onaylandığında giriş yapabileceksiniz.', code: 'pending' });
    if (u.status === 'rejected') return res.status(403).json({ error: 'Hesap başvurunuz reddedildi.', code: 'rejected' });
    if (u.status === 'disabled') return res.status(403).json({ error: 'Hesabınız devre dışı bırakıldı. Yönetici ile iletişime geçin.', code: 'disabled' });
    attempts.delete(key);
    const token = crypto.randomBytes(32).toString('hex');
    db.insert('sessions', { tokenHash: hashToken(token), userId: u.id, ua: cleanStr(req.headers['user-agent'], 200) });
    db.update('users', u.id, { lastLogin: Date.now() });
    logActivity(u.id, 'giriş yaptı', { kind: 'auth' });
    res.json({ token, user: publicUser(u, true), perms: permsOf(u) });
  }));

  app.post('/api/auth/logout', auth, wrap((req, res) => {
    db.removeWhere('sessions', (s) => s.tokenHash === hashToken(req.token));
    res.json({ ok: true });
  }));

  // ------------------------------------------------------------- me
  app.get('/api/me', auth, (req, res) => {
    res.json({ user: publicUser(req.user, true), perms: permsOf(req.user), roles: roles(), permissions: PERMISSIONS, settings: settings() });
  });

  app.put('/api/me', auth, wrap((req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.displayName !== undefined) patch.displayName = cleanStr(b.displayName, 40) || req.user.username;
    if (b.title !== undefined) patch.title = cleanStr(b.title, 60);
    if (b.bio !== undefined) patch.bio = cleanStr(b.bio, 1000);
    if (b.email !== undefined) patch.email = cleanStr(b.email, 120);
    if (b.avatarColor !== undefined && /^#[0-9a-fA-F]{6}$/.test(b.avatarColor)) patch.avatarColor = b.avatarColor;
    if (b.avatar !== undefined) patch.avatar = typeof b.avatar === 'string' && b.avatar.length < 400000 ? b.avatar : null;
    if (b.statusText !== undefined) patch.statusText = cleanStr(b.statusText, 80);
    if (b.presence !== undefined && ['online', 'busy', 'away', 'focus'].includes(b.presence)) patch.presence = b.presence;
    if (Array.isArray(b.skills)) patch.skills = b.skills.slice(0, 20).map((s) => cleanStr(s, 30)).filter(Boolean);
    if (b.prefs && typeof b.prefs === 'object') patch.prefs = { ...(req.user.prefs || {}), ...b.prefs };
    const u = db.update('users', req.user.id, patch);
    io.emit('user:updated', publicUser(u));
    res.json({ user: publicUser(u, true) });
  }));

  app.put('/api/me/password', auth, wrap((req, res) => {
    const { current, next } = req.body || {};
    if (!req.user.mustChangePassword && !bcrypt.compareSync(String(current || ''), req.user.passwordHash)) return res.status(400).json({ error: 'Mevcut şifre hatalı.' });
    if (typeof next !== 'string' || next.length < 6) return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı.' });
    if (bcrypt.compareSync(next, req.user.passwordHash)) return res.status(400).json({ error: 'Yeni şifre eskisiyle aynı olamaz.' });
    db.update('users', req.user.id, { passwordHash: bcrypt.hashSync(next, 10), mustChangePassword: false });
    // diğer oturumları kapat
    const keep = hashToken(req.token);
    db.removeWhere('sessions', (s) => s.userId === req.user.id && s.tokenHash !== keep);
    logActivity(req.user.id, 'şifresini değiştirdi', { kind: 'auth' });
    res.json({ ok: true });
  }));

  app.get('/api/me/sessions', auth, (req, res) => {
    const cur = hashToken(req.token);
    res.json(db.find('sessions', (s) => s.userId === req.user.id).map((s) => ({ id: s.id, ua: s.ua, createdAt: s.createdAt, current: s.tokenHash === cur })));
  });
  app.delete('/api/me/sessions/:id', auth, (req, res) => {
    db.removeWhere('sessions', (s) => s.userId === req.user.id && s.id === req.params.id);
    res.json({ ok: true });
  });

  // ------------------------------------------------------------- users
  app.get('/api/users', auth, (req, res) => {
    const admin = can(req.user, 'manage_users');
    const list = db.col('users').filter((u) => admin || u.status === 'active');
    res.json(list.map((u) => ({ ...publicUser(u, admin), online: online.has(u.id) })));
  });

  // ------------------------------------------------------------- admin
  app.get('/api/admin/overview', auth, need('view_admin'), (req, res) => {
    const nets = [];
    Object.values(os.networkInterfaces()).flat().forEach((n) => {
      if (n && n.family === 'IPv4' && !n.internal) nets.push(n.address);
    });
    const counts = {};
    Object.keys(COLLECTIONS).forEach((c) => (counts[c] = db.col(c).length));
    counts.messages = db.col('messages').length;
    let dbSize = 0;
    try { dbSize = fs.statSync(path.join(dataDir, 'ayra-db.json')).size; } catch {}
    res.json({
      lanAddresses: nets.map((ip) => `http://${ip}:${server.address() ? server.address().port : ''}`),
      counts, users: db.col('users').length, pending: db.find('users', (u) => u.status === 'pending').length,
      online: online.size, dataDir, dbSize, uptime: process.uptime(), node: process.version,
    });
  });

  app.post('/api/admin/users/:id/approve', auth, need('manage_users'), wrap((req, res) => {
    const u = db.get('users', req.params.id);
    if (!u) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    const role = roles()[req.body.role] && req.body.role !== 'admin' ? req.body.role : (req.body.role === 'admin' && req.user.role === 'admin' ? 'admin' : 'member');
    db.update('users', u.id, { status: 'active', role, approvedBy: req.user.id, approvedAt: Date.now() });
    logActivity(req.user.id, `${u.displayName} kullanıcısının hesabını onayladı`, { kind: 'admin' });
    notify(u.id, `Hoş geldin ${u.displayName}! Hesabın onaylandı. 🎉`, 'dashboard', 'party-popper');
    io.emit('pending:changed');
    io.emit('user:updated', publicUser(db.get('users', u.id)));
    res.json({ ok: true });
  }));

  app.post('/api/admin/users/:id/reject', auth, need('manage_users'), wrap((req, res) => {
    const u = db.get('users', req.params.id);
    if (!u) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (u.role === 'admin' && u.status === 'active') return res.status(400).json({ error: 'Aktif admin reddedilemez.' });
    db.update('users', u.id, { status: 'rejected' });
    logActivity(req.user.id, `${u.displayName} kullanıcısının başvurusunu reddetti`, { kind: 'admin' });
    io.emit('pending:changed');
    res.json({ ok: true });
  }));

  app.post('/api/admin/users', auth, need('manage_users'), wrap((req, res) => {
    const username = cleanStr(req.body.username, 24).toLowerCase();
    const password = String(req.body.password || '');
    if (!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Geçersiz kullanıcı adı.' });
    if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
    if (db.findOne('users', (u) => u.username === username)) return res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
    let role = roles()[req.body.role] ? req.body.role : 'member';
    if (role === 'admin' && req.user.role !== 'admin') role = 'member';
    const u = db.insert('users', {
      username, displayName: cleanStr(req.body.displayName, 40) || username, email: cleanStr(req.body.email, 120),
      title: cleanStr(req.body.title, 60), passwordHash: bcrypt.hashSync(password, 10), role, status: 'active',
      avatarColor: '#4dabf7', prefs: {}, approvedBy: req.user.id, approvedAt: Date.now(), mustChangePassword: true,
    });
    logActivity(req.user.id, `${u.displayName} kullanıcısını oluşturdu`, { kind: 'admin' });
    io.emit('user:updated', publicUser(u));
    res.json(publicUser(u, true));
  }));

  app.put('/api/admin/users/:id', auth, need('manage_users'), wrap((req, res) => {
    const u = db.get('users', req.params.id);
    if (!u) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    const patch = {};
    if (req.body.role !== undefined && roles()[req.body.role]) {
      if ((req.body.role === 'admin' || u.role === 'admin') && req.user.role !== 'admin') return res.status(403).json({ error: 'Admin rolünü yalnızca admin değiştirebilir.' });
      if (u.id === req.user.id && req.body.role !== 'admin' && u.role === 'admin') {
        const admins = db.find('users', (x) => x.role === 'admin' && x.status === 'active');
        if (admins.length <= 1) return res.status(400).json({ error: 'Son admin hesabının yetkisi düşürülemez.' });
      }
      patch.role = req.body.role;
    }
    if (req.body.status !== undefined && ['active', 'disabled', 'pending', 'rejected'].includes(req.body.status)) {
      if (u.id === req.user.id) return res.status(400).json({ error: 'Kendi hesabınızın durumunu değiştiremezsiniz.' });
      if (u.role === 'admin' && req.user.role !== 'admin') return res.status(403).json({ error: 'Admin hesabını yalnızca admin değiştirebilir.' });
      patch.status = req.body.status;
      if (patch.status !== 'active') db.removeWhere('sessions', (s) => s.userId === u.id);
    }
    if (req.body.displayName !== undefined) patch.displayName = cleanStr(req.body.displayName, 40) || u.username;
    if (req.body.title !== undefined) patch.title = cleanStr(req.body.title, 60);
    const nu = db.update('users', u.id, patch);
    if (patch.status === 'disabled') io.to('user:' + u.id).emit('force:logout', 'Hesabınız devre dışı bırakıldı.');
    logActivity(req.user.id, `${u.displayName} kullanıcısını güncelledi`, { kind: 'admin' });
    io.emit('user:updated', publicUser(nu));
    io.emit('pending:changed');
    res.json(publicUser(nu, true));
  }));

  app.post('/api/admin/users/:id/reset-password', auth, need('manage_users'), wrap((req, res) => {
    const u = db.get('users', req.params.id);
    if (!u) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (u.role === 'admin' && req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkiniz yok.' });
    const pw = String(req.body.password || '');
    if (pw.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
    db.update('users', u.id, { passwordHash: bcrypt.hashSync(pw, 10), mustChangePassword: true });
    db.removeWhere('sessions', (s) => s.userId === u.id);
    io.to('user:' + u.id).emit('force:logout', 'Şifreniz yönetici tarafından sıfırlandı.');
    logActivity(req.user.id, `${u.displayName} kullanıcısının şifresini sıfırladı`, { kind: 'admin' });
    res.json({ ok: true });
  }));

  app.delete('/api/admin/users/:id', auth, need('manage_users'), wrap((req, res) => {
    const u = db.get('users', req.params.id);
    if (!u) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    if (u.id === req.user.id) return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz.' });
    if (u.role === 'admin' && req.user.role !== 'admin') return res.status(403).json({ error: 'Admin hesabını yalnızca admin silebilir.' });
    db.remove('users', u.id);
    db.removeWhere('sessions', (s) => s.userId === u.id);
    io.to('user:' + u.id).emit('force:logout', 'Hesabınız silindi.');
    logActivity(req.user.id, `${u.displayName} kullanıcısını sildi`, { kind: 'admin' });
    io.emit('user:removed', { id: u.id });
    io.emit('pending:changed');
    res.json({ ok: true });
  }));

  app.get('/api/admin/roles', auth, (req, res) => res.json({ roles: roles(), permissions: PERMISSIONS }));
  app.put('/api/admin/roles', auth, need('manage_users'), wrap((req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Rolleri yalnızca admin düzenleyebilir.' });
    const input = req.body.roles || {};
    const out = {};
    for (const [key, r] of Object.entries(input)) {
      if (!/^[a-z0-9_]{2,24}$/.test(key)) continue;
      out[key] = {
        name: cleanStr(r.name, 40) || key,
        color: /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color : '#9b87f5',
        perms: Array.isArray(r.perms) ? r.perms.filter((p) => PERMISSIONS[p]) : [],
      };
    }
    out.admin = { ...DEFAULT_ROLES.admin, name: (out.admin && out.admin.name) || DEFAULT_ROLES.admin.name };
    if (!out.member) out.member = DEFAULT_ROLES.member;
    // silinen rollerdeki kullanıcıları üyeye çevir
    db.col('users').forEach((u) => { if (!out[u.role]) u.role = 'member'; });
    db.meta('roles', out);
    logActivity(req.user.id, 'rol ve yetkileri güncelledi', { kind: 'admin' });
    io.emit('roles:changed', out);
    res.json({ roles: out });
  }));

  app.get('/api/admin/settings', auth, need('view_admin'), (req, res) => res.json(settings()));
  app.put('/api/admin/settings', auth, need('manage_system'), wrap((req, res) => {
    const s = { ...settings() };
    if (req.body.registrationOpen !== undefined) s.registrationOpen = !!req.body.registrationOpen;
    if (req.body.studioName !== undefined) s.studioName = cleanStr(req.body.studioName, 40) || 'Ayra Design';
    if (req.body.welcomeMessage !== undefined) s.welcomeMessage = cleanStr(req.body.welcomeMessage, 300);
    db.meta('settings', s);
    logActivity(req.user.id, 'sistem ayarlarını güncelledi', { kind: 'admin' });
    io.emit('settings:changed', s);
    res.json(s);
  }));

  app.get('/api/admin/activity', auth, need('view_admin'), (req, res) => {
    res.json(db.col('activity').slice(-500).reverse());
  });

  app.get('/api/admin/backups', auth, need('manage_system'), (req, res) => {
    let list = [];
    try { list = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json')).sort().reverse().map((f) => ({ name: f, size: fs.statSync(path.join(backupDir, f)).size })); } catch {}
    res.json(list);
  });
  app.post('/api/admin/backups', auth, need('manage_system'), (req, res) => { const n = autoBackup(true); res.json({ ok: !!n, name: n }); });
  app.get('/api/admin/backups/:name', auth, need('manage_system'), (req, res) => {
    const name = path.basename(req.params.name);
    const file = path.join(backupDir, name);
    if (!/^ayra-yedek-[\d-]+\.json$/.test(name) || !fs.existsSync(file)) return res.status(404).json({ error: 'Yedek bulunamadı.' });
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.sendFile(file);
  });

  app.get('/api/admin/backup', auth, need('manage_system'), (req, res) => {
    db.flush();
    res.setHeader('Content-Disposition', `attachment; filename="ayra-yedek-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(db.data);
  });

  app.post('/api/admin/restore', auth, need('manage_system'), wrap((req, res) => {
    const data = req.body && req.body.data;
    if (!data || !Array.isArray(data.users) || !data.users.some((u) => u.role === 'admin')) {
      return res.status(400).json({ error: 'Geçersiz yedek dosyası (admin kullanıcı bulunamadı).' });
    }
    db.replaceAll(data);
    io.emit('force:reload');
    res.json({ ok: true });
  }));

  // ------------------------------------------------------------- generic collections
  function visible(col, item, user) {
    if (COLLECTIONS[col].private && item.private && item.createdBy !== user.id) {
      return Array.isArray(item.sharedWith) && item.sharedWith.includes(user.id);
    }
    return true;
  }
  function broadcastChange(col, action, item, actor) {
    const payload = { col, action, item: action === 'delete' ? { id: item.id, projectId: item.projectId } : item, by: actor };
    if (COLLECTIONS[col].private && item.private) {
      emitToUsers([item.createdBy, ...(item.sharedWith || [])], 'db', payload);
    } else io.emit('db', payload);
  }
  const STRIP = ['id', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy'];
  function sanitizeBody(body) {
    const out = {};
    if (!body || typeof body !== 'object') return out;
    for (const [k, v] of Object.entries(body)) {
      if (STRIP.includes(k) || k.startsWith('_') || k === '__proto__' || k === 'constructor') continue;
      out[k] = v;
    }
    return out;
  }

  app.get('/api/c/:col', auth, (req, res) => {
    const col = req.params.col;
    if (!COLLECTIONS[col]) return res.status(404).json({ error: 'Bilinmeyen koleksiyon.' });
    let list = db.col(col).filter((x) => visible(col, x, req.user));
    for (const [k, v] of Object.entries(req.query)) {
      if (k.startsWith('_')) continue;
      list = list.filter((x) => String(x[k]) === String(v));
    }
    res.json(list);
  });

  app.get('/api/c/:col/:id', auth, (req, res) => {
    const col = req.params.col;
    if (!COLLECTIONS[col]) return res.status(404).json({ error: 'Bilinmeyen koleksiyon.' });
    const item = db.get(col, req.params.id);
    if (!item || !visible(col, item, req.user)) return res.status(404).json({ error: 'Bulunamadı.' });
    res.json(item);
  });

  app.post('/api/c/:col', auth, wrap((req, res) => {
    const col = req.params.col;
    const cfg = COLLECTIONS[col];
    if (!cfg) return res.status(404).json({ error: 'Bilinmeyen koleksiyon.' });
    if (!can(req.user, cfg.createPerm || 'create')) return res.status(403).json({ error: 'İçerik oluşturma yetkiniz yok.' });
    const body = sanitizeBody(req.body);
    const item = db.insert(col, { ...body, createdBy: req.user.id, updatedBy: req.user.id });
    if (cfg.title) logActivity(req.user.id, `yeni ${cfg.label.toLowerCase()} oluşturdu`, { kind: col, targetId: item.id, targetTitle: String(item[cfg.title] || '').slice(0, 80), projectId: item.projectId });
    broadcastChange(col, 'create', item, req.user.id);
    if (col === 'tasks' && item.assignee && item.assignee !== req.user.id) notify(item.assignee, `${req.user.displayName} sana bir görev atadı: ${item.title}`, 'tasks', 'check-square');
    if (col === 'bugs' && item.assignee && item.assignee !== req.user.id) notify(item.assignee, `${req.user.displayName} sana bir hata kaydı atadı: ${item.title}`, 'bugs', 'bug');
    if (col === 'announcements') db.find('users', (u) => u.status === 'active' && u.id !== req.user.id).forEach((u) => notify(u.id, `📣 Yeni duyuru: ${item.title}`, 'dashboard', 'megaphone'));
    res.json(item);
  }));

  app.put('/api/c/:col/:id', auth, wrap((req, res) => {
    const col = req.params.col;
    const cfg = COLLECTIONS[col];
    if (!cfg) return res.status(404).json({ error: 'Bilinmeyen koleksiyon.' });
    const item = db.get(col, req.params.id);
    if (!item || !visible(col, item, req.user)) return res.status(404).json({ error: 'Bulunamadı.' });
    const own = item.createdBy === req.user.id;
    const allowed = cfg.editPerm ? can(req.user, cfg.editPerm) || (own && can(req.user, 'create'))
      : own ? can(req.user, 'create') || can(req.user, 'edit_all')
      : can(req.user, 'edit_all') && !(cfg.private && item.private && !(item.sharedWith || []).includes(req.user.id));
    // oylama / tepki gibi hafif etkileşimler için izleyiciler bile 'votes' alanını değiştirebilir
    const body = sanitizeBody(req.body);
    const onlyVotes = Object.keys(body).every((k) => ['votes', 'comments'].includes(k));
    if (!allowed && !(onlyVotes && req.user.status === 'active')) return res.status(403).json({ error: 'Bu öğeyi düzenleme yetkiniz yok.' });
    if (cfg.private && !own) { delete body.private; delete body.sharedWith; }
    const prevAssignee = item.assignee;
    const updated = db.update(col, item.id, { ...body, updatedBy: req.user.id });
    broadcastChange(col, 'update', updated, req.user.id);
    if ((col === 'tasks' || col === 'bugs') && updated.assignee && updated.assignee !== prevAssignee && updated.assignee !== req.user.id) {
      notify(updated.assignee, `${req.user.displayName} sana atadı: ${updated.title}`, col, col === 'tasks' ? 'check-square' : 'bug');
    }
    if (col === 'tasks' && body.status === 'done' && item.status !== 'done') logActivity(req.user.id, 'görevi tamamladı', { kind: col, targetId: item.id, targetTitle: item.title, projectId: item.projectId });
    res.json(updated);
  }));

  app.delete('/api/c/:col/:id', auth, wrap((req, res) => {
    const col = req.params.col;
    const cfg = COLLECTIONS[col];
    if (!cfg) return res.status(404).json({ error: 'Bilinmeyen koleksiyon.' });
    const item = db.get(col, req.params.id);
    if (!item || !visible(col, item, req.user)) return res.status(404).json({ error: 'Bulunamadı.' });
    const own = item.createdBy === req.user.id;
    const allowed = cfg.deletePerm ? can(req.user, cfg.deletePerm) : own || can(req.user, 'delete_all');
    if (!allowed) return res.status(403).json({ error: 'Bu öğeyi silme yetkiniz yok.' });
    db.remove(col, item.id);
    if (col === 'files' && item.storedName) {
      try { fs.unlinkSync(path.join(uploadDir, path.basename(item.storedName))); } catch {}
    }
    if (col === 'projects') {
      // projeye bağlı içerikleri temizle
      Object.entries(COLLECTIONS).forEach(([c, conf]) => { if (conf.scoped) db.removeWhere(c, (x) => x.projectId === item.id); });
    }
    if (cfg.title) logActivity(req.user.id, `${cfg.label.toLowerCase()} sildi`, { kind: col, targetTitle: String(item[cfg.title] || '').slice(0, 80), projectId: item.projectId });
    broadcastChange(col, 'delete', item, req.user.id);
    res.json({ ok: true });
  }));

  // ------------------------------------------------------------- uploads
  const MIME_EXT = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/webm': 'webm',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'application/pdf': 'pdf', 'application/json': 'json',
    'text/plain': 'txt', 'application/zip': 'zip', 'model/gltf-binary': 'glb',
  };
  app.post('/api/upload', auth, wrap((req, res) => {
    if (!can(req.user, 'create')) return res.status(403).json({ error: 'Dosya yükleme yetkiniz yok.' });
    const { name, type, data } = req.body || {};
    if (typeof data !== 'string') return res.status(400).json({ error: 'Dosya verisi eksik.' });
    const b64 = data.includes(',') ? data.split(',')[1] : data;
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > 20 * 1024 * 1024) return res.status(413).json({ error: 'Dosya 20 MB sınırını aşıyor.' });
    const safeName = cleanStr(name, 120).replace(/[\\/:*?"<>|]/g, '_') || 'dosya';
    let ext = MIME_EXT[type] || (safeName.includes('.') ? safeName.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : 'bin');
    if (ext === 'svg' || ext === 'html' || ext === 'htm' || ext === 'js') ext += '.txt'; // betik içeren dosyaları güvenli sun
    const storedName = uid() + '.' + ext;
    fs.writeFileSync(path.join(uploadDir, storedName), buf);
    const rec = {
      name: safeName, type: cleanStr(type, 80) || 'application/octet-stream', size: buf.length,
      storedName, url: '/uploads/' + storedName, folder: cleanStr(req.body.folder, 40) || 'Genel',
      tags: Array.isArray(req.body.tags) ? req.body.tags.slice(0, 10) : [], projectId: req.body.projectId || null,
      hidden: !!req.body.hidden, createdBy: req.user.id, updatedBy: req.user.id,
    };
    const item = db.insert('files', rec);
    if (!rec.hidden) {
      logActivity(req.user.id, 'dosya yükledi', { kind: 'files', targetId: item.id, targetTitle: safeName });
      broadcastChange('files', 'create', item, req.user.id);
    }
    res.json(item);
  }));
  app.use('/uploads', express.static(uploadDir, { maxAge: '7d', setHeaders: (res) => res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'") }));

  // ------------------------------------------------------------- notifications
  app.get('/api/notifications', auth, (req, res) => {
    res.json(db.find('notifications', (n) => n.userId === req.user.id).slice(-100).reverse());
  });
  app.post('/api/notifications/read', auth, (req, res) => {
    db.col('notifications').forEach((n) => { if (n.userId === req.user.id && (!req.body.id || n.id === req.body.id)) n.read = true; });
    db.save();
    res.json({ ok: true });
  });
  app.delete('/api/notifications', auth, (req, res) => {
    db.removeWhere('notifications', (n) => n.userId === req.user.id);
    res.json({ ok: true });
  });

  app.get('/api/activity', auth, (req, res) => {
    const list = db.col('activity').filter((a) => a.kind !== 'auth' && a.kind !== 'admin');
    res.json(list.slice(-60).reverse());
  });

  // ------------------------------------------------------------- search
  app.get('/api/search', auth, (req, res) => {
    const q = cleanStr(req.query.q, 80).toLocaleLowerCase('tr');
    if (q.length < 2) return res.json([]);
    const results = [];
    for (const [col, cfg] of Object.entries(COLLECTIONS)) {
      if (!cfg.title) continue;
      for (const item of db.col(col)) {
        if (!visible(col, item, req.user) || item.hidden) continue;
        const hay = [item[cfg.title], item.content, item.description, item.text, item.desc, item.tags && item.tags.join(' ')].filter(Boolean).join(' ').toLocaleLowerCase('tr');
        if (hay.includes(q)) results.push({ col, id: item.id, title: String(item[cfg.title] || '(adsız)').slice(0, 100), label: cfg.label, projectId: item.projectId });
        if (results.length > 60) break;
      }
    }
    for (const u of db.col('users')) {
      if (u.status === 'active' && (u.displayName + ' ' + u.username).toLocaleLowerCase('tr').includes(q)) results.push({ col: 'users', id: u.id, title: u.displayName, label: 'Kişi' });
    }
    const rooms = db.col('rooms').filter((r) => roomVisible(r, req.user) && r.name && r.name.toLocaleLowerCase('tr').includes(q));
    rooms.forEach((r) => results.push({ col: 'rooms', id: r.id, title: '#' + r.name, label: 'Sohbet Odası' }));
    res.json(results.slice(0, 50));
  });

  // ------------------------------------------------------------- chat
  function roomVisible(room, user) {
    if (room.type === 'channel') return true;
    return Array.isArray(room.members) && room.members.includes(user.id);
  }
  function roomTargets(room) {
    if (room.type === 'channel') return null; // herkes
    return room.members || [];
  }
  function emitRoom(room, event, payload) {
    const t = roomTargets(room);
    if (!t) io.emit(event, payload);
    else emitToUsers(t, event, payload);
  }

  app.get('/api/rooms', auth, (req, res) => {
    const rooms = db.col('rooms').filter((r) => roomVisible(r, req.user));
    const reads = (req.user.prefs && req.user.prefs.roomReads) || {};
    res.json(rooms.map((r) => {
      const msgs = db.col('messages').filter((m) => m.roomId === r.id);
      const last = msgs[msgs.length - 1];
      const unread = msgs.filter((m) => m.createdAt > (reads[r.id] || 0) && m.userId !== req.user.id).length;
      return { ...r, lastMessage: last ? { text: last.text, userId: last.userId, createdAt: last.createdAt } : null, unread };
    }));
  });

  app.post('/api/rooms', auth, wrap((req, res) => {
    const type = ['channel', 'private', 'dm'].includes(req.body.type) ? req.body.type : 'channel';
    if (type !== 'dm' && !can(req.user, 'manage_rooms') && !can(req.user, 'create')) return res.status(403).json({ error: 'Oda oluşturma yetkiniz yok.' });
    if (type === 'dm') {
      const other = db.get('users', req.body.userId);
      if (!other || other.status !== 'active') return res.status(400).json({ error: 'Kullanıcı bulunamadı.' });
      const existing = db.findOne('rooms', (r) => r.type === 'dm' && r.members.length === 2 && r.members.includes(req.user.id) && r.members.includes(other.id));
      if (existing) return res.json(existing);
      const room = db.insert('rooms', { type, name: '', members: [req.user.id, other.id], createdBy: req.user.id });
      emitToUsers(room.members, 'room:created', room);
      return res.json(room);
    }
    const name = cleanStr(req.body.name, 40).toLowerCase().replace(/\s+/g, '-');
    if (!name) return res.status(400).json({ error: 'Oda adı gerekli.' });
    const members = type === 'private' ? [...new Set([req.user.id, ...(Array.isArray(req.body.members) ? req.body.members : [])])] : [];
    const room = db.insert('rooms', { type, name, topic: cleanStr(req.body.topic, 200), icon: cleanStr(req.body.icon, 8) || '#', members, createdBy: req.user.id });
    logActivity(req.user.id, `#${name} sohbet odasını oluşturdu`, { kind: 'rooms' });
    if (type === 'channel') io.emit('room:created', room); else emitToUsers(members, 'room:created', room);
    res.json(room);
  }));

  app.put('/api/rooms/:id', auth, wrap((req, res) => {
    const room = db.get('rooms', req.params.id);
    if (!room || !roomVisible(room, req.user)) return res.status(404).json({ error: 'Oda bulunamadı.' });
    if (room.createdBy !== req.user.id && !can(req.user, 'manage_rooms')) return res.status(403).json({ error: 'Yetkiniz yok.' });
    const patch = {};
    if (req.body.name !== undefined) patch.name = cleanStr(req.body.name, 40).toLowerCase().replace(/\s+/g, '-') || room.name;
    if (req.body.topic !== undefined) patch.topic = cleanStr(req.body.topic, 200);
    if (Array.isArray(req.body.members) && room.type === 'private') patch.members = [...new Set([room.createdBy, ...req.body.members])];
    const prev = roomTargets(room);
    const nr = db.update('rooms', room.id, patch);
    if (prev) emitToUsers([...prev, ...(nr.members || [])], 'room:updated', nr); else io.emit('room:updated', nr);
    res.json(nr);
  }));

  app.delete('/api/rooms/:id', auth, wrap((req, res) => {
    const room = db.get('rooms', req.params.id);
    if (!room || !roomVisible(room, req.user)) return res.status(404).json({ error: 'Oda bulunamadı.' });
    if (room.createdBy !== req.user.id && !can(req.user, 'manage_rooms')) return res.status(403).json({ error: 'Yetkiniz yok.' });
    if (room.locked) return res.status(400).json({ error: 'Bu oda silinemez.' });
    db.remove('rooms', room.id);
    db.removeWhere('messages', (m) => m.roomId === room.id);
    emitRoom(room, 'room:deleted', { id: room.id });
    res.json({ ok: true });
  }));

  app.get('/api/rooms/:id/messages', auth, (req, res) => {
    const room = db.get('rooms', req.params.id);
    if (!room || !roomVisible(room, req.user)) return res.status(404).json({ error: 'Oda bulunamadı.' });
    const before = Number(req.query.before) || Infinity;
    const limit = Math.min(Number(req.query.limit) || 60, 200);
    const msgs = db.col('messages').filter((m) => m.roomId === room.id && m.createdAt < before);
    res.json(msgs.slice(-limit));
  });

  app.post('/api/rooms/:id/read', auth, (req, res) => {
    const prefs = { ...(req.user.prefs || {}) };
    prefs.roomReads = { ...(prefs.roomReads || {}), [req.params.id]: Date.now() };
    db.update('users', req.user.id, { prefs });
    res.json({ ok: true });
  });

  // ------------------------------------------------------------- static
  const pub = path.join(__dirname, '..', 'public');
  app.use(express.static(pub, { index: 'index.html', maxAge: 0 }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Bulunamadı.' }));
  app.get('*', (req, res) => res.sendFile(path.join(pub, 'index.html')));

  // ------------------------------------------------------------- sockets
  const online = new Map(); // userId -> Set(socketId)
  function presenceList() {
    return [...online.keys()];
  }

  io.use((socket, next) => {
    const user = userFromToken(socket.handshake.auth && socket.handshake.auth.token);
    if (!user) return next(new Error('unauthorized'));
    socket.data.userId = user.id;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const me = () => db.get('users', userId);
    socket.join('user:' + userId);
    if (!online.has(userId)) online.set(userId, new Set());
    online.get(userId).add(socket.id);
    io.emit('presence', presenceList());

    const guard = (fn) => (...args) => {
      const u = me();
      if (!u || u.status !== 'active') { socket.emit('force:logout', 'Oturum sonlandı.'); return socket.disconnect(true); }
      try { fn(u, ...args); } catch (e) { console.error('[socket]', e); }
    };

    socket.on('chat:send', guard((u, data, ack) => {
      const room = db.get('rooms', data && data.roomId);
      if (!room || !roomVisible(room, u)) return ack && ack({ error: 'Oda bulunamadı.' });
      if (room.readonly && !can(u, 'announce')) return ack && ack({ error: 'Bu odaya yalnızca duyuru yetkisi olanlar yazabilir.' });
      const text = typeof data.text === 'string' ? data.text.slice(0, 4000) : '';
      const attachments = Array.isArray(data.attachments) ? data.attachments.slice(0, 6).map((a) => ({ url: cleanStr(a.url, 300), name: cleanStr(a.name, 120), type: cleanStr(a.type, 80) })).filter((a) => a.url.startsWith('/uploads/')) : [];
      if (!text.trim() && !attachments.length) return ack && ack({ error: 'Boş mesaj.' });
      const msg = db.insert('messages', { roomId: room.id, userId: u.id, text, attachments, reactions: {}, replyTo: data.replyTo || null });
      const arr = db.col('messages');
      if (arr.length > 20000) arr.splice(0, arr.length - 20000);
      emitRoom(room, 'chat:message', msg);
      // @bahsetme bildirimleri
      const mentions = (text.match(/@([a-z0-9_.-]{3,24})/gi) || []).map((m) => m.slice(1).toLowerCase());
      if (mentions.length) {
        db.find('users', (x) => x.status === 'active' && x.id !== u.id && (mentions.includes(x.username) || mentions.includes('herkes') || mentions.includes('everyone')))
          .filter((x) => roomVisible(room, x))
          .forEach((x) => notify(x.id, `${u.displayName} senden bahsetti: "${text.slice(0, 80)}"`, 'chat:' + room.id, 'at-sign'));
      }
      if (room.type === 'dm') room.members.filter((id) => id !== u.id).forEach((id) => { if (!online.has(id)) notify(id, `${u.displayName}: ${text.slice(0, 80)}`, 'chat:' + room.id, 'message-circle'); });
      ack && ack({ ok: true, message: msg });
    }));

    socket.on('chat:edit', guard((u, data) => {
      const msg = db.get('messages', data && data.id);
      if (!msg || msg.userId !== u.id) return;
      const room = db.get('rooms', msg.roomId);
      const nm = db.update('messages', msg.id, { text: String(data.text || '').slice(0, 4000), editedAt: Date.now() });
      emitRoom(room, 'chat:updated', nm);
    }));

    socket.on('chat:delete', guard((u, data) => {
      const msg = db.get('messages', data && data.id);
      if (!msg) return;
      if (msg.userId !== u.id && !can(u, 'manage_rooms')) return;
      const room = db.get('rooms', msg.roomId);
      db.remove('messages', msg.id);
      emitRoom(room, 'chat:deleted', { id: msg.id, roomId: msg.roomId });
    }));

    socket.on('chat:react', guard((u, data) => {
      const msg = db.get('messages', data && data.id);
      const emoji = cleanStr(data && data.emoji, 16);
      if (!msg || !emoji) return;
      const room = db.get('rooms', msg.roomId);
      if (!room || !roomVisible(room, u)) return;
      const reactions = { ...(msg.reactions || {}) };
      const list = new Set(reactions[emoji] || []);
      if (list.has(u.id)) list.delete(u.id); else list.add(u.id);
      if (list.size) reactions[emoji] = [...list]; else delete reactions[emoji];
      const nm = db.update('messages', msg.id, { reactions });
      emitRoom(room, 'chat:updated', nm);
    }));

    socket.on('chat:pin', guard((u, data) => {
      const msg = db.get('messages', data && data.id);
      if (!msg) return;
      const room = db.get('rooms', msg.roomId);
      if (!room || !roomVisible(room, u)) return;
      const nm = db.update('messages', msg.id, { pinned: !msg.pinned });
      emitRoom(room, 'chat:updated', nm);
    }));

    socket.on('chat:typing', guard((u, data) => {
      const room = db.get('rooms', data && data.roomId);
      if (!room || !roomVisible(room, u)) return;
      const t = roomTargets(room);
      const payload = { roomId: room.id, userId: u.id };
      if (!t) socket.broadcast.emit('chat:typing', payload);
      else t.filter((id) => id !== u.id).forEach((id) => socket.to('user:' + id).emit('chat:typing', payload));
    }));

    // --- ortak çizim panosu (sunucu yetkili)
    const drawAllowed = (u) => can(u, 'create') || can(u, 'edit_all');
    socket.on('draw:join', guard((u, data) => {
      if (socket.data.board) socket.leave('board:' + socket.data.board);
      socket.data.board = data && data.boardId;
      if (socket.data.board) socket.join('board:' + socket.data.board);
    }));
    socket.on('draw:stroke', guard((u, data) => {
      const board = db.get('drawings', data && data.boardId);
      if (!board || !drawAllowed(u) || !data.stroke) return;
      const stroke = { ...data.stroke, id: data.stroke.id || uid(), userId: u.id };
      board.strokes = board.strokes || [];
      board.strokes.push(stroke);
      if (board.strokes.length > 8000) board.strokes.splice(0, board.strokes.length - 8000);
      board.updatedAt = Date.now();
      board.updatedBy = u.id;
      db.save();
      socket.to('board:' + board.id).emit('draw:stroke', { boardId: board.id, stroke });
    }));
    socket.on('draw:update', guard((u, data) => {
      const board = db.get('drawings', data && data.boardId);
      if (!board || !drawAllowed(u) || !data.stroke) return;
      const i = (board.strokes || []).findIndex((s) => s.id === data.stroke.id);
      if (i === -1) return;
      board.strokes[i] = { ...board.strokes[i], ...data.stroke };
      db.save();
      socket.to('board:' + board.id).emit('draw:update', { boardId: board.id, stroke: board.strokes[i] });
    }));
    socket.on('draw:remove', guard((u, data) => {
      const board = db.get('drawings', data && data.boardId);
      if (!board || !drawAllowed(u)) return;
      const ids = new Set(Array.isArray(data.ids) ? data.ids : []);
      board.strokes = (board.strokes || []).filter((s) => !ids.has(s.id));
      db.save();
      socket.to('board:' + board.id).emit('draw:remove', { boardId: board.id, ids: [...ids] });
    }));
    socket.on('draw:clear', guard((u, data) => {
      const board = db.get('drawings', data && data.boardId);
      if (!board || !(can(u, 'edit_all') || board.createdBy === u.id)) return;
      board.strokes = [];
      db.save();
      io.to('board:' + board.id).emit('draw:clear', { boardId: board.id });
    }));
    socket.on('draw:cursor', guard((u, data) => {
      if (!socket.data.board) return;
      socket.to('board:' + socket.data.board).emit('draw:cursor', { userId: u.id, x: data.x, y: data.y, name: u.displayName, color: u.avatarColor });
    }));

    socket.on('disconnect', () => {
      const set = online.get(userId);
      if (set) {
        set.delete(socket.id);
        if (!set.size) {
          online.delete(userId);
          if (db.get('users', userId)) db.update('users', userId, { lastSeen: Date.now() });
        }
      }
      io.emit('presence', presenceList());
    });
  });

  function start(port = Number(process.env.PORT) || 4321, host = process.env.HOST || '0.0.0.0') {
    return new Promise((resolve, reject) => {
      const tryListen = (p, attemptsLeft) => {
        server.once('error', (err) => {
          if (err.code === 'EADDRINUSE' && attemptsLeft > 0) tryListen(p + 1, attemptsLeft - 1);
          else reject(err);
        });
        server.listen(p, host, () => resolve(server.address().port));
      };
      tryListen(port, 10);
    });
  }

  function stop() {
    db.flush();
    io.close();
    return new Promise((r) => server.close(() => r()));
  }

  process.on('exit', () => db.flush());
  return { app, server, io, db, start, stop };
}

module.exports = { createServer, PERMISSIONS, DEFAULT_ROLES, COLLECTIONS };

if (require.main === module) {
  const s = createServer();
  s.start().then((port) => {
    console.log(`\n  ✦ Ayra Design sunucusu çalışıyor: http://localhost:${port}\n`);
  });
  const shutdown = () => { s.db.flush(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
