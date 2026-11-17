/* Ayra Design — giriş (karşılama) animasyonu
   "Giriş Yap"a basıldığında: düğmeden yayılan dairesel geçiş → avatar + logo →
   harf harf "Hoş geldin, <ad>" → stüdyo hazırlanıyor adımları → uygulama parça parça kurulur. */
(function () {
  const STEPS = [
    ['folder-kanban', 'Projeler yükleniyor'],
    ['users', 'Ekip bağlanıyor'],
    ['messages-square', 'Sohbet odaları açılıyor'],
    ['sparkles', 'Stüdyo hazırlanıyor'],
  ];

  A.playWelcome = function (user, origin = {}) {
    return new Promise((resolve) => {
      const x = origin.x != null ? origin.x : innerWidth / 2;
      const y = origin.y != null ? origin.y : innerHeight / 2;
      const hour = new Date().getHours();
      const greet = hour < 6 ? 'İyi geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
      const first = String(user.displayName || user.username || '').split(' ')[0];
      const letters = [...first].map((ch, i) => `<span style="--i:${i}">${ch === ' ' ? '&nbsp;' : A.esc(ch)}</span>`).join('');
      const role = A.roleName(user.role);
      const el = A.h(`<div class="welcome" style="--wx:${x}px;--wy:${y}px">
        <canvas class="w-canvas"></canvas>
        <div class="w-burst"></div>
        <div class="w-center">
          <div class="w-avatar-wrap">
            <div class="w-ring"></div>
            <div class="w-ring r2"></div>
            ${A.avatar(user, 'xl')}
            <span class="logo-mark w-badge"></span>
          </div>
          <div class="w-greet">${greet},</div>
          <h1 class="w-name">${letters}<span class="w-wave">👋</span></h1>
          <div class="w-role">${A.esc(role)}${user.title ? ' · ' + A.esc(user.title) : ''}</div>
          <div class="w-steps">${STEPS.map(([ic, t], i) => `<div class="w-step" style="--i:${i}"><span class="w-ic">${A.icon(ic)}</span><span>${t}</span><span class="w-ok">${A.icon('check')}</span></div>`).join('')}</div>
          <div class="w-bar"><i></i></div>
        </div>
        <button class="intro-skip w-skip">Geç ›</button>
      </div>`);
      document.body.appendChild(el);
      A.icons(el);
      A.sound('whoosh');
      const stop = A.particles(A.$('.w-canvas', el), { count: 70, links: true });
      if (window.ayraDesktop && window.ayraDesktop.setTitleBar) window.ayraDesktop.setTitleBar('#0b0c10', '#e9e9f0');

      let done = false;
      const timers = [];
      const finish = () => {
        if (done) return;
        done = true;
        timers.forEach(clearTimeout);
        el.classList.add('out');
        A.sound('done');
        resolve();
        setTimeout(() => { stop(); el.remove(); A.syncTitleBar(); }, 750);
      };
      // adımlar sırayla tamamlanır
      A.$$('.w-step', el).forEach((s, i) => timers.push(setTimeout(() => { s.classList.add('done'); A.sound('pop'); }, 1350 + i * 330)));
      timers.push(setTimeout(finish, 1350 + STEPS.length * 330 + 450));
      A.$('.w-skip', el).onclick = finish;
      el.addEventListener('dblclick', finish);
    });
  };

  // Uygulama arayüzünün parça parça kurulması (kenar menü, üst bar, menü öğeleri, içerik)
  A.enterApp = function () {
    const app = A.$('#app');
    if (!app) return;
    A.$$('.nav-item', app).forEach((n, i) => n.style.setProperty('--i', i));
    app.classList.remove('app-enter');
    void app.offsetWidth;
    app.classList.add('app-enter');
    setTimeout(() => app.classList.remove('app-enter'), 2200);
  };
})();
