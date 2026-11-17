/* Ayra Design — başlatıcı */
(function () {
  A.boot = async function (opts = {}) {
    try {
      const me = await A.get('/api/me');
      A.state.user = me.user;
      A.state.perms = me.perms;
      A.state.roles = me.roles;
      A.state.permissions = me.permissions;
      A.state.settings = me.settings;
      const [users, projects] = await Promise.all([A.get('/api/users'), A.get('/api/c/projects')]);
      A.state.users = new Map(users.map((u) => [u.id, u]));
      A.state.online = new Set(users.filter((u) => u.online).map((u) => u.id));
      A.state.projects = projects;
      const saved = A.ls.get('project');
      A.state.projectId = projects.find((p) => p.id === saved) ? saved : projects[0] ? projects[0].id : null;
      const prefs = me.user.prefs || {};
      A.applyAppearance(prefs);
      A.ls.set('intro', prefs.intro !== false);
      if (window.ayraDesktop && window.ayraDesktop.setDesktopPref) window.ayraDesktop.setDesktopPref('splash', prefs.intro !== false);
      const animate = prefs.animations !== false;
      const welcome = animate && opts.welcome ? A.playWelcome(me.user, opts.welcome) : null;
      if (welcome) await new Promise((r) => setTimeout(r, 950)); // dairesel geçiş ekranı kaplasın
      A.hideAuth();
      A.buildShell();
      A.connectSocket();
      A.route();
      if (welcome) await welcome;
      if (animate) A.enterApp();
      A.refreshNotifCount();
      A.refreshPending();
      A.refreshChatUnread();
      const hour = new Date().getHours();
      const greet = hour < 6 ? 'İyi geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
      if (!welcome) A.toast(`${greet}, ${me.user.displayName}!`, 'ok', 'Hoş geldin');
      if (me.user.mustChangePassword) forcePasswordChange();
    } catch (e) {
      console.error(e);
      A.logout(e.status === 401 ? true : false);
    }
  };

  // Varsayılan / geçici şifreyle giriş yapıldıysa yeni şifre belirlemek zorunludur
  function forcePasswordChange() {
    A.modal({
      title: 'Yeni şifre belirleyin', icon: 'key-round', closable: false,
      body: `<p style="margin-top:0">Güvenliğiniz için geçici/varsayılan şifreyi değiştirmeniz gerekiyor. Bu adımdan sonra uygulamayı kullanmaya devam edebilirsiniz.</p>
        <div class="field"><label>Yeni şifre</label><input class="input" type="password" id="fpNew" autocomplete="new-password" placeholder="En az 6 karakter"></div>
        <div class="field"><label>Yeni şifre (tekrar)</label><input class="input" type="password" id="fpNew2" autocomplete="new-password"></div>
        <div id="fpErr" class="small" style="color:var(--red)"></div>`,
      foot: `<button class="btn ghost" id="fpOut">${A.icon('log-out')} Çıkış</button><span class="spacer"></span><button class="btn primary" id="fpSave">${A.icon('check')} Şifreyi kaydet</button>`,
      onOpen: (m) => {
        const err = (t) => { A.$('#fpErr', m.el).textContent = t; };
        A.$('#fpOut', m.el).onclick = () => { m.close(); A.logout(); };
        const save = async () => {
          const a = A.$('#fpNew', m.el).value, b = A.$('#fpNew2', m.el).value;
          if (a.length < 6) return err('Şifre en az 6 karakter olmalı.');
          if (a !== b) return err('Şifreler eşleşmiyor.');
          try {
            await A.put('/api/me/password', { next: a });
            A.state.user.mustChangePassword = false;
            m.close();
            A.toast('Şifreniz güncellendi. Artık hazırsınız! 🎉', 'ok');
            A.confetti(60);
          } catch (e) { err(e.message); }
        };
        A.$('#fpSave', m.el).onclick = save;
        A.$('#fpNew2', m.el).onkeydown = (e) => { if (e.key === 'Enter') save(); };
      },
    });
  }

  window.addEventListener('hashchange', () => A.route());

  // mobil: liste/detay geri düğmesi ve editör panelleri
  document.addEventListener('click', (e) => {
    const back = e.target.closest('[data-back]');
    if (back) { const host = back.closest('.notes, .chat'); if (host) host.classList.remove('show-detail'); return; }
    const tgl = e.target.closest('[data-side-tgl]');
    if (tgl) { const l = tgl.closest('.lvl'); if (l) l.classList.toggle('side-open'); return; }
    const lvl = e.target.closest('.lvl.side-open');
    if (lvl && (e.target.closest('.lvl-list .note-item') || !e.target.closest('.lvl-side'))) lvl.classList.remove('side-open');
  });

  // ---------------------------------------------------------------- PWA: telefona yükleme + QR ile bağlanma
  if ('serviceWorker' in navigator && window.isSecureContext && !window.ayraDesktop) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  A.installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); A.installPrompt = e; });
  A.isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  A.qrSvg = (text, cell = 5) => { try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: cell, margin: 2 }); } catch { return ''; } };
  A.installApp = async () => {
    if (A.installPrompt) { A.installPrompt.prompt(); const r = await A.installPrompt.userChoice; A.installPrompt = null; if (r.outcome === 'accepted') A.toast('Ayra Design ana ekrana eklendi 🎉', 'ok'); return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    A.modal({ title: 'Ana ekrana ekle', icon: 'smartphone', body: ios
      ? '<ol class="install-steps"><li><b>Safari</b>\'de alttaki <b>Paylaş</b> (□↑) düğmesine dokunun.</li><li><b>Ana Ekrana Ekle</b>\'yi seçin.</li><li><b>Ekle</b>\'ye dokunun — Ayra Design simgesi ana ekranınızda belirir.</li></ol>'
      : '<ol class="install-steps"><li>Tarayıcının sağ üstündeki <b>⋮</b> menüsünü açın.</li><li><b>Ana ekrana ekle</b> veya <b>Uygulamayı yükle</b>\'ye dokunun.</li><li>Ayra Design simgesi ana ekranınızda belirir ve tam ekran açılır.</li></ol><p class="small muted">Android için hazır <b>.apk</b> uygulaması da var: GitHub → Releases sayfasından <b>Ayra-Design-Android.apk</b> dosyasını indirin.</p>' });
  };
  A.showPhoneQR = async () => {
    let urls = [];
    if (A.can('view_admin')) { try { urls = (await A.get('/api/admin/overview')).lanAddresses; } catch {} }
    if (!/localhost|127\.0\.0\.1/.test(location.hostname)) urls.unshift(location.origin);
    urls = [...new Set(urls)];
    A.modal({ title: 'Telefondan aç', icon: 'smartphone', body: urls.length
      ? `<p style="margin-top:0">Telefonunuzun kamerasıyla QR kodu okutun. Telefon <b>bu bilgisayarla aynı Wi-Fi ağında</b> olmalı.</p><div class="qr-box">${A.qrSvg(urls[0], 6)}</div><p class="mono center" style="font-size:15px">${A.esc(urls[0])}</p>${urls.slice(1).map((u) => `<div class="small muted mono center">${A.esc(u)}</div>`).join('')}<p class="small muted">Açılınca giriş yapın; ardından tarayıcı menüsünden <b>Ana ekrana ekle</b> diyerek uygulama gibi kullanabilirsiniz.</p>`
      : '<p>Ağ adresi bulunamadı. Bilgisayarın bir Wi-Fi / kablolu ağa bağlı olduğundan emin olun.</p>' });
  };

  async function start() {
    const ap = A.ls.get('appearance');
    if (ap) try { A.applyAppearance(ap); } catch {}
    const token = A.ls.get('token') || sessionStorage.getItem('ayra.token');
    const statusP = A.get('/api/status').catch(() => ({}));
    // masaüstünde açılış animasyonu ayrı açılış penceresinde oynadıysa tekrar oynatma
    await A.playIntro(A.ls.get('intro', true) === false || !!(window.ayraDesktop && window.ayraDesktop.splashPlayed));
    A.state.status = await statusP;
    if (token) {
      A.state.token = token;
      A.boot();
    } else {
      A.showAuth('login');
    }
  }
  start();
})();
