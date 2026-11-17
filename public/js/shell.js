/* Ayra Design — uygulama kabuğu: menü, üst bar, bildirimler, komut paleti, soket */
(function () {
  const GROUPS = [
    ['genel', 'Genel'], ['iletisim', 'İletişim'], ['uretim', 'Üretim'], ['tasarim', 'Oyun Tasarımı'],
    ['yaratici', 'Yaratıcı Alan'], ['kaynak', 'Kaynaklar'], ['yonetim', 'Yönetim'],
  ];
  A.unread = { chat: 0, notif: 0, pending: 0 };

  A.buildShell = function () {
    const app = A.$('#app');
    app.classList.remove('hidden');
    if (A.ls.get('collapsed')) app.classList.add('collapsed');
    app.innerHTML = `
      <aside class="sidebar">
        <div class="sb-head"><img src="img/icon.svg" alt=""><div class="brand-txt"><b>AYRA</b><small>design</small></div></div>
        <div class="sb-project" id="projSwitch"></div>
        <nav class="sb-nav" id="nav"></nav>
        <div class="sb-foot">
          <button class="btn ghost icon sm" id="collapseBtn" title="Menüyü daralt">${A.icon('panel-left-close')}</button>
          <button class="btn ghost icon sm" id="themeBtn" title="Temayı değiştir">${A.icon('sun-moon')}</button>
          <button class="btn ghost icon sm" id="logoutBtn" title="Çıkış yap" style="margin-left:auto">${A.icon('log-out')}</button>
        </div>
      </aside>
      <section class="main">
        <header class="topbar">
          <div class="crumbs" id="crumbs"></div>
          <div class="search-trigger" id="searchBtn">${A.icon('search')}<span>Ara veya komut çalıştır...</span><kbd>Ctrl K</kbd></div>
          <div id="timerChip"></div>
          <div class="online-stack" id="onlineStack"></div>
          <button class="btn ghost icon tb-btn" id="notifBtn" title="Bildirimler">${A.icon('bell')}</button>
          <div class="me-btn" id="meBtn"></div>
        </header>
        <div class="view" id="view"></div>
      </section>`;
    A.icons(app);
    A.$('#collapseBtn').onclick = () => { app.classList.toggle('collapsed'); A.ls.set('collapsed', app.classList.contains('collapsed')); };
    A.$('#themeBtn').onclick = cycleTheme;
    A.$('#logoutBtn').onclick = async () => { if (await A.confirm('Oturumu kapatmak istiyor musunuz?', { title: 'Çıkış yap', ok: 'Çıkış yap', danger: false })) A.logout(); };
    A.$('#searchBtn').onclick = openPalette;
    A.$('#notifBtn').onclick = toggleNotifs;
    A.$('#meBtn').onclick = (e) => meMenu(e.currentTarget);
    A.$('#projSwitch').onclick = (e) => projectMenu(e.currentTarget);
    renderNav();
    renderMe();
    renderProject();
    renderOnline();
    A.renderTimerChip && A.renderTimerChip();
  };

  function renderNav() {
    const nav = A.$('#nav');
    if (!nav) return;
    const cur = A.current ? A.current.id : '';
    nav.innerHTML = GROUPS.map(([g, label]) => {
      const items = A.order.map((id) => A.modules[id]).filter((m) => m.group === g && (!m.perm || A.can(m.perm)));
      if (!items.length) return '';
      return `<div class="sb-group">${label}</div>` + items.map((m) => {
        const badge = m.id === 'chat' && A.unread.chat ? `<span class="badge count">${A.unread.chat}</span>` : m.id === 'admin' && A.unread.pending ? `<span class="badge count">${A.unread.pending}</span>` : '';
        return `<button class="nav-item ${cur === m.id ? 'on' : ''}" data-go="${m.id}" title="${A.esc(m.title)}">${A.icon(m.icon)}<span>${A.esc(m.title)}</span>${badge}</button>`;
      }).join('');
    }).join('');
    A.icons(nav);
    A.$$('[data-go]', nav).forEach((b) => (b.onclick = () => A.go(b.dataset.go)));
  }
  A.renderNav = renderNav;

  function renderMe() {
    const u = A.state.user;
    const el = A.$('#meBtn');
    if (!el || !u) return;
    el.innerHTML = `${A.avatar(u, 'sm', true)}<div class="meta"><div class="nm">${A.esc(u.displayName)}</div><div class="rl">${A.esc(A.roleName(u.role))}</div></div>`;
  }
  A.renderMe = renderMe;

  function renderProject() {
    const el = A.$('#projSwitch');
    if (!el) return;
    const p = A.project();
    el.innerHTML = p
      ? `<div class="pico" style="background:${A.esc(p.color || '#9b87f5')}">${A.icon(p.icon || 'gamepad-2')}</div><div class="ptext grow"><div class="plabel">Aktif proje</div><div class="pname">${A.esc(p.name)}</div></div><span class="ptext">${A.icon('chevrons-up-down')}</span>`
      : `<div class="pico" style="background:var(--panel-3)">${A.icon('folder-plus')}</div><div class="ptext grow"><div class="plabel">Proje yok</div><div class="pname">Proje seç / oluştur</div></div>`;
    A.icons(el);
  }
  A.renderProject = renderProject;

  function projectMenu(anchor) {
    const items = [{ head: 'Oyun Projeleri' }];
    A.state.projects.forEach((p) => items.push({ html: `<span class="pico" style="width:20px;height:20px;border-radius:6px;background:${A.esc(p.color || '#9b87f5')};display:inline-block"></span>${A.esc(p.name)} ${p.id === A.state.projectId ? A.icon('check') : ''}`, action: () => A.setProject(p.id) }));
    items.push('-');
    items.push({ icon: 'folder-kanban', label: 'Tüm projeleri yönet', action: () => A.go('projects') });
    A.menu(anchor, items);
  }

  A.setProject = (id) => {
    A.state.projectId = id;
    A.ls.set('project', id);
    renderProject();
    A.emit('project:changed', id);
    if (A.current && A.current.scoped !== false) A.route();
  };

  function renderOnline() {
    const el = A.$('#onlineStack');
    if (!el) return;
    const on = [...A.state.online].map((id) => A.state.users.get(id)).filter(Boolean);
    el.innerHTML = on.slice(0, 5).map((u) => A.avatar(u, 'sm', true)).join('') + (on.length > 5 ? `<span class="avatar sm more" style="background:var(--panel-3);color:var(--text)">+${on.length - 5}</span>` : '');
    el.title = on.length + ' kişi çevrimiçi';
    el.style.cursor = 'pointer';
    el.onclick = () => A.go('team');
  }
  A.renderOnline = renderOnline;

  function cycleTheme() {
    const order = ['dark', 'light', 'midnight'];
    const cur = document.documentElement.dataset.theme || 'dark';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    A.applyTheme(next);
    A.savePrefs({ theme: next });
    A.toast({ dark: 'Koyu tema', light: 'Açık tema', midnight: 'Gece yarısı teması' }[next] + ' etkin', 'info');
  }

  A.applyTheme = (theme, accent) => {
    document.documentElement.dataset.theme = theme || 'dark';
    if (accent) {
      document.documentElement.style.setProperty('--accent', accent);
      document.documentElement.style.setProperty('--accent-2', shade(accent, -18));
      document.documentElement.style.setProperty('--accent-soft', hexA(accent, 0.16));
    }
  };
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function shade(hex, p) { const n = parseInt(hex.slice(1), 16); const f = (c) => Math.max(0, Math.min(255, Math.round(c + (p / 100) * 255))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
  A.savePrefs = async (prefs) => {
    try { const r = await A.put('/api/me', { prefs }); A.state.user = r.user; } catch (e) { A.err(e); }
  };

  function meMenu(anchor) {
    const u = A.state.user;
    const pres = (p) => ({ html: `<i class="pres ${p}" style="position:static;display:inline-block;width:10px;height:10px;border-radius:50%;border:0"></i>${A.PRESENCE[p]} ${u.presence === p ? A.icon('check') : ''}`, action: async () => { const r = await A.put('/api/me', { presence: p }); A.state.user = r.user; A.state.users.set(u.id, { ...A.state.users.get(u.id), ...r.user }); renderMe(); renderOnline(); } });
    A.menu(anchor, [
      { head: '@' + u.username },
      pres('online'), pres('busy'), pres('away'), pres('focus'),
      '-',
      { icon: 'circle-user-round', label: 'Profil ve ayarlar', action: () => A.go('profile') },
      ...(A.can('view_admin') ? [{ icon: 'shield-check', label: 'Yönetim paneli', action: () => A.go('admin') }] : []),
      { icon: 'keyboard', label: 'Klavye kısayolları', action: shortcutsHelp },
      '-',
      { icon: 'log-out', label: 'Çıkış yap', danger: true, action: () => A.logout() },
    ], { align: 'right' });
  }

  function shortcutsHelp() {
    const rows = [['Ctrl + K', 'Hızlı arama / komut paleti'], ['Alt + 1..9', 'Menüdeki bölümler arasında geçiş'], ['Ctrl + Z / Ctrl + Y', 'Çizim ve piksel editöründe geri al / yinele'], ['B, E, L, R, O, T', 'Çizim panosunda araçlar (fırça, silgi, çizgi, dikdörtgen, elips, yazı)'], ['Boşluk + sürükle', 'Çizim panosunda kaydırma'], ['Enter', 'Sohbette mesaj gönder (Shift+Enter yeni satır)'], ['Esc', 'Pencereleri kapat']];
    A.modal({ title: 'Klavye Kısayolları', icon: 'keyboard', body: `<table class="table">${rows.map(([k, v]) => `<tr><td><kbd>${k}</kbd></td><td>${v}</td></tr>`).join('')}</table>` });
  }

  // ---------------------------------------------------------------- notifications
  let notifEl = null;
  async function toggleNotifs() {
    if (notifEl) { notifEl.remove(); notifEl = null; return; }
    notifEl = A.h(`<div class="notif-panel"><div class="notif-head"><b>Bildirimler</b><span class="spacer"></span><button class="btn xs" id="nRead">${A.icon('check')} Tümünü okundu say</button><button class="btn xs ghost" id="nClear" title="Temizle">${A.icon('trash-2')}</button></div><div class="notif-list"><div class="loader"></div></div></div>`);
    document.body.appendChild(notifEl);
    A.icons(notifEl);
    const close = (e) => { if (notifEl && !notifEl.contains(e.target) && !A.$('#notifBtn').contains(e.target)) { notifEl.remove(); notifEl = null; document.removeEventListener('mousedown', close); } };
    setTimeout(() => document.addEventListener('mousedown', close));
    const list = await A.get('/api/notifications');
    if (!notifEl) return;
    const box = A.$('.notif-list', notifEl);
    box.innerHTML = list.length ? list.map((n) => `<div class="notif ${n.read ? '' : 'unread'}" data-link="${A.esc(n.link || '')}" data-id="${n.id}"><div class="ni">${A.icon(n.icon || 'bell')}</div><div><div class="nt">${A.esc(n.text)}</div><div class="nd">${A.timeAgo(n.createdAt)}</div></div></div>`).join('') : A.emptyState('bell', 'Bildirim yok', 'Her şey yolunda görünüyor ✨');
    A.icons(box);
    A.$$('.notif', box).forEach((n) => (n.onclick = () => { if (n.dataset.link) A.go(n.dataset.link.replace(':', '/')); A.post('/api/notifications/read', { id: n.dataset.id }); notifEl && notifEl.remove(); notifEl = null; refreshNotifCount(); }));
    A.$('#nRead', notifEl).onclick = async () => { await A.post('/api/notifications/read'); A.$$('.notif', box).forEach((n) => n.classList.remove('unread')); refreshNotifCount(); };
    A.$('#nClear', notifEl).onclick = async () => { await A.del('/api/notifications'); box.innerHTML = A.emptyState('bell', 'Bildirim yok'); A.icons(box); refreshNotifCount(); };
  }
  async function refreshNotifCount() {
    try {
      const list = await A.get('/api/notifications');
      A.unread.notif = list.filter((n) => !n.read).length;
      const btn = A.$('#notifBtn');
      if (!btn) return;
      const d = A.$('.dot', btn);
      if (d) d.remove();
      if (A.unread.notif) btn.insertAdjacentHTML('beforeend', `<span class="dot">${A.unread.notif > 9 ? '9+' : A.unread.notif}</span>`);
    } catch {}
  }
  A.refreshNotifCount = refreshNotifCount;

  async function refreshPending() {
    if (!A.can('manage_users')) return;
    try {
      const users = await A.get('/api/users');
      users.forEach((u) => A.state.users.set(u.id, u));
      A.unread.pending = users.filter((u) => u.status === 'pending').length;
      renderNav();
    } catch {}
  }
  A.refreshPending = refreshPending;

  async function refreshChatUnread() {
    try {
      const rooms = await A.get('/api/rooms');
      A.unread.chat = rooms.reduce((s, r) => s + (r.unread || 0), 0);
      renderNav();
    } catch {}
  }
  A.refreshChatUnread = refreshChatUnread;

  // ---------------------------------------------------------------- command palette
  let cmdkOpen = false;
  function openPalette() {
    if (cmdkOpen) return;
    cmdkOpen = true;
    const el = A.h(`<div class="cmdk"><div class="cmdk-box"><div class="cmdk-input">${A.icon('search')}<input placeholder="Bölüm, görev, not, kişi ara..." /><kbd>Esc</kbd></div><div class="cmdk-list"></div></div></div>`);
    document.body.appendChild(el);
    A.icons(el);
    const input = A.$('input', el), list = A.$('.cmdk-list', el);
    let items = [], sel = 0;
    const close = () => { el.remove(); cmdkOpen = false; };
    el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
    const nav = A.order.map((id) => A.modules[id]).filter((m) => !m.perm || A.can(m.perm)).map((m) => ({ icon: m.icon, title: m.title, label: 'Bölüm', run: () => A.go(m.id) }));
    const actions = [
      { icon: 'plus', title: 'Yeni görev oluştur', label: 'Eylem', run: () => { A.go('tasks'); setTimeout(() => A.emit('tasks:new'), 300); } },
      { icon: 'notebook-pen', title: 'Yeni not oluştur', label: 'Eylem', run: () => { A.go('notes'); setTimeout(() => A.emit('notes:new'), 300); } },
      { icon: 'bug', title: 'Hata bildir', label: 'Eylem', run: () => { A.go('bugs'); setTimeout(() => A.emit('bugs:new'), 300); } },
      { icon: 'sun-moon', title: 'Temayı değiştir', label: 'Eylem', run: cycleTheme },
      { icon: 'timer', title: 'Pomodoro zamanlayıcıyı başlat', label: 'Eylem', run: () => A.startPomodoro && A.startPomodoro() },
      { icon: 'log-out', title: 'Çıkış yap', label: 'Eylem', run: () => A.logout() },
    ];
    const draw = (remote = []) => {
      const q = input.value.trim().toLocaleLowerCase('tr');
      const f = (x) => !q || x.title.toLocaleLowerCase('tr').includes(q);
      items = [...nav.filter(f), ...actions.filter(f), ...remote];
      sel = Math.min(sel, Math.max(0, items.length - 1));
      list.innerHTML = items.length ? items.map((it, i) => `<div class="cmdk-item ${i === sel ? 'sel' : ''}" data-i="${i}">${A.icon(it.icon)}<span>${A.esc(it.title)}</span><span class="lbl">${A.esc(it.label)}</span></div>`).join('') : '<div class="empty small">Sonuç bulunamadı</div>';
      A.icons(list);
      A.$$('.cmdk-item', list).forEach((d) => { d.onclick = () => { close(); items[d.dataset.i].run(); }; d.onmousemove = () => { if (sel !== +d.dataset.i) { sel = +d.dataset.i; A.$$('.cmdk-item', list).forEach((x, j) => x.classList.toggle('sel', j === sel)); } }; });
    };
    const ICON = { tasks: 'check-square', notes: 'sticky-note', gdd: 'book-open', bugs: 'bug', entities: 'swords', levels: 'map', dialogues: 'git-branch', events: 'calendar-days', ideas: 'lightbulb', files: 'folder', drawings: 'pen-tool', pixelart: 'grid-3x3', users: 'user', rooms: 'hash', wiki: 'library', projects: 'folder-kanban', announcements: 'megaphone', playtests: 'flask-conical', palettes: 'palette', sounds: 'music' };
    const ROUTE = { tasks: 'tasks', notes: 'notes', gdd: 'gdd', bugs: 'bugs', entities: 'entities', levels: 'levels', dialogues: 'dialogues', events: 'calendar', ideas: 'ideas', files: 'files', drawings: 'draw', pixelart: 'pixel', users: 'team', rooms: 'chat', wiki: 'wiki', projects: 'projects', announcements: 'dashboard', playtests: 'playtests', palettes: 'tools', sounds: 'files' };
    const search = A.debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) return draw();
      try {
        const res = await A.get('/api/search?q=' + encodeURIComponent(q));
        draw(res.map((r) => ({
          icon: ICON[r.col] || 'file', title: r.title, label: r.label,
          run: () => { if (r.projectId && r.projectId !== A.state.projectId) A.setProject(r.projectId); A.go((ROUTE[r.col] || 'dashboard') + '/' + r.id); },
        })));
      } catch { draw(); }
    }, 220);
    input.oninput = () => { sel = 0; draw(); search(); };
    input.onkeydown = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); draw(items.slice(nav.length + actions.length)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(items.slice(nav.length + actions.length)); }
      else if (e.key === 'Enter' && items[sel]) { close(); items[sel].run(); }
    };
    draw();
    input.focus();
  }
  A.openPalette = openPalette;

  document.addEventListener('keydown', (e) => {
    if (!A.state.user) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
    if (e.altKey && /^[1-9]$/.test(e.key)) {
      const mods = A.order.map((id) => A.modules[id]).filter((m) => m.group && (!m.perm || A.can(m.perm)));
      const m = mods[Number(e.key) - 1];
      if (m) { e.preventDefault(); A.go(m.id); }
    }
  });

  A.on('route', ({ id }) => {
    const m = A.modules[id];
    const c = A.$('#crumbs');
    if (c && m) { c.innerHTML = `${A.icon(m.icon)}<span>${A.esc(m.title)}</span>`; A.icons(c); }
    renderNav();
    document.title = (m ? m.title + ' · ' : '') + 'Ayra Design';
  });

  // ---------------------------------------------------------------- socket
  A.connectSocket = function () {
    if (A.state.socket) A.state.socket.disconnect();
    const s = io({ auth: { token: A.state.token }, transports: ['websocket', 'polling'] });
    A.state.socket = s;
    let wasDown = false;
    s.on('connect_error', (e) => { if (e.message === 'unauthorized') A.logout('Oturumunuz sona erdi.'); });
    s.on('disconnect', () => { wasDown = true; });
    s.on('connect', () => { if (wasDown) { A.toast('Sunucu bağlantısı yeniden kuruldu', 'ok'); A.emit('reconnect'); } });
    s.on('presence', (ids) => { A.state.online = new Set(ids); renderOnline(); A.emit('presence'); });
    s.on('user:updated', (u) => {
      A.state.users.set(u.id, { ...(A.state.users.get(u.id) || {}), ...u });
      if (u.id === A.state.user.id) { Object.assign(A.state.user, u); renderMe(); }
      renderOnline(); A.emit('users');
    });
    s.on('user:removed', ({ id }) => { A.state.users.delete(id); A.emit('users'); });
    s.on('db', (p) => {
      if (p.col === 'projects') {
        if (p.action === 'create') { if (!A.state.projects.find((x) => x.id === p.item.id)) A.state.projects.push(p.item); if (!A.state.projectId) A.setProject(p.item.id); }
        else if (p.action === 'update') A.state.projects = A.state.projects.map((x) => (x.id === p.item.id ? p.item : x));
        else if (p.action === 'delete') {
          A.state.projects = A.state.projects.filter((x) => x.id !== p.item.id);
          if (A.state.projectId === p.item.id) { A.state.projectId = A.state.projects[0] ? A.state.projects[0].id : null; A.ls.set('project', A.state.projectId); }
        }
        renderProject();
      }
      A.emit('db:' + p.col, p);
      A.emit('db', p);
    });
    s.on('notification', (n) => {
      A.toast(n.text, 'info', 'Bildirim');
      refreshNotifCount();
      const btn = A.$('#notifBtn');
      if (btn) btn.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(18deg)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 600 });
      if (window.ayraDesktop && document.hidden) window.ayraDesktop.notify('Ayra Design', n.text);
    });
    s.on('activity', (a) => A.emit('activity', a));
    s.on('pending:changed', () => { refreshPending(); A.emit('pending:changed'); });
    s.on('roles:changed', async () => { const me = await A.get('/api/me'); A.state.perms = me.perms; A.state.roles = me.roles; renderNav(); renderMe(); });
    s.on('settings:changed', (st) => { A.state.settings = st; });
    s.on('force:logout', (msg) => A.logout(msg || true));
    s.on('force:reload', () => location.reload());
    ['chat:message', 'chat:updated', 'chat:deleted', 'chat:typing', 'room:created', 'room:updated', 'room:deleted', 'draw:stroke', 'draw:update', 'draw:remove', 'draw:clear', 'draw:cursor'].forEach((ev) => s.on(ev, (d) => A.emit(ev, d)));
    s.on('chat:message', (m) => {
      if (m.userId === A.state.user.id) return;
      const inRoom = A.current && A.current.id === 'chat' && A.chatRoomId === m.roomId && !document.hidden;
      if (!inRoom) {
        A.unread.chat++;
        renderNav();
        A.sound('msg');
        if (window.ayraDesktop && document.hidden) window.ayraDesktop.notify(A.user(m.userId).displayName, m.text || 'Dosya gönderdi');
      }
    });
    s.on('room:created', () => A.emit('rooms'));
  };
})();
