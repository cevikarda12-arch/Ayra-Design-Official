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
        <div class="tabs">${[['profile', 'user', 'Profil'], ['look', 'palette', 'Görünüm'], ...(A.desktop ? [['app', 'monitor', 'Uygulama']] : []), ['security', 'lock', 'Güvenlik'], ['stats', 'bar-chart-3', 'İstatistiklerim']].map(([k, ic, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${A.icon(ic)} ${l}</button>`).join('')}</div>
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
      const show = (t) => { body.innerHTML = ''; ({ profile, look, security, stats, app: appTab })[t](body); A.icons(body); };
      show(['profile', 'look', 'security', 'stats', ...(A.desktop ? ['app'] : [])].includes(tab) ? tab : 'profile');
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
    let p = { ...(A.state.user.prefs || {}) };
    const cur = () => p.theme || 'dark';
    const base = () => A.THEMES[cur()] || A.THEMES.dark;
    let custom = { ...(p.customTheme || { ...A.THEMES.dark, name: 'Özel tema' }) };
    let pend = {};
    const flush = A.debounce(() => { const x = pend; pend = {}; A.savePrefs(x); }, 400);
    const save = (patch) => { Object.assign(pend, patch); flush(); };
    const apply = (patch, persist = true) => { p = { ...p, ...patch }; A.applyAppearance(p); if (persist) save(patch); };
    const prev = (t) => `<div class="tp-prev" style="background:${t.bg}"><i style="background:${t.panel}"></i><i style="background:${t.panel}"><s style="background:${t.text}"></s></i><b style="background:${t.accent}"></b><u style="background:${t.accent2}"></u></div>`;
    const draw = () => {
      const isCustom = cur() === 'custom';
      b.innerHTML = `<div class="card"><div class="card-title">${A.icon('palette')} Hazır temalar</div>
        <div class="theme-pick">${Object.entries(A.THEMES).map(([k, t]) => `<button data-th="${k}" class="${cur() === k ? 'on' : ''}">${prev(t)}${A.esc(t.name)}</button>`).join('')}
          <button data-th="custom" class="${isCustom ? 'on' : ''}">${prev(custom)}${A.icon('wand-2')} Özel tema</button></div>
        ${!isCustom ? `<div class="label" style="margin:20px 0 10px">Vurgu rengi</div>
        <div class="color-dots" id="lkAcc">${[base().accent, ...ACCENTS.filter((c) => c !== base().accent)].map((c) => `<button data-c="${c}" style="background:${c};width:32px;height:32px" class="${(p.accent || base().accent) === c ? 'on' : ''}"></button>`).join('')}<input type="color" id="lkCustom" value="${A.esc(p.accent || base().accent)}" title="Kendi rengini seç"></div>` : ''}
      </div>
      ${isCustom ? `<div class="card" style="margin-top:16px"><div class="card-title">${A.icon('wand-2')} Özel tema editörü <span class="small muted">— değişiklikler anında uygulanır</span></div>
        <div class="seg" style="margin-bottom:14px"><button data-base="dark" class="${custom.base !== 'light' ? 'on' : ''}">${A.icon('moon')} Koyu taban</button><button data-base="light" class="${custom.base === 'light' ? 'on' : ''}">${A.icon('sun')} Açık taban</button></div>
        <div class="theme-editor">${[['bg', 'Arka plan'], ['panel', 'Paneller / kartlar'], ['text', 'Yazı'], ['accent', 'Ana vurgu'], ['accent2', 'İkinci vurgu']].map(([k, l]) => `<label class="te-row"><input type="color" data-k="${k}" value="${A.esc(custom[k])}"><div><b>${l}</b><div class="small muted mono">${A.esc(custom[k])}</div></div></label>`).join('')}</div>
        <div class="row wrap" style="margin-top:14px;gap:8px"><span class="small muted">Bir temadan başla:</span>${Object.entries(A.THEMES).map(([k, t]) => `<button class="btn xs" data-from="${k}"><i style="width:10px;height:10px;border-radius:50%;background:${t.accent};display:inline-block"></i>${A.esc(t.name)}</button>`).join('')}
          <button class="btn xs" id="teRand">${A.icon('shuffle')} Rastgele</button></div>
        <div class="row" style="margin-top:12px;gap:8px"><button class="btn sm" id="teCopy">${A.icon('copy')} Tema kodunu kopyala</button><button class="btn sm" id="tePaste">${A.icon('clipboard-list')} Tema kodu yapıştır</button></div>
      </div>` : ''}
      <div class="card" style="margin-top:16px"><div class="card-title">${A.icon('sliders-horizontal')} Arayüz</div>
        <div class="pref-row"><div><b>Köşe yuvarlaklığı</b><div class="small muted">Keskin köşelerden yumuşak hatlara</div></div><div class="row" style="gap:10px"><input type="range" min="0" max="2" step="0.1" id="lkRad" value="${p.radius == null ? 1 : p.radius}"><span class="radius-demo"></span></div></div>
        ${A.desktop ? `<div class="pref-row"><div><b>Arayüz boyutu</b><div class="small muted">Yazı ve öğelerin büyüklüğü</div></div><div class="row" style="gap:10px"><input type="range" min="0.8" max="1.3" step="0.05" id="lkZoom" value="${p.uiScale || 1}"><b id="lkZoomV" class="small" style="width:44px">%${Math.round((p.uiScale || 1) * 100)}</b></div></div>` : ''}
        <label class="pref-row"><div><b>Animasyonlar</b><div class="small muted">Geçiş ve hareket efektleri</div></div><label class="switch"><input type="checkbox" id="lkAnim" ${p.animations !== false ? 'checked' : ''}><span></span></label></label>
        <label class="pref-row"><div><b>Açılış animasyonu</b><div class="small muted">Uygulama açılırken Ayra Design animasyonunu göster</div></div><label class="switch"><input type="checkbox" id="lkIntro" ${p.intro !== false ? 'checked' : ''}><span></span></label></label>
        <label class="pref-row"><div><b>Arayüz sesleri</b><div class="small muted">Bildirim ve etkileşim sesleri</div></div><label class="switch"><input type="checkbox" id="lkSnd" ${p.sounds !== false ? 'checked' : ''}><span></span></label></label>
        <label class="pref-row"><div><b>Kompakt menü</b><div class="small muted">Kenar menüsünü daraltılmış başlat</div></div><label class="switch"><input type="checkbox" id="lkCol" ${A.ls.get('collapsed') ? 'checked' : ''}><span></span></label></label>
        <div class="row" style="margin-top:12px;gap:8px"><button class="btn sm" id="lkReplay">${A.icon('play')} Açılış animasyonunu oynat</button><button class="btn sm ghost" id="lkReset">${A.icon('refresh-cw')} Varsayılana dön</button></div>
      </div>`;
      A.icons(b);
      A.$$('[data-th]', b).forEach((x) => (x.onclick = () => { apply({ theme: x.dataset.th, accent: null, ...(x.dataset.th === 'custom' ? { customTheme: custom } : {}) }); draw(); }));
      A.$$('#lkAcc button', b).forEach((x) => (x.onclick = () => { apply({ accent: x.dataset.c }); A.$$('#lkAcc button', b).forEach((y) => y.classList.toggle('on', y === x)); }));
      const lc = A.$('#lkCustom', b); if (lc) lc.oninput = (e) => apply({ accent: e.target.value });
      A.$$('[data-k]', b).forEach((x) => (x.oninput = () => { custom[x.dataset.k] = x.value; x.parentElement.querySelector('.mono').textContent = x.value; apply({ customTheme: { ...custom } }); }));
      A.$$('[data-base]', b).forEach((x) => (x.onclick = () => { custom.base = x.dataset.base; apply({ customTheme: { ...custom } }); draw(); }));
      A.$$('[data-from]', b).forEach((x) => (x.onclick = () => { custom = { ...A.THEMES[x.dataset.from], name: 'Özel tema' }; apply({ customTheme: { ...custom } }); draw(); }));
      const rnd = A.$('#teRand', b);
      if (rnd) rnd.onclick = () => {
        const h = Math.random() * 360, dark = Math.random() < 0.75;
        const hsl = (hh, s, l) => { s /= 100; l /= 100; const k = (n) => (n + hh / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
        custom = { name: 'Özel tema', base: dark ? 'dark' : 'light', bg: hsl(h, 30, dark ? 5 : 96), panel: hsl(h, 25, dark ? 10 : 100), text: hsl(h, 20, dark ? 93 : 12), accent: hsl((h + 30) % 360, 80, dark ? 68 : 50), accent2: hsl((h + 160) % 360, 70, dark ? 55 : 42) };
        apply({ customTheme: { ...custom } }); draw();
      };
      const cp = A.$('#teCopy', b);
      if (cp) cp.onclick = () => navigator.clipboard.writeText('AYRA-TEMA:' + btoa(JSON.stringify(custom))).then(() => A.toast('Tema kodu kopyalandı — ekip arkadaşlarınla paylaşabilirsin', 'ok'));
      const ps = A.$('#tePaste', b);
      if (ps) ps.onclick = async () => {
        const code = await A.prompt('Tema kodunu yapıştırın', { placeholder: 'AYRA-TEMA:...' });
        if (!code) return;
        try { const t = JSON.parse(atob(code.trim().replace(/^AYRA-TEMA:/, ''))); ['bg', 'panel', 'text', 'accent', 'accent2'].forEach((k) => { if (!/^#[0-9a-f]{6}$/i.test(t[k])) throw new Error(); }); custom = { name: 'Özel tema', base: t.base === 'light' ? 'light' : 'dark', bg: t.bg, panel: t.panel, text: t.text, accent: t.accent, accent2: t.accent2 }; apply({ customTheme: { ...custom } }); draw(); A.toast('Tema uygulandı', 'ok'); } catch { A.toast('Geçersiz tema kodu', 'err'); }
      };
      A.$('#lkRad', b).oninput = (e) => apply({ radius: Number(e.target.value) });
      const z = A.$('#lkZoom', b); if (z) z.oninput = (e) => { A.$('#lkZoomV', b).textContent = '%' + Math.round(e.target.value * 100); apply({ uiScale: Number(e.target.value) }); };
      A.$('#lkAnim', b).onchange = (e) => apply({ animations: e.target.checked });
      A.$('#lkIntro', b).onchange = (e) => { apply({ intro: e.target.checked }); A.ls.set('intro', e.target.checked); };
      A.$('#lkSnd', b).onchange = (e) => apply({ sounds: e.target.checked });
      A.$('#lkCol', b).onchange = (e) => { A.ls.set('collapsed', e.target.checked); A.$('#app').classList.toggle('collapsed', e.target.checked); };
      A.$('#lkReset', b).onclick = () => { apply({ theme: 'dark', accent: null, radius: 1, uiScale: 1, animations: true }); draw(); A.toast('Varsayılan görünüm geri yüklendi', 'ok'); };
      A.$('#lkReplay', b).onclick = () => {
        if (document.getElementById('intro')) return;
        document.body.appendChild(A.h(`<div id="intro" class="intro">${introMarkup()}</div>`));
        A.sound('whoosh');
        A.playIntro(false);
      };
    };
    draw();
  }
  function introMarkup() {
    return A.introHTML;
  }

  async function appTab(b) {
    const info = await window.ayraDesktop.appInfo();
    const st = (u) => ({ idle: 'Henüz denetlenmedi', checking: 'Denetleniyor...', latest: 'En güncel sürümü kullanıyorsunuz ✓', downloading: `v${u.version} indiriliyor... %${u.percent || 0}`, downloaded: `v${u.version} hazır — yeniden başlatınca kurulacak`, error: 'Denetlenemedi: ' + (u.error || ''), dev: 'Geliştirici modunda güncelleme yapılmaz' }[u.state] || '');
    b.innerHTML = `<div class="card"><div class="card-title">${A.icon('refresh-cw')} Güncellemeler</div>
        <div class="row wrap" style="gap:14px"><span class="logo-mark" style="height:54px"></span><div class="grow"><b>Ayra Design v${A.esc(info.version)}</b><div class="small muted" id="apSt">${A.esc(st(A.updateState.state !== 'idle' ? A.updateState : info.update))}</div></div>
        <button class="btn" id="apChk">${A.icon('refresh-cw')} Güncellemeleri denetle</button>${(A.updateState.state === 'downloaded') ? `<button class="btn primary" id="apInst">${A.icon('download')} Şimdi kur</button>` : ''}</div>
        <p class="small muted" style="margin-bottom:0">Uygulama yeni sürümleri arka planda kendisi indirir; siz uygulamayı kapatıp açtığınızda (veya “Güncelle”ye bastığınızda) kurulur. Silip yeniden indirmenize gerek yok. Verileriniz korunur.</p></div>
      <div class="card" style="margin-top:16px"><div class="card-title">${A.icon('monitor')} Masaüstü</div>
        <label class="pref-row"><div><b>Kapatınca arka planda çalış</b><div class="small muted">Pencereyi kapattığınızda uygulama sağ alttaki sistem tepsisine (saatin yanı) küçülür; ekibiniz bağlı kalır. Tamamen kapatmak için simgeye sağ tıklayıp “Çıkış” deyin.</div></div><label class="switch"><input type="checkbox" id="apTray" ${info.closeToTray ? 'checked' : ''}><span></span></label></label>
        <label class="pref-row"><div><b>Windows açılışında başlat</b><div class="small muted">Bilgisayar açıldığında Ayra Design tepside sessizce başlar.</div></div><label class="switch"><input type="checkbox" id="apLogin" ${info.openAtLogin ? 'checked' : ''}><span></span></label></label></div>`;
    A.icons(b);
    A.$('#apChk', b).onclick = () => { window.ayraDesktop.checkUpdates(); A.$('#apSt', b).textContent = 'Denetleniyor...'; };
    const ins = A.$('#apInst', b); if (ins) ins.onclick = () => window.ayraDesktop.installUpdate();
    A.$('#apTray', b).onchange = (e) => { window.ayraDesktop.setDesktopPref('closeToTray', e.target.checked); A.toast('Kaydedildi', 'ok'); };
    A.$('#apLogin', b).onchange = (e) => { window.ayraDesktop.setDesktopPref('openAtLogin', e.target.checked); A.toast('Kaydedildi', 'ok'); };
    A.viewOn('update', (u) => { const el = A.$('#apSt', b); if (el) el.textContent = st(u); });
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
