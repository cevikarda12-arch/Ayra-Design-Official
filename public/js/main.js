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

  async function start() {
    const ap = A.ls.get('appearance');
    if (ap) try { A.applyAppearance(ap); } catch {}
    const token = A.ls.get('token') || sessionStorage.getItem('ayra.token');
    const statusP = A.get('/api/status').catch(() => ({}));
    await A.playIntro(A.ls.get('intro', true) === false);
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
