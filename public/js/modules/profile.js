/* Profil ve Ayarlar */
(function () {
  const ACCENTS = ['#9b87f5', '#20c997', '#f06595', '#4dabf7', '#ffa94d', '#ff6b6b', '#fab005', '#7950f2', '#12b886', '#e64980'];
  const SKILLS = ['Oyun Tasarımı', 'Seviye Tasarımı', 'Unity', 'Unreal', 'Godot', 'C#', 'C++', 'GDScript', 'Python', 'Piksel Sanat', '2D İllüstrasyon', '3D Modelleme', 'Animasyon', 'UI/UX', 'Müzik', 'Ses Tasarımı', 'Senaryo', 'QA', 'Yapımcılık', 'Pazarlama'];

  A.register('profile', {
    title: 'Profil & Ayarlar', icon: 'circle-user-round', scoped: false,
    render(el, [tab = 'profile']) {
      const u = A.state.user;
      el.innerHTML = `<div class="profile-hero"><div class="ph-bg" style="background:linear-gradient(120deg, ${A.esc(u.avatarColor)}, var(--accent-2), transparent)"></div>
          <div class="ph-av" id="phAv">${A.avatar(u, 'xl')}<button class="btn icon sm" id="avBtn" title="Fotoğraf yükle">${A.icon('image')}</button></div>
          <div><h1 style="margin:0">${A.esc(u.displayName)}</h1><div class="muted">@${A.esc(u.username)} · ${A.esc(u.title || '')} · ${A.roleBadge(u.role)}</div></div></div>
        <div class="tabs">${[['profile', 'user', 'Profil'], ['look', 'palette', 'Görünüm'], ['security', 'lock', 'Güvenlik'], ['stats', 'bar-chart-3', 'İstatistiklerim']].map(([k, ic, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${A.icon(ic)} ${l}</button>`).join('')}</div>
        <div id="pfBody" style="max-width:820px"></div>`;
      A.icons(el);
      A.$$('.tabs button', el).forEach((b) => (b.onclick = () => { A.$$('.tabs button', el).forEach((x) => x.classList.toggle('on', x === b)); history.replaceState(null, '', '#/profile/' + b.dataset.t); show(b.dataset.t); }));
      A.$('#avBtn', el).onclick = async () => {
        const f = await A.pickFile('image/*');
        if (!f) return;
        const data = await A.resizeImage(await A.readFile(f), 256);
        if (!data) return A.toast('Görsel okunamadı', 'err');
        await saveMe({ avatar: data });
        A.toast('Profil fotoğrafı güncellendi', 'ok');
        A.route();
      };
      const body = A.$('#pfBody', el);
      const show = (t) => { body.innerHTML = ''; ({ profile, look, security, stats })[t](body); A.icons(body); };
      show(['profile', 'look', 'security', 'stats'].includes(tab) ? tab : 'profile');
    },
  });

  async function saveMe(patch) {
    try {
      const r = await A.put('/api/me', patch);
      A.state.user = r.user;
      A.state.users.set(r.user.id, { ...(A.state.users.get(r.user.id) || {}), ...r.user });
      A.renderMe();
      return r.user;
    } catch (e) { A.err(e); return null; }
  }

  function profile(b) {
    const u = A.state.user;
    let skills = [...(u.skills || [])];
    b.innerHTML = `<div class="card">
      <div class="row"><div class="field"><label>Görünen ad</label><input class="input" id="pfName" value="${A.esc(u.displayName)}"></div><div class="field"><label>Unvan / Ekipteki rol</label><input class="input" id="pfTitle" value="${A.esc(u.title || '')}"></div></div>
      <div class="row"><div class="field"><label>E-posta</label><input class="input" id="pfMail" type="email" value="${A.esc(u.email || '')}"></div><div class="field"><label>Durum mesajı</label><input class="input" id="pfStatus" value="${A.esc(u.statusText || '')}" placeholder="Örn: Boss savaşını tasarlıyorum ⚔️"></div></div>
      <div class="field"><label>Hakkımda</label><textarea class="textarea" id="pfBio" rows="3">${A.esc(u.bio || '')}</textarea></div>
      <div class="field"><label>Yetenekler</label><div class="skill-pick" id="pfSkills"></div></div>
      <div class="field"><label>Avatar rengi</label><div class="color-dots" id="pfColor">${ACCENTS.map((c) => `<button data-c="${c}" style="background:${c}" class="${u.avatarColor === c ? 'on' : ''}"></button>`).join('')}</div></div>
      ${u.avatar ? `<button class="btn sm ghost" id="pfRmAv">${A.icon('trash-2')} Profil fotoğrafını kaldır</button>` : ''}
      <div class="row" style="justify-content:flex-end"><button class="btn primary" id="pfSave">${A.icon('save')} Kaydet</button></div></div>`;
    let color = u.avatarColor;
    const drawSkills = () => {
      const box = A.$('#pfSkills', b);
      const all = [...new Set([...SKILLS, ...skills])];
      box.innerHTML = all.map((s) => `<button class="${skills.includes(s) ? 'on' : ''}">${A.esc(s)}</button>`).join('') + `<button class="add">+ Ekle</button>`;
      A.$$('button', box).forEach((x) => (x.onclick = async () => {
        if (x.classList.contains('add')) { const n = await A.prompt('Yeni yetenek'); if (n && n.trim()) skills.push(n.trim()); }
        else { const s = x.textContent; skills = skills.includes(s) ? skills.filter((y) => y !== s) : [...skills, s]; }
        drawSkills();
      }));
    };
    drawSkills();
    A.$$('#pfColor button', b).forEach((x) => (x.onclick = () => { color = x.dataset.c; A.$$('#pfColor button', b).forEach((y) => y.classList.toggle('on', y === x)); }));
    const rm = A.$('#pfRmAv', b);
    if (rm) rm.onclick = async () => { await saveMe({ avatar: null }); A.route(); };
    A.$('#pfSave', b).onclick = async () => {
      const r = await saveMe({ displayName: A.$('#pfName', b).value, title: A.$('#pfTitle', b).value, email: A.$('#pfMail', b).value, statusText: A.$('#pfStatus', b).value, bio: A.$('#pfBio', b).value, skills, avatarColor: color });
      if (r) { A.toast('Profil kaydedildi', 'ok'); A.route(); }
    };
  }

  function look(b) {
    const p = A.state.user.prefs || {};
    const theme = p.theme || 'dark';
    b.innerHTML = `<div class="card"><div class="label" style="margin-bottom:10px">Tema</div>
      <div class="theme-pick">${[['dark', 'Koyu', '#0b0c10', '#151821'], ['light', 'Açık', '#f4f3fa', '#ffffff'], ['midnight', 'Gece Yarısı', '#05060a', '#0c0f1a']].map(([k, l, a, c]) => `<button data-th="${k}" class="${theme === k ? 'on' : ''}"><div class="tp-prev" style="background:${a}"><i style="background:${c}"></i><i style="background:${c}"></i><b style="background:var(--accent)"></b></div>${l}</button>`).join('')}</div>
      <div class="label" style="margin:20px 0 10px">Vurgu rengi</div>
      <div class="color-dots" id="lkAcc">${ACCENTS.map((c) => `<button data-c="${c}" style="background:${c};width:32px;height:32px" class="${(p.accent || '#9b87f5') === c ? 'on' : ''}"></button>`).join('')}<input type="color" id="lkCustom" value="${A.esc(p.accent || '#9b87f5')}"></div>
      <div class="label" style="margin:22px 0 10px">Tercihler</div>
      <label class="pref-row"><div><b>Açılış animasyonu</b><div class="small muted">Uygulama açılırken Ayra Design animasyonunu göster</div></div><label class="switch"><input type="checkbox" id="lkIntro" ${p.intro !== false ? 'checked' : ''}><span></span></label></label>
      <label class="pref-row"><div><b>Arayüz sesleri</b><div class="small muted">Bildirim ve etkileşim sesleri</div></div><label class="switch"><input type="checkbox" id="lkSnd" ${p.sounds !== false ? 'checked' : ''}><span></span></label></label>
      <label class="pref-row"><div><b>Kompakt menü</b><div class="small muted">Kenar menüsünü daraltılmış başlat</div></div><label class="switch"><input type="checkbox" id="lkCol" ${A.ls.get('collapsed') ? 'checked' : ''}><span></span></label></label>
      <button class="btn sm" id="lkReplay" style="margin-top:10px">${A.icon('play')} Açılış animasyonunu şimdi oynat</button></div>`;
    A.$$('[data-th]', b).forEach((x) => (x.onclick = async () => { A.applyTheme(x.dataset.th); await A.savePrefs({ theme: x.dataset.th }); A.$$('[data-th]', b).forEach((y) => y.classList.toggle('on', y === x)); }));
    const setAcc = async (c) => { A.applyTheme(document.documentElement.dataset.theme, c); await A.savePrefs({ accent: c }); A.$$('#lkAcc button', b).forEach((y) => y.classList.toggle('on', y.dataset.c === c)); };
    A.$$('#lkAcc button', b).forEach((x) => (x.onclick = () => setAcc(x.dataset.c)));
    A.$('#lkCustom', b).onchange = (e) => setAcc(e.target.value);
    A.$('#lkIntro', b).onchange = (e) => { A.savePrefs({ intro: e.target.checked }); A.ls.set('intro', e.target.checked); };
    A.$('#lkSnd', b).onchange = (e) => A.savePrefs({ sounds: e.target.checked });
    A.$('#lkCol', b).onchange = (e) => { A.ls.set('collapsed', e.target.checked); A.$('#app').classList.toggle('collapsed', e.target.checked); };
    A.$('#lkReplay', b).onclick = () => {
      if (document.getElementById('intro')) return;
      document.body.appendChild(A.h(`<div id="intro" class="intro">${introMarkup()}</div>`));
      A.sound('whoosh');
      A.playIntro(false);
    };
  }
  function introMarkup() {
    return `<canvas id="introCanvas"></canvas><div class="intro-center"><svg class="intro-logo" viewBox="0 0 120 120" width="140" height="140"><defs><linearGradient id="ig2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c3b5ff"/><stop offset=".5" stop-color="#9b87f5"/><stop offset="1" stop-color="#20c997"/></linearGradient></defs><polygon class="il-hex" points="60,6 107,33 107,87 60,114 13,87 13,33" fill="none" stroke="url(#ig2)" stroke-width="3"/><path class="il-a" d="M36 88 L60 30 L84 88" fill="none" stroke="url(#ig2)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path class="il-bar" d="M45 68 L75 68" fill="none" stroke="url(#ig2)" stroke-width="7" stroke-linecap="round"/><circle class="il-dot" cx="60" cy="30" r="5" fill="#fff"/></svg><h1 class="intro-title"><span>A</span><span>Y</span><span>R</span><span>A</span></h1><div class="intro-sub">design</div><div class="intro-tag">Oyun Tasarım Stüdyosu</div><div class="intro-bar"><i></i></div></div><button class="intro-skip" id="introSkip">Geç ›</button>`;
  }

  function security(b) {
    b.innerHTML = `<div class="card"><div class="card-title">${A.icon('key-round')} Şifre değiştir</div>
      <div class="field"><label>Mevcut şifre</label><input class="input" type="password" id="scCur" autocomplete="current-password"></div>
      <div class="row"><div class="field"><label>Yeni şifre</label><input class="input" type="password" id="scNew" autocomplete="new-password"></div><div class="field"><label>Yeni şifre (tekrar)</label><input class="input" type="password" id="scNew2" autocomplete="new-password"></div></div>
      <div class="pw-meter"><i id="scMeter"></i></div><div class="small muted" id="scHint" style="margin:4px 0 12px"></div>
      <button class="btn primary" id="scSave">Şifreyi güncelle</button></div>
      <div class="card" style="margin-top:16px"><div class="card-title">${A.icon('laptop')} Aktif oturumlar</div><div id="scSess"><div class="loader"></div></div></div>`;
    const meter = () => {
      const v = A.$('#scNew', b).value;
      let s = 0; if (v.length >= 6) s++; if (v.length >= 10) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      const c = ['#ff6b6b', '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#20c997'][s];
      A.$('#scMeter', b).style.cssText = `width:${(s / 5) * 100}%;background:${c}`;
      A.$('#scHint', b).textContent = v ? ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü', 'Çok güçlü'][s] : 'En az 6 karakter; harf, rakam ve sembol karışımı önerilir.';
    };
    A.$('#scNew', b).oninput = meter; meter();
    A.$('#scSave', b).onclick = async () => {
      const cur = A.$('#scCur', b).value, nw = A.$('#scNew', b).value, nw2 = A.$('#scNew2', b).value;
      if (nw !== nw2) return A.toast('Yeni şifreler eşleşmiyor', 'err');
      try { await A.put('/api/me/password', { current: cur, next: nw }); A.toast('Şifreniz güncellendi. Diğer cihazlardaki oturumlar kapatıldı.', 'ok'); A.$$('input', b).forEach((i) => (i.value = '')); loadSess(); } catch (e) { A.err(e); }
    };
    const loadSess = async () => {
      const list = await A.get('/api/me/sessions');
      const box = A.$('#scSess', b);
      if (!box) return;
      box.innerHTML = list.reverse().map((s) => `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line)">${A.icon(/mobile|android|iphone/i.test(s.ua) ? 'smartphone' : 'laptop')}<div class="grow"><div class="small">${A.esc(uaName(s.ua))} ${s.current ? '<span class="badge green">Bu cihaz</span>' : ''}</div><div class="small muted">${A.timeAgo(s.createdAt)} giriş yapıldı</div></div>${s.current ? '' : `<button class="btn xs danger" data-id="${s.id}">Oturumu kapat</button>`}</div>`).join('');
      A.icons(box);
      A.$$('[data-id]', box).forEach((x) => (x.onclick = async () => { await A.del('/api/me/sessions/' + x.dataset.id); loadSess(); }));
    };
    const uaName = (ua) => (/Electron/.test(ua) ? 'Ayra Design Masaüstü' : /Edg/.test(ua) ? 'Microsoft Edge' : /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Tarayıcı') + (/Windows/.test(ua) ? ' · Windows' : /Mac/.test(ua) ? ' · macOS' : /Linux/.test(ua) ? ' · Linux' : /Android/.test(ua) ? ' · Android' : '');
    loadSess();
  }

  async function stats(b) {
    b.innerHTML = '<div class="loader"></div>';
    const me = A.state.user.id;
    const [tasks, notes, bugs, ideas, files] = await Promise.all(['tasks', 'notes', 'bugs', 'ideas', 'files'].map((c) => A.col.list(c)));
    const done = tasks.filter((t) => t.assignee === me && t.status === 'done').length;
    const cards = [['check-circle-2', 'Tamamlanan görev', done, 'var(--mint)'], ['list-todo', 'Açık görev', tasks.filter((t) => t.assignee === me && t.status !== 'done').length, 'var(--accent)'], ['notebook-pen', 'Not', notes.filter((n) => n.createdBy === me).length, 'var(--blue)'], ['bug', 'Bildirilen hata', bugs.filter((x) => x.createdBy === me).length, 'var(--pink)'], ['lightbulb', 'Fikir', ideas.filter((x) => x.createdBy === me).length, 'var(--yellow)'], ['upload', 'Yüklenen dosya', files.filter((x) => x.createdBy === me && !x.hidden).length, 'var(--orange)']];
    const level = Math.floor(Math.sqrt(done * 4 + ideas.filter((x) => x.createdBy === me).length * 2 + notes.filter((n) => n.createdBy === me).length)) + 1;
    b.innerHTML = `<div class="card lvl-card"><div class="lvl-badge">${level}</div><div class="grow"><b>Tasarımcı Seviyesi ${level}</b><div class="small muted">Görev tamamladıkça, fikir ve not ekledikçe seviye atlarsın 🎮</div><div class="progress" style="margin-top:8px"><i style="width:${((Math.sqrt(done * 4 + 1) % 1) * 100).toFixed(0)}%"></i></div></div></div>
      <div class="grid c3 stagger" style="margin-top:16px">${cards.map(([ic, l, n, c]) => `<div class="card stat"><div class="st-ico" style="color:${c};background:color-mix(in srgb, ${c} 15%, transparent)">${A.icon(ic)}</div><div><div class="st-n" data-n="${n}">0</div><div class="st-l">${l}</div></div></div>`).join('')}</div>`;
    A.icons(b);
    A.$$('.st-n', b).forEach((n) => A.countUp(n, +n.dataset.n));
  }
})();
