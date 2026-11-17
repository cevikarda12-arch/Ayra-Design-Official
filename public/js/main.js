/* Ayra Design — başlatıcı */
(function () {
  A.boot = async function () {
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
      A.applyTheme(prefs.theme || 'dark', prefs.accent || null);
      A.ls.set('intro', prefs.intro !== false);
      A.hideAuth();
      A.buildShell();
      A.connectSocket();
      A.route();
      A.refreshNotifCount();
      A.refreshPending();
      A.refreshChatUnread();
      const hour = new Date().getHours();
      const greet = hour < 6 ? 'İyi geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
      A.toast(`${greet}, ${me.user.displayName}!`, 'ok', 'Hoş geldin');
    } catch (e) {
      console.error(e);
      A.logout(e.status === 401 ? true : false);
    }
  };

  window.addEventListener('hashchange', () => A.route());

  async function start() {
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
