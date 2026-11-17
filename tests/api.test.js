// Ayra Design — API entegrasyon testleri
// Çalıştırma: npm test
const assert = require('assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { createServer } = require('../server');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ayra-test-'));
let base, srv;
let passed = 0, failed = 0;

async function req(method, url, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(base + url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
}
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✔', name); } catch (e) { failed++; console.log('  ✘', name, '\n     ', e.message); }
}

(async () => {
  srv = createServer({ dataDir });
  const port = await srv.start(0, '127.0.0.1');
  base = 'http://127.0.0.1:' + port;
  console.log('\nAyra Design API testleri (' + base + ')\n');

  let admin, member, viewer, memberId, viewerId, projectId;

  await test('sunucu durumu', async () => {
    const r = await req('GET', '/api/status');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.data.registrationOpen, true);
  });

  await test('admin girişi (varsayılan hesap)', async () => {
    const r = await req('POST', '/api/auth/login', { username: 'admin', password: 'Ayra2026!' });
    assert.strictEqual(r.status, 200, JSON.stringify(r.data));
    assert.ok(r.data.token);
    assert.strictEqual(r.data.user.role, 'admin');
    assert.ok(r.data.perms.includes('manage_users') && r.data.perms.includes('manage_system'));
    admin = r.data.token;
  });

  await test('yanlış şifre reddedilir', async () => {
    const r = await req('POST', '/api/auth/login', { username: 'admin', password: 'yanlis' });
    assert.strictEqual(r.status, 401);
  });

  await test('kayıt -> onay bekliyor', async () => {
    const r = await req('POST', '/api/auth/register', { username: 'zeynep', password: 'sifre123', displayName: 'Zeynep', title: 'Programcı', note: 'Merhaba!' });
    assert.strictEqual(r.status, 200);
    const l = await req('POST', '/api/auth/login', { username: 'zeynep', password: 'sifre123' });
    assert.strictEqual(l.status, 403);
    assert.strictEqual(l.data.code, 'pending');
  });

  await test('aynı kullanıcı adı ikinci kez alınamaz', async () => {
    const r = await req('POST', '/api/auth/register', { username: 'zeynep', password: 'baska123' });
    assert.strictEqual(r.status, 409);
  });

  await test('admin bekleyen başvuruyu görür ve bildirimi alır', async () => {
    const r = await req('GET', '/api/users', undefined, admin);
    const z = r.data.find((u) => u.username === 'zeynep');
    assert.ok(z && z.status === 'pending');
    assert.strictEqual(z.signupNote, 'Merhaba!');
    memberId = z.id;
    const n = await req('GET', '/api/notifications', undefined, admin);
    assert.ok(n.data.some((x) => x.text.includes('zeynep')));
  });

  await test('onaylanmamış kullanıcı onay veremez / admin uç noktalarına erişemez', async () => {
    const r = await req('POST', `/api/admin/users/${memberId}/approve`, {});
    assert.strictEqual(r.status, 401);
  });

  await test('admin onaylar -> kullanıcı giriş yapabilir', async () => {
    const a = await req('POST', `/api/admin/users/${memberId}/approve`, { role: 'member' }, admin);
    assert.strictEqual(a.status, 200);
    const l = await req('POST', '/api/auth/login', { username: 'zeynep', password: 'sifre123' });
    assert.strictEqual(l.status, 200);
    assert.strictEqual(l.data.user.role, 'member');
    member = l.data.token;
  });

  await test('üye proje oluşturamaz, admin oluşturabilir', async () => {
    const m = await req('POST', '/api/c/projects', { name: 'Hack' }, member);
    assert.strictEqual(m.status, 403);
    const a = await req('POST', '/api/c/projects', { name: 'Test Projesi' }, admin);
    assert.strictEqual(a.status, 200);
    projectId = a.data.id;
  });

  await test('üye görev oluşturur ve günceller', async () => {
    const c = await req('POST', '/api/c/tasks', { projectId, title: 'Zıplama', status: 'todo' }, member);
    assert.strictEqual(c.status, 200);
    assert.strictEqual(c.data.createdBy, memberId);
    const u = await req('PUT', '/api/c/tasks/' + c.data.id, { status: 'done', createdBy: 'hile' }, member);
    assert.strictEqual(u.data.status, 'done');
    assert.strictEqual(u.data.createdBy, memberId, 'createdBy değiştirilememeli');
  });

  await test('izleyici rolü içerik oluşturamaz', async () => {
    const r = await req('POST', '/api/admin/users', { username: 'izleyici', password: 'sifre123', displayName: 'İzleyici', role: 'viewer' }, admin);
    assert.strictEqual(r.status, 200);
    viewerId = r.data.id;
    const l = await req('POST', '/api/auth/login', { username: 'izleyici', password: 'sifre123' });
    viewer = l.data.token;
    const c = await req('POST', '/api/c/tasks', { projectId, title: 'x' }, viewer);
    assert.strictEqual(c.status, 403);
  });

  await test('izleyici fikirlere oy verebilir ama metni değiştiremez', async () => {
    const i = await req('POST', '/api/c/ideas', { projectId, text: 'Fikir', votes: [] }, admin);
    const v = await req('PUT', '/api/c/ideas/' + i.data.id, { votes: [viewerId] }, viewer);
    assert.strictEqual(v.status, 200);
    const t = await req('PUT', '/api/c/ideas/' + i.data.id, { text: 'değişti' }, viewer);
    assert.strictEqual(t.status, 403);
  });

  await test('özel notlar başkalarına görünmez', async () => {
    const n = await req('POST', '/api/c/notes', { title: 'Gizli', content: 'sır', private: true }, member);
    const a = await req('GET', '/api/c/notes', undefined, admin);
    assert.ok(!a.data.some((x) => x.id === n.data.id), 'admin bile özel notu görmemeli');
    const g = await req('GET', '/api/c/notes/' + n.data.id, undefined, admin);
    assert.strictEqual(g.status, 404);
    const s = await req('POST', '/api/c/notes', { title: 'Paylaşılan', content: 'herkes', private: false }, member);
    const a2 = await req('GET', '/api/c/notes', undefined, admin);
    assert.ok(a2.data.some((x) => x.id === s.data.id));
  });

  await test('üye başkasının görevini silemez, admin silebilir', async () => {
    const c = await req('POST', '/api/c/tasks', { projectId, title: 'Admin görevi' }, admin);
    const d = await req('DELETE', '/api/c/tasks/' + c.data.id, undefined, member);
    assert.strictEqual(d.status, 403);
    const d2 = await req('DELETE', '/api/c/tasks/' + c.data.id, undefined, admin);
    assert.strictEqual(d2.status, 200);
  });

  await test('DM odaları yalnızca üyelerine görünür', async () => {
    const r = await req('POST', '/api/rooms', { type: 'dm', userId: memberId }, admin);
    assert.strictEqual(r.status, 200);
    const v = await req('GET', '/api/rooms', undefined, viewer);
    assert.ok(!v.data.some((x) => x.id === r.data.id));
    const m = await req('GET', '/api/rooms', undefined, member);
    assert.ok(m.data.some((x) => x.id === r.data.id));
    const msgs = await req('GET', `/api/rooms/${r.data.id}/messages`, undefined, viewer);
    assert.strictEqual(msgs.status, 404);
  });

  await test('dosya yükleme ve indirme', async () => {
    const data = Buffer.from('merhaba ayra').toString('base64');
    const u = await req('POST', '/api/upload', { name: 'test.txt', type: 'text/plain', data }, member);
    assert.strictEqual(u.status, 200);
    const f = await fetch(base + u.data.url);
    assert.strictEqual(await f.text(), 'merhaba ayra');
  });

  await test('arama çalışır', async () => {
    const r = await req('GET', '/api/search?q=zıplama', undefined, admin);
    assert.ok(r.data.some((x) => x.col === 'tasks'));
  });

  await test('rol yetkileri düzenlenebilir (yalnızca admin)', async () => {
    const roles = (await req('GET', '/api/admin/roles', undefined, admin)).data.roles;
    roles.viewer.perms = ['create'];
    const m = await req('PUT', '/api/admin/roles', { roles }, member);
    assert.strictEqual(m.status, 403);
    const a = await req('PUT', '/api/admin/roles', { roles }, admin);
    assert.strictEqual(a.status, 200);
    const c = await req('POST', '/api/c/tasks', { projectId, title: 'artık olur' }, viewer);
    assert.strictEqual(c.status, 200);
  });

  await test('kayıtlar kapatılabilir', async () => {
    await req('PUT', '/api/admin/settings', { registrationOpen: false }, admin);
    const r = await req('POST', '/api/auth/register', { username: 'yeni', password: 'sifre123' });
    assert.strictEqual(r.status, 403);
    await req('PUT', '/api/admin/settings', { registrationOpen: true }, admin);
  });

  await test('devre dışı bırakılan kullanıcının oturumu düşer', async () => {
    await req('PUT', '/api/admin/users/' + viewerId, { status: 'disabled' }, admin);
    const r = await req('GET', '/api/me', undefined, viewer);
    assert.strictEqual(r.status, 401);
    const l = await req('POST', '/api/auth/login', { username: 'izleyici', password: 'sifre123' });
    assert.strictEqual(l.data.code, 'disabled');
  });

  await test('şifre sıfırlama', async () => {
    const r = await req('POST', `/api/admin/users/${memberId}/reset-password`, { password: 'yeniSifre1' }, admin);
    assert.strictEqual(r.status, 200);
    const old = await req('GET', '/api/me', undefined, member);
    assert.strictEqual(old.status, 401);
    const l = await req('POST', '/api/auth/login', { username: 'zeynep', password: 'yeniSifre1' });
    assert.strictEqual(l.status, 200);
    member = l.data.token;
  });

  await test('üye admin uç noktalarına erişemez', async () => {
    const r = await req('GET', '/api/admin/overview', undefined, member);
    assert.strictEqual(r.status, 403);
    const d = await req('DELETE', '/api/admin/users/' + viewerId, undefined, member);
    assert.strictEqual(d.status, 403);
  });

  await test('son admin yetkisini düşüremez / kendini silemez', async () => {
    const me = (await req('GET', '/api/me', undefined, admin)).data.user;
    const r = await req('PUT', '/api/admin/users/' + me.id, { role: 'member' }, admin);
    assert.strictEqual(r.status, 400);
    const d = await req('DELETE', '/api/admin/users/' + me.id, undefined, admin);
    assert.strictEqual(d.status, 400);
  });

  await test('proje silinince bağlı içerik temizlenir', async () => {
    await req('DELETE', '/api/c/projects/' + projectId, undefined, admin);
    const t = await req('GET', '/api/c/tasks?projectId=' + projectId, undefined, admin);
    assert.strictEqual(t.data.length, 0);
  });

  await test('veriler diske kaydedilir', async () => {
    srv.db.flush();
    const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'ayra-db.json'), 'utf8'));
    assert.ok(raw.users.some((u) => u.username === 'zeynep'));
    assert.ok(!JSON.stringify(raw.users).includes('sifre123'), 'şifreler düz metin saklanmamalı');
  });

  console.log(`\n${passed} başarılı, ${failed} başarısız\n`);
  await srv.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
})();
