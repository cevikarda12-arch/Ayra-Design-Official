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
        <div class="sb-head"><span class="logo-mark sb-mark"></span><span class="logo-word brand-txt" role="img" aria-label="Ayra Design"></span></div>
        <div class="sb-project" id="projSwitch"></div>
        <nav class="sb-nav" id="nav"></nav>
        <div class="sb-foot">
          <button class="btn ghost icon sm" id="collapseBtn" title="Menüyü daralt">${A.icon('panel-left-close')}</button>
          <button class="btn ghost icon sm" id="themeBtn" title="Temayı değiştir">${A.icon('sun-moon')}</button>
          <button class="btn ghost icon sm" id="navEditBtn" title="Menüyü düzenle">${A.icon('sliders-horizontal')}</button>
          <button class="btn ghost icon sm" id="logoutBtn" title="Çıkış yap" style="margin-left:auto">${A.icon('log-out')}</button>
        </div>
      </aside>
      <section class="main">
        <header class="topbar">
          <button class="btn ghost icon mob-only" id="menuBtn" title="Menü">${A.icon('menu')}</button>
          <div class="crumbs" id="crumbs"></div>
          <div class="search-trigger" id="searchBtn">${A.icon('search')}<span>Ara veya komut çalıştır...</span><kbd>Ctrl K</kbd></div>
          <div id="timerChip"></div>
          <div id="updChip"></div>
          <div class="online-stack" id="onlineStack"></div>
          <button class="btn ghost icon tb-btn" id="focusBtn" title="Odak modu (Ctrl + .)">${A.icon('focus')}</button>
          <button class="btn ghost icon tb-btn" id="notifBtn" title="Bildirimler">${A.icon('bell')}</button>
          <div class="me-btn" id="meBtn"></div>
        </header>
        <div class="conn-bar hidden" id="connBar">${A.icon('wifi')} Sunucu bağlantısı koptu, yeniden bağlanılıyor...</div>
        <div class="view" id="view"></div>
      </section>
      <div class="drawer-back" id="drawerBack"></div>
      <nav class="bottom-nav" id="bottomNav"></nav>
      <button class="focus-exit" id="focusExit" title="Odak modundan çık (Esc)">${A.icon('minimize-2')} Odak modu · çıkmak için Esc</button>`;
    A.icons(app);
    A.$('#collapseBtn').onclick = () => { app.classList.toggle('collapsed'); A.ls.set('collapsed', app.classList.contains('collapsed')); };
    A.$('#themeBtn').onclick = cycleTheme;
    A.$('#navEditBtn').onclick = navEditor;
    A.$('#focusBtn').onclick = () => A.toggleFocus();
    A.$('#focusExit').onclick = () => A.toggleFocus(false);
    A.$('#menuBtn').onclick = () => A.toggleDrawer();
    A.$('#drawerBack').onclick = () => A.toggleDrawer(false);
    renderBottomNav();
    renderDnd();
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
    A.renderUpdateChip();
    A.syncTitleBar();
  };

  // ---------------------------------------------------------------- masaüstü güncelleme durumu
  A.updateState = { state: 'idle' };
  A.renderUpdateChip = () => {
    const el = A.$('#updChip');
    if (!el) return;
    const u = A.updateState;
    if (u.state === 'downloading') el.innerHTML = `<button class="btn sm upd-chip" title="Yeni sürüm indiriliyor">${A.icon('download')}<span>v${A.esc(u.version || '')} · %${u.percent || 0}</span></button>`;
    else if (u.state === 'downloaded') el.innerHTML = `<button class="btn sm primary upd-chip ready" id="updGo" title="Yeniden başlat ve güncelle">${A.icon('refresh-cw')}<span>Güncelle</span></button>`;
    else el.innerHTML = '';
    A.icons(el);
    const go = A.$('#updGo', el);
    if (go) go.onclick = async () => { if (await A.confirm(`Ayra Design v${u.version} kurulacak ve uygulama yeniden başlayacak. Kaydedilmemiş bir işiniz yoksa devam edin.`, { title: 'Güncelleme hazır', ok: 'Yeniden başlat', danger: false })) window.ayraDesktop.installUpdate(); };
  };
  if (window.ayraDesktop && window.ayraDesktop.onUpdate) {
    window.ayraDesktop.onUpdate((st) => {
      const prev = A.updateState.state;
      A.updateState = st;
      A.renderUpdateChip();
      A.emit('update', st);
      if (st.state === 'downloaded' && prev !== 'downloaded') A.toast(`Yeni sürüm v${st.version} hazır! Üst bardaki “Güncelle” düğmesiyle kurabilirsiniz.`, 'ok', 'Güncelleme');
    });
    window.ayraDesktop.appInfo().then((i) => { A.appInfo = i; if (i.update) { A.updateState = i.update; A.renderUpdateChip(); } }).catch(() => {});
  }

  const PINNED = ['dashboard', 'profile'];
  A.isDnd = () => { const u = A.state.user || {}; return !!((u.prefs || {}).dnd || u.presence === 'focus'); };
  function renderNav() {
    const nav = A.$('#nav');
    if (!nav) return;
    const cur = A.current ? A.current.id : '';
    const prefs = (A.state.user && A.state.user.prefs) || {};
    const hidden = new Set((prefs.navHidden || []).filter((id) => !PINNED.includes(id)));
    const favs = (prefs.navFav || []).filter((id) => A.modules[id] && !hidden.has(id));
    const folded = new Set(A.ls.get('navFolded', ['yonetim']));
    const ok = (m) => m && (!m.perm || A.can(m.perm)) && !hidden.has(m.id);
    let navIdx = 0;
    const item = (m) => {
      navIdx++;
      const badge = m.id === 'chat' && A.unread.chat ? `<span class="badge count">${A.unread.chat}</span>` : m.id === 'admin' && A.unread.pending ? `<span class="badge count">${A.unread.pending}</span>` : '';
      return `<button class="nav-item ${cur === m.id ? 'on' : ''}" style="--i:${navIdx}" data-go="${m.id}" title="${A.esc(m.title)}">${A.icon(m.icon)}<span>${A.esc(m.title)}</span>${badge}</button>`;
    };
    const group = (key, label, items) => {
      if (!items.length) return '';
      const isFolded = folded.has(key) && !items.some((m) => m.id === cur);
      const badgeSum = isFolded ? items.reduce((s, m) => s + (m.id === 'chat' ? A.unread.chat : m.id === 'admin' ? A.unread.pending : 0), 0) : 0;
      return `<div class="sb-group ${isFolded ? 'folded' : ''}" data-fold="${key}"><span>${label}</span>${badgeSum ? `<i class="fold-dot"></i>` : ''}${A.icon('chevron-down')}</div><div class="sb-items ${isFolded ? 'folded' : ''}">${items.map(item).join('')}</div>`;
    };
    let html = favs.length ? group('fav', '★ Sık kullanılanlar', favs.map((id) => A.modules[id]).filter(ok)) : '';
    html += GROUPS.map(([g, label]) => group(g, label, A.order.map((id) => A.modules[id]).filter((m) => m.group === g && ok(m) && !favs.includes(m.id)))).join('');
    nav.innerHTML = html;
    A.icons(nav);
    A.$$('[data-go]', nav).forEach((b) => {
      b.onclick = () => { A.go(b.dataset.go); A.toggleDrawer(false); };
      b.oncontextmenu = (e) => { e.preventDefault(); navItemMenu(b.dataset.go, e); };
    });
    A.$$('[data-fold]', nav).forEach((g) => (g.onclick = () => {
      const f = new Set(A.ls.get('navFolded', ['yonetim']));
      f.has(g.dataset.fold) ? f.delete(g.dataset.fold) : f.add(g.dataset.fold);
      A.ls.set('navFolded', [...f]);
      renderNav();
    }));
    renderBottomNav();
  }
  function navItemMenu(id, e) {
    const prefs = A.state.user.prefs || {};
    const fav = (prefs.navFav || []).includes(id);
    A.menu({ x: e.clientX, y: e.clientY }, [
      { head: A.modules[id].title },
      { icon: 'star', label: fav ? 'Sık kullanılanlardan çıkar' : 'Sık kullanılanlara ekle', action: () => saveNav({ navFav: fav ? prefs.navFav.filter((x) => x !== id) : [...(prefs.navFav || []), id] }) },
      ...(PINNED.includes(id) ? [] : [{ icon: 'eye-off', label: 'Menüden gizle', action: () => { saveNav({ navHidden: [...(prefs.navHidden || []), id] }); A.toast(`“${A.modules[id].title}” gizlendi. Geri getirmek için menünün altındaki ayar simgesini kullanın.`, 'info'); } }] ),
      '-',
      { icon: 'sliders-horizontal', label: 'Menüyü düzenle...', action: navEditor },
    ]);
  }
  async function saveNav(patch) { await A.savePrefs(patch); renderNav(); }
  function navEditor() {
    const prefs = A.state.user.prefs || {};
    let hidden = new Set(prefs.navHidden || []), favs = new Set(prefs.navFav || []);
    const mods = A.order.map((id) => A.modules[id]).filter((m) => m.group && (!m.perm || A.can(m.perm)));
    const m = A.modal({
      title: 'Menüyü düzenle', icon: 'sliders-horizontal',
      body: `<p class="small muted" style="margin-top:0">Kullanmadığınız bölümleri gizleyin, sık kullandıklarınızı ★ ile en üste sabitleyin. Gizlenen bölümlere Ctrl+K aramasından yine ulaşabilirsiniz.</p>
        <div class="nav-edit">${GROUPS.map(([g, label]) => { const items = mods.filter((x) => x.group === g); return items.length ? `<div class="label" style="margin:12px 0 6px">${label}</div>` + items.map((x) => `<div class="ne-row"><span class="row grow" style="gap:10px">${A.icon(x.icon)}${A.esc(x.title)}</span><button class="btn xs ghost ne-fav ${favs.has(x.id) ? 'on' : ''}" data-fav="${x.id}" title="Sık kullanılan">★</button>${PINNED.includes(x.id) ? '<span class="small muted" style="width:42px;text-align:center">sabit</span>' : `<label class="switch"><input type="checkbox" data-vis="${x.id}" ${hidden.has(x.id) ? '' : 'checked'}><span></span></label>`}</div>`).join('') : ''; }).join('')}</div>`,
      foot: `<button class="btn ghost" id="neReset">Varsayılan</button><span class="spacer"></span><button class="btn" data-close>Vazgeç</button><button class="btn primary" id="neSave">Kaydet</button>`,
    });
    A.$$('[data-fav]', m.el).forEach((b) => (b.onclick = () => { favs.has(b.dataset.fav) ? favs.delete(b.dataset.fav) : favs.add(b.dataset.fav); b.classList.toggle('on'); }));
    A.$$('[data-vis]', m.el).forEach((c) => (c.onchange = () => (c.checked ? hidden.delete(c.dataset.vis) : hidden.add(c.dataset.vis))));
    A.$('#neReset', m.el).onclick = () => { saveNav({ navHidden: [], navFav: [] }); m.close(); };
    A.$('#neSave', m.el).onclick = () => { saveNav({ navHidden: [...hidden], navFav: [...favs] }); m.close(); A.toast('Menü güncellendi', 'ok'); };
  }
  A.navEditor = navEditor;
  A.renderNav = renderNav;

  // ---------------------------------------------------------------- odak modu
  A.toggleFocus = (on) => {
    const root = document.documentElement;
    const next = on === undefined ? !root.classList.contains('focus-mode') : !!on;
    root.classList.toggle('focus-mode', next);
    if (window.ayraDesktop && window.ayraDesktop.setFullScreen) window.ayraDesktop.setFullScreen(next);
    else if (next && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    else if (!next && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
  };
  document.addEventListener('keydown', (e) => {
    if (!A.state.user) return;
    if ((e.ctrlKey || e.metaKey) && e.key === '.') { e.preventDefault(); A.toggleFocus(); }
    if (e.key === 'Escape' && document.documentElement.classList.contains('focus-mode') && !A.$('.modal-back') && !A.$('.cmdk') && !A.$('#intro')) A.toggleFocus(false);
  });

  // ---------------------------------------------------------------- hızlı not (Ctrl+Shift+N)
  A.quickNote = () => {
    if (A.$('.qn-modal')) return;
    A.modal({
      title: 'Hızlı not', icon: 'notebook-pen', size: 'qn-modal',
      body: `<textarea class="textarea" id="qnText" rows="6" placeholder="Aklına geleni yaz, sonra düzenlersin... (Ctrl+Enter ile kaydet)"></textarea><div class="small muted" style="margin-top:6px">“Hızlı Notlar” klasörüne özel not olarak kaydedilir.</div>`,
      foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="qnSave">${A.icon('check')} Kaydet</button>`,
      onOpen: (m) => {
        const ta = A.$('#qnText', m.el);
        const save = async () => {
          const text = ta.value.trim();
          if (!text) return m.close();
          const title = text.split('\n')[0].replace(/^#+\s*/, '').slice(0, 60) || 'Hızlı not';
          try { await A.col.create('notes', { title, content: text, private: true, folder: 'Hızlı Notlar', tags: [], pinned: false }); m.close(); A.toast('Not kaydedildi', 'ok'); } catch (e) { A.err(e); }
        };
        A.$('#qnSave', m.el).onclick = save;
        ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } });
      },
    });
  };
  document.addEventListener('keydown', (e) => {
    if (A.state.user && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') { e.preventDefault(); A.quickNote(); }
  });

  // ---------------------------------------------------------------- rahatsız etme
  function renderDnd() {
    const b = A.$('#notifBtn');
    if (!b) return;
    b.classList.toggle('dnd', A.isDnd());
    b.title = A.isDnd() ? 'Bildirimler (Rahatsız etme açık)' : 'Bildirimler';
    const i = b.querySelector('svg, i');
    if (i) { i.outerHTML = A.icon(A.isDnd() ? 'bell-off' : 'bell'); A.icons(b); }
  }
  A.renderDnd = renderDnd;
  A.toggleDnd = async () => { await A.savePrefs({ dnd: !((A.state.user.prefs || {}).dnd) }); renderDnd(); A.toast(A.isDnd() ? 'Rahatsız etme açık — yalnızca senden bahsedilince haber verilir' : 'Bildirimler açık', 'info'); };

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

  // ---------------------------------------------------------------- tema sistemi
  A.THEMES = {
    dark: { name: 'Koyu', base: 'dark', bg: '#0b0c10', panel: '#151821', text: '#e9e9f0', accent: '#9b87f5', accent2: '#20c997' },
    light: { name: 'Açık', base: 'light', bg: '#f4f3fa', panel: '#ffffff', text: '#1d1b2c', accent: '#7c6ee6', accent2: '#12b886' },
    midnight: { name: 'Gece Yarısı', base: 'dark', bg: '#05060a', panel: '#0c0f1a', text: '#e6e8ff', accent: '#748ffc', accent2: '#3bc9db' },
    ocean: { name: 'Okyanus', base: 'dark', bg: '#071521', panel: '#0d2133', text: '#e3f2ff', accent: '#4dabf7', accent2: '#22d3ee' },
    forest: { name: 'Orman', base: 'dark', bg: '#0b130e', panel: '#132119', text: '#e6f4ea', accent: '#51cf66', accent2: '#fab005' },
    sunset: { name: 'Gün Batımı', base: 'dark', bg: '#170d12', panel: '#24151c', text: '#ffeef2', accent: '#ff8787', accent2: '#ffa94d' },
    neon: { name: 'Neon', base: 'dark', bg: '#09001a', panel: '#140629', text: '#f5e9ff', accent: '#e040fb', accent2: '#00e5ff' },
    coffee: { name: 'Kahve', base: 'dark', bg: '#15100c', panel: '#211913', text: '#f3e9df', accent: '#d4a373', accent2: '#e9c46a' },
    sakura: { name: 'Sakura', base: 'light', bg: '#fff4f7', panel: '#ffffff', text: '#3a1f2b', accent: '#e64980', accent2: '#ae3ec9' },
    sand: { name: 'Kum', base: 'light', bg: '#f6f1e7', panel: '#fffdf8', text: '#2e2619', accent: '#c26a2c', accent2: '#2f9e44' },
    soft: { name: 'Göz Dostu', base: 'dark', bg: '#1b1a17', panel: '#24221e', text: '#d6cfc1', accent: '#c9a86a', accent2: '#8fb996', eye: true },
    dim: { name: 'Loş', base: 'dark', bg: '#1d2130', panel: '#252a3b', text: '#c5cbd9', accent: '#8ea3d9', accent2: '#7cc4b0', eye: true },
    paper: { name: 'Kağıt', base: 'light', bg: '#efe8d8', panel: '#f8f2e4', text: '#3b3326', accent: '#8a6d3b', accent2: '#5b8a72', eye: true },
  };
  const hexRgb = (h) => { h = String(h || '#000').replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16) || 0; return [n >> 16, (n >> 8) & 255, n & 255]; };
  const rgbHex = (r) => '#' + r.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v + (y[i] - v) * t)); };
  const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
  A.colorMix = mix;

  // Tercihlerden tüm görünümü uygular (tema, vurgu rengi, köşe yuvarlaklığı, boyut, animasyon)
  A.applyAppearance = (prefs = {}) => {
    const root = document.documentElement;
    const custom = prefs.theme === 'custom' && prefs.customTheme ? prefs.customTheme : null;
    const t = { ...(custom || A.THEMES[prefs.theme] || A.THEMES.dark) };
    if (prefs.accent && !custom) t.accent = prefs.accent;
    const dark = t.base !== 'light';
    const ink = dark ? '#ffffff' : '#140f32';
    const v = {
      '--bg': t.bg, '--bg-2': mix(t.bg, t.panel, 0.45), '--panel': t.panel,
      '--panel-2': mix(t.panel, t.text, dark ? 0.04 : 0.025), '--panel-3': mix(t.panel, t.text, dark ? 0.09 : 0.07),
      '--line': rgba(ink, dark ? 0.07 : 0.08), '--line-2': rgba(ink, dark ? 0.12 : 0.14),
      '--text': t.text, '--text-2': mix(t.text, t.bg, 0.28), '--muted': mix(t.text, t.bg, 0.5),
      '--glass': rgba(t.panel, 0.78), '--accent': t.accent, '--accent-2': mix(t.accent, '#000000', 0.15),
      '--accent-soft': rgba(t.accent, 0.16), '--mint': t.accent2 || '#20c997',
      '--logo-1': mix(t.accent, '#ffffff', 0.45), '--logo-2': t.accent2 || '#20c997',
      '--shadow': dark ? '0 12px 40px rgba(0,0,0,.45)' : '0 12px 40px rgba(40,30,90,.14)',
      '--shadow-sm': dark ? '0 4px 14px rgba(0,0,0,.3)' : '0 4px 14px rgba(40,30,90,.08)',
    };
    const rad = Math.max(0, Math.min(2, prefs.radius == null ? 1 : Number(prefs.radius)));
    v['--r'] = Math.round(14 * rad) + 'px'; v['--r-sm'] = Math.round(9 * rad) + 'px'; v['--r-lg'] = Math.round(20 * rad) + 'px';
    Object.entries(v).forEach(([k, val]) => root.style.setProperty(k, val));
    root.dataset.theme = dark ? (prefs.theme === 'midnight' ? 'midnight' : 'dark') : 'light';
    root.classList.toggle('no-anim', prefs.animations === false);
    let warm = document.getElementById('warmFilter');
    const w = Math.max(0, Math.min(0.45, Number(prefs.warm) || 0));
    if (w > 0) { if (!warm) { warm = document.createElement('div'); warm.id = 'warmFilter'; document.body.appendChild(warm); } warm.style.opacity = w; }
    else if (warm) warm.remove();
    if (window.ayraDesktop && window.ayraDesktop.setZoom) window.ayraDesktop.setZoom(Number(prefs.uiScale) || 1);
    A.ls.set('appearance', { warm: prefs.warm, theme: prefs.theme, accent: prefs.accent, customTheme: prefs.customTheme, radius: prefs.radius, uiScale: prefs.uiScale, animations: prefs.animations });
    A.syncTitleBar();
  };
  A.applyTheme = (theme, accent) => A.applyAppearance({ ...((A.state.user && A.state.user.prefs) || {}), theme, ...(accent ? { accent } : {}) });

  function cycleTheme() {
    const order = Object.keys(A.THEMES);
    const cur = (A.state.user.prefs || {}).theme || 'dark';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    A.savePrefs({ theme: next, accent: null }).then(() => { A.applyAppearance(A.state.user.prefs); A.emit('appearance'); });
    A.toast(A.THEMES[next].name + ' teması etkin', 'info');
  }

  A.savePrefs = async (prefs) => {
    try { const r = await A.put('/api/me', { prefs }); A.state.user = r.user; } catch (e) { A.err(e); }
  };

  function meMenu(anchor) {
    const u = A.state.user;
    const pres = (p) => ({ html: `<i class="pres ${p}" style="position:static;display:inline-block;width:10px;height:10px;border-radius:50%;border:0"></i>${A.PRESENCE[p]} ${u.presence === p ? A.icon('check') : ''}`, action: async () => { const r = await A.put('/api/me', { presence: p }); A.state.user = r.user; A.state.users.set(u.id, { ...A.state.users.get(u.id), ...r.user }); renderMe(); renderOnline(); renderDnd(); } });
    A.menu(anchor, [
      { head: '@' + u.username },
      pres('online'), pres('busy'), pres('away'), pres('focus'),
      '-',
      { html: `${A.icon((u.prefs || {}).dnd ? 'bell' : 'bell-off')} ${(u.prefs || {}).dnd ? 'Rahatsız etme: kapat' : 'Rahatsız etme: aç'}`, action: () => A.toggleDnd() },
      { icon: 'focus', label: 'Odak modu (Ctrl + .)', action: () => A.toggleFocus() },
      { icon: 'smartphone', label: 'Telefondan aç (QR)', action: () => A.showPhoneQR() },
      ...(!window.ayraDesktop && !A.isStandalone() ? [{ icon: 'download', label: 'Ana ekrana / bilgisayara yükle', action: () => A.installApp() }] : []),
      '-',
      { icon: 'circle-user-round', label: 'Profil ve ayarlar', action: () => A.go('profile') },
      ...(A.can('view_admin') ? [{ icon: 'shield-check', label: 'Yönetim paneli', action: () => A.go('admin') }] : []),
      { icon: 'keyboard', label: 'Klavye kısayolları', action: shortcutsHelp },
      '-',
      { icon: 'log-out', label: 'Çıkış yap', danger: true, action: () => A.logout() },
    ], { align: 'right' });
  }

  function shortcutsHelp() {
    const rows = [['Ctrl + K', 'Hızlı arama / komut paleti'], ['Ctrl + .', 'Odak modu (menüleri gizle, tam ekran)'], ['Ctrl + Shift + N', 'Hızlı not'], ['Sağ tık (menüde)', 'Bölümü sık kullanılanlara ekle / gizle'], ['Alt + 1..9', 'Menüdeki bölümler arasında geçiş'], ['Ctrl + Z / Ctrl + Y', 'Çizim ve piksel editöründe geri al / yinele'], ['B, E, L, R, O, T', 'Çizim panosunda araçlar (fırça, silgi, çizgi, dikdörtgen, elips, yazı)'], ['Boşluk + sürükle', 'Çizim panosunda kaydırma'], ['Enter', 'Sohbette mesaj gönder (Shift+Enter yeni satır)'], ['Esc', 'Pencereleri kapat']];
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
      { icon: 'zap', title: 'Hızlı not (Ctrl+Shift+N)', label: 'Eylem', run: () => A.quickNote() },
      { icon: 'focus', title: 'Odak modu (Ctrl+.)', label: 'Eylem', run: () => A.toggleFocus() },
      { icon: 'bell-off', title: 'Rahatsız etme modunu aç/kapat', label: 'Eylem', run: () => A.toggleDnd() },
      { icon: 'sliders-horizontal', title: 'Menüyü düzenle', label: 'Eylem', run: () => A.navEditor() },
      { icon: 'flag', title: 'Yeni sürüm notu ekle', label: 'Eylem', run: () => A.go('roadmap/builds') },
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
    const ICON = { tasks: 'check-square', notes: 'sticky-note', gdd: 'book-open', bugs: 'bug', entities: 'swords', levels: 'map', dialogues: 'git-branch', events: 'calendar-days', ideas: 'lightbulb', files: 'folder', drawings: 'pen-tool', pixelart: 'grid-3x3', users: 'user', rooms: 'hash', wiki: 'library', projects: 'folder-kanban', announcements: 'megaphone', playtests: 'flask-conical', palettes: 'palette', sounds: 'music', milestones: 'flag', builds: 'package', assets: 'boxes' };
    const ROUTE = { tasks: 'tasks', notes: 'notes', gdd: 'gdd', bugs: 'bugs', entities: 'entities', levels: 'levels', dialogues: 'dialogues', events: 'calendar', ideas: 'ideas', files: 'files', drawings: 'draw', pixelart: 'pixel', users: 'team', rooms: 'chat', wiki: 'wiki', projects: 'projects', announcements: 'dashboard', playtests: 'playtests', palettes: 'tools', sounds: 'files', milestones: 'roadmap', builds: 'roadmap/builds', assets: 'assets' };
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
    renderBottomNav();
    A.toggleDrawer(false);
    document.title = (m ? m.title + ' · ' : '') + 'Ayra Design';
  });

  // ---------------------------------------------------------------- mobil: çekmece menü + alt menü çubuğu
  A.isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  A.toggleDrawer = (on) => {
    const app = A.$('#app');
    if (!app) return;
    const next = on === undefined ? !app.classList.contains('drawer-open') : !!on;
    app.classList.toggle('drawer-open', next);
  };
  const BOTTOM = [['dashboard', 'layout-dashboard', 'Pano'], ['tasks', 'kanban', 'Görevler'], ['chat', 'messages-square', 'Sohbet'], ['notes', 'notebook-pen', 'Notlar']];
  function renderBottomNav() {
    const el = A.$('#bottomNav');
    if (!el) return;
    const cur = A.current ? A.current.id : '';
    const inBottom = BOTTOM.some(([id]) => id === cur);
    el.innerHTML = BOTTOM.filter(([id]) => A.modules[id]).map(([id, ic, l]) => `<button class="${cur === id ? 'on' : ''}" data-bgo="${id}">${A.icon(ic)}<span>${l}</span>${id === 'chat' && A.unread.chat ? `<i class="bn-badge">${A.unread.chat > 9 ? '9+' : A.unread.chat}</i>` : ''}</button>`).join('')
      + `<button class="${!inBottom ? 'on' : ''}" data-bmore>${A.icon('layout-grid')}<span>${!inBottom && A.modules[cur] ? A.esc(A.modules[cur].title.split(' ')[0]) : 'Tümü'}</span>${A.unread.pending ? '<i class="bn-badge dot"></i>' : ''}</button>`;
    A.icons(el);
    A.$$('[data-bgo]', el).forEach((b) => (b.onclick = () => A.go(b.dataset.bgo)));
    A.$('[data-bmore]', el).onclick = () => A.toggleDrawer(true);
  }
  A.renderBottomNav = renderBottomNav;
  // kenardan kaydırarak menüyü aç / kapat
  (() => {
    let sx = null, sy = 0;
    document.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (sx === null || !A.isMobile() || !A.state.user) return;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = Math.abs(t.clientY - sy);
      const open = A.$('#app') && A.$('#app').classList.contains('drawer-open');
      if (!open && sx < 24 && dx > 70 && dy < 60) A.toggleDrawer(true);
      if (open && dx < -70 && dy < 60) A.toggleDrawer(false);
      sx = null;
    }, { passive: true });
  })();

  // ---------------------------------------------------------------- socket
  A.connectSocket = function () {
    if (A.state.socket) A.state.socket.disconnect();
    const s = io({ auth: { token: A.state.token }, transports: ['websocket', 'polling'] });
    A.state.socket = s;
    let wasDown = false;
    s.on('connect_error', (e) => { if (e.message === 'unauthorized') A.logout('Oturumunuz sona erdi.'); });
    let downTimer = null;
    s.on('disconnect', () => { wasDown = true; clearTimeout(downTimer); downTimer = setTimeout(() => { const c = A.$('#connBar'); if (c) c.classList.remove('hidden'); }, 2500); });
    s.on('connect', () => { clearTimeout(downTimer); const c = A.$('#connBar'); if (c) c.classList.add('hidden'); if (wasDown) { A.toast('Sunucu bağlantısı yeniden kuruldu', 'ok'); A.emit('reconnect'); wasDown = false; } });
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
      const important = n.icon === 'at-sign' || n.icon === 'user-plus';
      if (A.isDnd() && !important) { refreshNotifCount(); return; }
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
      const inChat = A.current && A.current.id === 'chat';
      const inRoom = inChat && A.chatRoomId === m.roomId && !document.hidden;
      if (!inRoom) {
        if (!inChat) { A.unread.chat++; renderNav(); }
        A.sound('msg');
        if (window.ayraDesktop && document.hidden) window.ayraDesktop.notify(A.user(m.userId).displayName, m.text || 'Dosya gönderdi');
      }
    });
    s.on('room:created', () => A.emit('rooms'));
  };
})();
