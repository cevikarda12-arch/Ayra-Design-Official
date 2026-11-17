/* Ayra Design — giriş & kayıt ekranı */
(function () {
  let stopParticles = null;

  A.showAuth = function (mode = 'login', msg = null) {
    const root = A.$('#auth');
    A.$('#app').classList.add('hidden');
    root.classList.remove('hidden');
    root.innerHTML = `
      <div class="auth-art">
        <canvas></canvas>
        <div class="auth-floating" style="top:12%;left:10%">${A.icon('check-circle-2')}<div><b>Prototip teslim edildi</b><div class="muted small">Görev Panosu · az önce</div></div></div>
        <div class="auth-floating" style="top:28%;right:9%;animation-delay:-2s">${A.icon('message-circle')}<div><b>#oyun-tasarimi</b><div class="muted small">“Zıplama mekaniği harika oldu!”</div></div></div>
        <div class="auth-floating" style="top:47%;left:20%;animation-delay:-4s">${A.icon('pen-tool')}<div><b>Çizim Panosu</b><div class="muted small">3 kişi şu an çiziyor</div></div></div>
        <div class="art-copy">
          <h2>Oyunlarınızı <em>birlikte</em><br>tasarlayın.</h2>
          <p>Ayra Design; görev takibi, GDD, çizim panosu, seviye ve diyalog editörleri, piksel stüdyosu ve sohbet odalarını tek bir stüdyoda toplar.</p>
          <div class="auth-feats">
            <span>${A.icon('kanban')}Görev Panosu</span><span>${A.icon('book-open')}GDD Editörü</span><span>${A.icon('map')}Seviye Editörü</span>
            <span>${A.icon('git-branch')}Diyalog Ağacı</span><span>${A.icon('grid-3x3')}Piksel Stüdyosu</span><span>${A.icon('messages-square')}Sohbet</span>
          </div>
        </div>
      </div>
      <div class="auth-panel">
        ${window.ayraDesktop ? `<button class="btn ghost sm server-btn" id="srvBtn">${A.icon('server')} Sunucu</button>` : ''}
        <div class="auth-card" id="authCard"></div>
      </div>`;
    A.icons(root);
    if (stopParticles) stopParticles();
    stopParticles = A.particles(A.$('.auth-art canvas', root), { count: 70 });
    const srv = A.$('#srvBtn', root);
    if (srv) srv.onclick = serverDialog;
    renderCard(mode, msg);
  };

  A.hideAuth = function () {
    if (stopParticles) { stopParticles(); stopParticles = null; }
    const root = A.$('#auth');
    root.classList.add('hidden');
    root.innerHTML = '';
  };

  async function serverDialog() {
    const cur = await window.ayraDesktop.getServer();
    A.modal({
      title: 'Sunucu Bağlantısı', icon: 'server',
      body: `<p class="muted" style="margin-top:0">Ayra Design kendi bilgisayarınızda yerel bir sunucu çalıştırır. Ekip arkadaşlarınız aynı ağdaysa, <b>yöneticinin bilgisayarındaki sunucuya</b> bağlanabilirler (Yönetim Paneli &gt; Sistem bölümünde adres görünür).</p>
        <div class="field"><label>Mod</label><select class="select" id="srvMode"><option value="local">Bu bilgisayarda çalıştır (yerel sunucu)</option><option value="remote">Uzak sunucuya bağlan</option></select></div>
        <div class="field" id="srvUrlF"><label>Sunucu adresi</label><input class="input" id="srvUrl" placeholder="http://192.168.1.20:4321"></div>`,
      foot: '<button class="btn" data-close>Vazgeç</button><button class="btn primary" id="srvSave">Kaydet ve yeniden bağlan</button>',
      onOpen: (m) => {
        const mode = A.$('#srvMode', m.el), url = A.$('#srvUrl', m.el);
        mode.value = cur && cur.remote ? 'remote' : 'local';
        url.value = (cur && cur.remote) || '';
        const sync = () => (A.$('#srvUrlF', m.el).style.display = mode.value === 'remote' ? '' : 'none');
        mode.onchange = sync; sync();
        A.$('#srvSave', m.el).onclick = async () => {
          const v = mode.value === 'remote' ? url.value.trim() : '';
          if (mode.value === 'remote' && !/^https?:\/\/.+/.test(v)) return A.toast('Geçerli bir adres girin (http://...)', 'err');
          await window.ayraDesktop.setServer(v);
        };
      },
    });
  }

  function renderCard(mode, msg) {
    const card = A.$('#authCard');
    const st = A.state.status || {};
    if (mode === 'pending') {
      card.innerHTML = `<div class="pending-card">
        <div class="hourglass">${A.icon('hourglass')}</div>
        <h3>Onay bekleniyor</h3>
        <p class="sub">${A.esc(msg || 'Başvurunuz yöneticiye iletildi. Hesabınız onaylandığında giriş yapabileceksiniz.')}</p>
        <button class="btn primary block" id="backLogin">${A.icon('arrow-left')} Giriş ekranına dön</button>
      </div>`;
      A.icons(card);
      A.$('#backLogin').onclick = () => renderCard('login');
      return;
    }
    const reg = mode === 'register';
    card.innerHTML = `
      <div class="auth-brand"><img src="img/icon.svg" alt=""><div><b>AYRA</b><small>design</small></div></div>
      <h3>${reg ? 'Ekibe katıl ✨' : 'Tekrar hoş geldin 👋'}</h3>
      <p class="sub">${reg ? 'Başvurun yönetici onayından sonra aktifleşir.' : 'Stüdyoya giriş yap ve tasarlamaya devam et.'}</p>
      <div class="auth-tabs ${reg ? 'reg' : ''}"><i class="pill"></i><button data-m="login" class="${reg ? '' : 'on'}">Giriş Yap</button><button data-m="register" class="${reg ? 'on' : ''}">Kayıt Ol</button></div>
      <div id="authMsg">${msg ? `<div class="auth-msg ${msg.type}">${A.icon(msg.type === 'ok' ? 'check-circle-2' : msg.type === 'warn' ? 'info' : 'alert-triangle')}<span>${A.esc(msg.text)}</span></div>` : ''}</div>
      <form class="auth-form" id="authForm" autocomplete="on">
        ${reg ? `
          <div class="row"><div class="field"><label>Ad Soyad</label><div class="input-icon">${A.icon('user')}<input class="input" name="displayName" required placeholder="Adınız"></div></div></div>
          <div class="field"><label>Kullanıcı adı</label><div class="input-icon">${A.icon('at-sign')}<input class="input" name="username" required placeholder="ornek_kullanici" autocomplete="username"></div></div>
          <div class="field"><label>E-posta (isteğe bağlı)</label><div class="input-icon">${A.icon('mail')}<input class="input" name="email" type="email" placeholder="ornek@mail.com"></div></div>
          <div class="field"><label>Ekipteki rolün</label><div class="input-icon">${A.icon('briefcase')}<select class="select input" name="title" style="padding-left:38px">
            ${['Oyun Tasarımcısı', 'Seviye Tasarımcısı', 'Programcı', '2D Sanatçı', '3D Sanatçı', 'Animatör', 'Ses / Müzik', 'Senarist', 'UI/UX Tasarımcısı', 'QA / Test', 'Yapımcı', 'Diğer'].map((t) => `<option>${t}</option>`).join('')}
          </select></div></div>
          <div class="field"><label>Şifre</label><div class="input-icon">${A.icon('lock')}<input class="input" name="password" type="password" required minlength="6" placeholder="En az 6 karakter" autocomplete="new-password"><button type="button" class="eye">${A.icon('eye')}</button></div></div>
          <div class="field"><label>Yöneticiye not (isteğe bağlı)</label><textarea class="textarea" name="note" rows="2" style="min-height:60px" placeholder="Kendinizi kısaca tanıtın"></textarea></div>
        ` : `
          <div class="field"><label>Kullanıcı adı veya e-posta</label><div class="input-icon">${A.icon('user')}<input class="input" name="username" required placeholder="kullanici_adi" autocomplete="username" value="${A.esc(A.ls.get('lastUser', ''))}"></div></div>
          <div class="field"><label>Şifre</label><div class="input-icon">${A.icon('lock')}<input class="input" name="password" type="password" required placeholder="••••••••" autocomplete="current-password"><button type="button" class="eye">${A.icon('eye')}</button></div></div>
          <label class="row small muted" style="margin:-4px 0 16px;cursor:pointer"><input type="checkbox" name="remember" checked> Beni hatırla</label>
        `}
        <button class="btn primary block" type="submit" style="height:44px">${reg ? A.icon('send') + ' Başvuru Gönder' : A.icon('log-in') + ' Giriş Yap'}</button>
      </form>
      ${!reg && st.registrationOpen === false ? '<p class="small muted" style="text-align:center;margin-top:14px">Yeni kayıtlar şu anda kapalı.</p>' : ''}
      <div class="auth-foot">© ${new Date().getFullYear()} Ayra Design · Oyun Tasarım Stüdyosu</div>`;
    A.icons(card);
    A.$$('.auth-tabs button', card).forEach((b) => (b.onclick = () => renderCard(b.dataset.m)));
    A.$$('.eye', card).forEach((b) => (b.onclick = () => { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; }));
    const form = A.$('#authForm', card);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(form));
      const btn = A.$('button[type=submit]', form);
      btn.disabled = true;
      const old = btn.innerHTML;
      btn.innerHTML = '<span class="loader" style="width:18px;height:18px;margin:0;border-width:2px"></span>';
      try {
        if (reg) {
          const r = await A.post('/api/auth/register', fd);
          renderCard('pending', r.message);
        } else {
          const r = await A.post('/api/auth/login', { username: fd.username, password: fd.password });
          A.ls.set('lastUser', fd.username);
          A.setSession(r.token, fd.remember === 'on');
          card.style.transition = 'all .5s cubic-bezier(.2,.8,.2,1)';
          card.style.transform = 'scale(.92)'; card.style.opacity = '0';
          A.sound('whoosh');
          setTimeout(() => A.boot(), 350);
        }
      } catch (err) {
        btn.disabled = false; btn.innerHTML = old; A.icons(btn);
        if (err.code === 'pending') return renderCard('pending', err.message);
        A.$('#authMsg').innerHTML = `<div class="auth-msg err">${A.icon('alert-triangle')}<span>${A.esc(err.message)}</span></div>`;
        A.icons(A.$('#authMsg'));
        card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      }
    };
  }

  A.setSession = (token, remember = true) => {
    A.state.token = token;
    if (remember) A.ls.set('token', token); else { A.ls.del('token'); sessionStorage.setItem('ayra.token', token); }
  };

  A.logout = async (silent = false) => {
    try { if (!silent && A.state.token) await A.post('/api/auth/logout'); } catch {}
    A.ls.del('token');
    sessionStorage.removeItem('ayra.token');
    A.state.token = null;
    A.state.user = null;
    if (A.state.socket) { A.state.socket.disconnect(); A.state.socket = null; }
    if (A.current && A.current.destroy) try { A.current.destroy(); } catch {}
    A.current = null;
    A.$('#app').innerHTML = '';
    A.showAuth('login', silent ? { type: 'warn', text: typeof silent === 'string' ? silent : 'Oturumunuz sona erdi, lütfen tekrar giriş yapın.' } : null);
  };
})();
