/* Tasarım Araçları */
(function () {
  const TABS = [['dice', 'dices', 'Zar Atıcı'], ['names', 'wand-2', 'İsim Üretici'], ['idea', 'sparkles', 'Oyun Fikri Üretici'], ['palette', 'palette', 'Renk Paleti'], ['xp', 'trending-up', 'XP Eğrisi'], ['loot', 'gem', 'Ganimet Simülatörü'], ['pomo', 'timer', 'Pomodoro']];

  // ---------------------------------------------------------------- Pomodoro (global)
  A.pomo = A.ls.get('pomo', { work: 25, short: 5, long: 15, mode: 'work', endAt: null, left: 25 * 60, count: 0 });
  const POMO_LABEL = { work: 'Odaklan', short: 'Kısa mola', long: 'Uzun mola' };
  const pomoSave = () => A.ls.set('pomo', A.pomo);
  const pomoLeft = () => (A.pomo.endAt ? Math.max(0, Math.round((A.pomo.endAt - Date.now()) / 1000)) : A.pomo.left);
  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  A.startPomodoro = () => { if (!A.pomo.endAt) { A.pomo.endAt = Date.now() + A.pomo.left * 1000; pomoSave(); A.toast(`${POMO_LABEL[A.pomo.mode]}: ${fmt(A.pomo.left)} başladı`, 'info', '⏱️ Pomodoro'); } A.renderTimerChip(); };
  A.pausePomodoro = () => { if (A.pomo.endAt) { A.pomo.left = pomoLeft(); A.pomo.endAt = null; pomoSave(); } A.renderTimerChip(); };
  A.resetPomodoro = (mode = A.pomo.mode) => { A.pomo.mode = mode; A.pomo.endAt = null; A.pomo.left = A.pomo[mode] * 60; pomoSave(); A.renderTimerChip(); };
  A.renderTimerChip = () => {
    const el = A.$('#timerChip');
    if (!el) return;
    if (!A.pomo.endAt) { el.innerHTML = ''; return; }
    el.innerHTML = `<button class="btn sm pomo-chip ${A.pomo.mode}" title="${POMO_LABEL[A.pomo.mode]} — tıkla">${A.icon('timer')}<b>${fmt(pomoLeft())}</b></button>`;
    A.icons(el);
    A.$('button', el).onclick = () => A.go('tools/pomo');
  };
  setInterval(() => {
    if (!A.pomo.endAt) return;
    const left = pomoLeft();
    const chip = A.$('#timerChip b'); if (chip) chip.textContent = fmt(left);
    const big = A.$('#pomoBig'); if (big) big.textContent = fmt(left);
    const ring = A.$('#pomoRing'); if (ring) ring.style.strokeDashoffset = 565 * (left / (A.pomo[A.pomo.mode] * 60));
    if (left <= 0) {
      const was = A.pomo.mode;
      if (was === 'work') A.pomo.count++;
      const next = was === 'work' ? (A.pomo.count % 4 === 0 ? 'long' : 'short') : 'work';
      A.resetPomodoro(next);
      A.sound('done');
      A.toast(was === 'work' ? 'Harika iş! Mola zamanı ☕' : 'Mola bitti, odaklanma zamanı 🎯', 'ok', '⏱️ Pomodoro');
      if (window.ayraDesktop) window.ayraDesktop.notify('Pomodoro', was === 'work' ? 'Mola zamanı!' : 'Odaklanma zamanı!');
      if (A.current && A.current.id === 'tools') A.route();
    }
  }, 1000);

  // ---------------------------------------------------------------- data
  const SYL = {
    fantasy: [['Ar', 'El', 'Thal', 'Mor', 'Kae', 'Ly', 'Ser', 'Val', 'Dra', 'Is', 'Fen', 'Gal', 'Ora', 'Zy'], ['an', 'or', 'ia', 'en', 'is', 'eth', 'ara', 'ion', 'yl', 'wen', 'dor', 'iel', 'as', 'ith']],
    elf: [['Ael', 'Ela', 'Syl', 'Thra', 'Lir', 'Fae', 'Nim', 'Gil', 'Ith', 'Cae'], ['ariel', 'endil', 'anor', 'wyn', 'thas', 'liel', 'adris', 'oren', 'ielle', 'awen']],
    orc: [['Gro', 'Mak', 'Thra', 'Kru', 'Dur', 'Gor', 'Bal', 'Zug', 'Ruk', 'Skar'], ['nak', 'gash', 'tok', 'mok', 'dur', 'gul', 'rak', 'zog', 'bash', 'grim']],
    scifi: [['Zen', 'Kor', 'Nex', 'Vex', 'Tal', 'Ryn', 'Qua', 'Xel', 'Ion', 'Sol'], ['-7', 'ix', 'on', 'ar', 'us', '-X', 'tron', 'ra', 'is', '-42']],
    turk: [['Ay', 'Al', 'Bo', 'Ka', 'Tu', 'Ce', 'Er', 'Ya', 'Ok', 'Ta'], ['tay', 'gan', 'kut', 'ra', 'man', 'han', 'ruk', 'lun', 'çın', 'kın']],
  };
  const PLACE = [['Kara', 'Gümüş', 'Kızıl', 'Sisli', 'Fırtına', 'Kadim', 'Unutulmuş', 'Gölge', 'Altın', 'Buzul', 'Yıldız', 'Kayıp'], ['Orman', 'Vadi', 'Kale', 'Liman', 'Mağara', 'Tapınak', 'Bataklık', 'Dağ', 'Şehir', 'Köy', 'Çöl', 'Ada']];
  const ITEM = [['Kadim', 'Lanetli', 'Kutsal', 'Ejderha', 'Gölge', 'Buz', 'Ateş', 'Fırtına', 'Kral', 'Ruh', 'Yıldız', 'Kan'], ['Kılıcı', 'Kalkanı', 'Asası', 'Yayı', 'Tılsımı', 'Yüzüğü', 'Zırhı', 'Baltası', 'Hançeri', 'Pelerini', 'Tacı', 'İksiri']];
  const IDEA = {
    genre: ['Rogue-like', 'Platform', 'Bulmaca', 'Metroidvania', 'Kart oyunu', 'Strateji', 'Hayatta kalma', 'Ritim oyunu', 'Görsel roman', 'Kule savunma', 'Simülasyon', 'Korku', 'Yarış', 'Dövüş', 'Şehir kurma', 'Gizlilik'],
    setting: ['batmakta olan bir gemide', 'dev bir kaplumbağanın sırtında', 'terk edilmiş bir uzay istasyonunda', 'rüyalar dünyasında', 'ortaçağ İstanbul\'unda', 'bir kütüphanenin içinde', 'buzul çağında', 'mikroskobik bir dünyada', 'sonsuz bir trende', 'bulutların üzerinde', 'su altı şehrinde', 'bir oyuncak kutusunda'],
    mechanic: ['zamanı geri sarma', 'yerçekimini değiştirme', 'gölgelere dönüşme', 'sadece ses ile görme', 'iki karakteri aynı anda kontrol etme', 'her ölümde farklı bir canlı olarak doğma', 'renkleri çalma', 'dünyayı döndürme', 'büyü kelimelerini birleştirme', 'eşyaları küçültüp büyütme', 'düşmanları müttefik yapma', 'ritme göre hareket etme'],
    twist: ['ama ana karakter kör.', 'ama her şey 10 dakika içinde bitmeli.', 'ama oyuncu aslında kötü karakter.', 'ama ışık yalnızca 3 saniye yanıyor.', 'ama oyun dünyası her gün değişiyor.', 'ama hiç silah yok.', 'ama tek tuşla oynanıyor.', 'ama bütün NPC\'ler yalan söylüyor.', 'ama her hamle bir anıyı siliyor.', 'ama oyuncu sadece kaçabilir.'],
  };

  A.register('tools', {
    title: 'Tasarım Araçları', icon: 'wrench', group: 'kaynak', scoped: false,
    render(el, [tab]) {
      tab = TABS.find((t) => t[0] === tab) ? tab : A.ls.get('toolTab', 'dice');
      el.innerHTML = `<div class="page-head"><div><h1>Tasarım Araçları</h1><p>Oyun tasarımcılarının günlük işlerini hızlandıran küçük araçlar.</p></div></div>
        <div class="tabs">${TABS.map(([k, ic, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${A.icon(ic)} ${l}</button>`).join('')}</div>
        <div id="tBody"></div>`;
      A.icons(el);
      A.$$('.tabs button', el).forEach((b) => (b.onclick = () => { A.ls.set('toolTab', b.dataset.t); history.replaceState(null, '', '#/tools/' + b.dataset.t); A.$$('.tabs button', el).forEach((x) => x.classList.toggle('on', x === b)); show(b.dataset.t); }));
      const body = A.$('#tBody', el);
      const show = (t) => { body.innerHTML = ''; body.className = 'tool-body'; void body.offsetWidth; body.classList.add('fade-in'); ({ dice, names, idea, palette, xp, loot, pomo })[t](body); A.icons(body); };
      show(tab);
    },
  });

  // ---------------------------------------------------------------- dice
  function dice(b) {
    const hist = A.ls.get('diceHist', []);
    b.innerHTML = `<div class="grid c2"><div class="card">
      <div class="card-title">${A.icon('dices')} Zar At</div>
      <div class="row wrap" style="gap:6px;margin-bottom:14px">${[4, 6, 8, 10, 12, 20, 100].map((n) => `<button class="btn die-btn" data-d="1d${n}">d${n}</button>`).join('')}</div>
      <div class="row"><input class="input mono" id="dExpr" value="2d6+3" placeholder="Örn: 3d6+2, 1d20, 4d6kh3"><button class="btn primary" id="dRoll">${A.icon('dices')} At</button></div>
      <p class="small muted">Gösterim: <code>XdY+Z</code> · en yüksek N zarı tut: <code>4d6kh3</code></p>
      <div class="dice-result" id="dRes"><div class="dice-big">?</div></div>
    </div><div class="card"><div class="card-title">${A.icon('bar-chart-3')} Olasılık Dağılımı <span class="small muted" id="dStat"></span></div><div id="dChart"></div>
    <div class="card-title" style="margin-top:16px">${A.icon('history')} Geçmiş</div><div id="dHist" class="small"></div></div></div>`;
    const parse = (s) => { const m = s.replace(/\s/g, '').toLowerCase().match(/^(\d*)d(\d+)(kh(\d+))?([+-]\d+)?$/); if (!m) return null; return { n: A.clamp(+m[1] || 1, 1, 100), s: A.clamp(+m[2], 2, 1000), kh: m[4] ? +m[4] : null, mod: +(m[5] || 0) }; };
    const roll = () => {
      const expr = A.$('#dExpr', b).value;
      const p = parse(expr);
      if (!p) return A.toast('Geçersiz zar ifadesi', 'err');
      const rolls = Array.from({ length: p.n }, () => 1 + Math.floor(Math.random() * p.s));
      const kept = p.kh ? [...rolls].sort((x, y) => y - x).slice(0, p.kh) : rolls;
      const total = kept.reduce((s, x) => s + x, 0) + p.mod;
      const res = A.$('#dRes', b);
      res.innerHTML = `<div class="dice-big rolling">${total}</div><div class="dice-chips">${rolls.map((r) => `<span class="${p.kh && !kept.includes(r) ? 'drop' : ''} ${r === p.s ? 'crit' : r === 1 ? 'fail' : ''}">${r}</span>`).join('')}${p.mod ? `<span class="mod">${p.mod > 0 ? '+' : ''}${p.mod}</span>` : ''}</div>`;
      A.sound('pop');
      if (p.n === 1 && p.s === 20 && rolls[0] === 20) { A.confetti(60); A.toast('KRİTİK BAŞARI! 🎉', 'ok'); }
      hist.unshift(`${expr} → ${total} [${rolls.join(', ')}]`); hist.splice(12);
      A.ls.set('diceHist', hist); drawHist(); chart(p, total);
    };
    const drawHist = () => (A.$('#dHist', b).innerHTML = hist.map((h) => `<div class="mono" style="padding:3px 0;border-bottom:1px solid var(--line)">${A.esc(h)}</div>`).join('') || '<span class="muted">Henüz atış yok</span>');
    const chart = (p, hl) => {
      // dağılımı simülasyonla hesapla (kh dahil her durum için)
      const N = 20000, counts = {};
      for (let i = 0; i < N; i++) { const r = Array.from({ length: p.n }, () => 1 + Math.floor(Math.random() * p.s)); const k = p.kh ? r.sort((x, y) => y - x).slice(0, p.kh) : r; const t = k.reduce((s, x) => s + x, 0) + p.mod; counts[t] = (counts[t] || 0) + 1; }
      const keys = Object.keys(counts).map(Number).sort((x, y) => x - y);
      const max = Math.max(...Object.values(counts));
      const mean = keys.reduce((s, k) => s + k * counts[k], 0) / N;
      A.$('#dStat', b).textContent = `ortalama ≈ ${mean.toFixed(2)} · min ${keys[0]} · max ${keys[keys.length - 1]}`;
      const show = keys.length > 60 ? keys.filter((_, i) => i % Math.ceil(keys.length / 60) === 0) : keys;
      A.$('#dChart', b).innerHTML = `<div class="hist">${show.map((k) => `<div class="hb ${k === hl ? 'hl' : ''}" style="height:${(counts[k] / max) * 100}%" title="${k}: %${((counts[k] / N) * 100).toFixed(1)}"><span>${show.length <= 24 ? k : ''}</span></div>`).join('')}</div>`;
    };
    A.$$('[data-d]', b).forEach((x) => (x.onclick = () => { A.$('#dExpr', b).value = x.dataset.d; roll(); }));
    A.$('#dRoll', b).onclick = roll;
    A.$('#dExpr', b).onkeydown = (e) => { if (e.key === 'Enter') roll(); };
    drawHist(); chart(parse('2d6+3'));
  }

  // ---------------------------------------------------------------- names
  function names(b) {
    b.innerHTML = `<div class="card"><div class="row wrap" style="gap:8px;margin-bottom:14px">
      <select class="select" id="nType" style="width:220px"><option value="fantasy">Fantastik karakter</option><option value="elf">Elf</option><option value="orc">Ork / Cüce</option><option value="scifi">Bilim kurgu</option><option value="turk">Türk mitolojisi esintili</option><option value="place">Mekan adı</option><option value="item">Eşya adı</option></select>
      <button class="btn primary" id="nGen">${A.icon('wand-2')} Üret</button><span class="small muted">İsme tıklayarak kopyalayın</span></div>
      <div class="name-grid" id="nOut"></div></div>`;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const gen = () => {
      const t = A.$('#nType', b).value;
      const out = Array.from({ length: 18 }, () => {
        if (t === 'place') return `${pick(PLACE[0])} ${pick(PLACE[1])}`;
        if (t === 'item') return `${pick(ITEM[0])} ${pick(ITEM[1])}`;
        const [a, c] = SYL[t];
        let n = pick(a) + (Math.random() < 0.35 ? pick(c).slice(0, 2) : '') + pick(c);
        return n.charAt(0).toUpperCase() + n.slice(1);
      });
      const box = A.$('#nOut', b);
      box.innerHTML = out.map((n, i) => `<button class="name-chip" style="animation-delay:${i * 25}ms">${A.esc(n)}</button>`).join('');
      A.$$('.name-chip', box).forEach((x) => (x.onclick = () => navigator.clipboard.writeText(x.textContent).then(() => A.toast(`“${x.textContent}” kopyalandı`, 'ok'))));
    };
    A.$('#nGen', b).onclick = gen;
    A.$('#nType', b).onchange = gen;
    gen();
  }

  // ---------------------------------------------------------------- game idea
  function idea(b) {
    const locks = {};
    let cur = {};
    b.innerHTML = `<div class="card idea-gen"><p class="muted" style="margin-top:0">Yaratıcı tıkanıklık mı? Rastgele bir oyun konsepti üretin, beğendiğiniz kısımları kilitleyin ve tekrar karıştırın.</p>
      <div class="ig-slots" id="igS"></div>
      <div class="row" style="margin-top:18px"><button class="btn primary" id="igGo">${A.icon('shuffle')} Karıştır</button>${A.can('create') ? `<button class="btn" id="igSave">${A.icon('lightbulb')} Fikir duvarına ekle</button>` : ''}</div></div>`;
    const keys = [['genre', 'Tür'], ['setting', 'Mekan'], ['mechanic', 'Ana mekanik'], ['twist', 'Ters köşe']];
    const draw = () => {
      A.$('#igS', b).innerHTML = keys.map(([k, l]) => `<div class="ig-slot ${locks[k] ? 'locked' : ''}" data-k="${k}"><div class="small muted">${l}</div><b>${A.esc(cur[k])}</b><button class="btn xs ghost" data-lock="${k}">${A.icon(locks[k] ? 'lock' : 'unlock')}</button></div>`).join('') + `<div class="ig-sentence">🎮 <b>${A.esc(cur.genre)}</b> türünde, <b>${A.esc(cur.setting)}</b> geçen, <b>${A.esc(cur.mechanic)}</b> mekaniğine dayanan bir oyun — <i>${A.esc(cur.twist)}</i></div>`;
      A.icons(A.$('#igS', b));
      A.$$('[data-lock]', b).forEach((x) => (x.onclick = () => { locks[x.dataset.lock] = !locks[x.dataset.lock]; draw(); }));
    };
    const go = () => { keys.forEach(([k]) => { if (!locks[k] || !cur[k]) cur[k] = IDEA[k][Math.floor(Math.random() * IDEA[k].length)]; }); draw(); A.$$('.ig-slot:not(.locked) b', b).forEach((x) => x.animate([{ transform: 'translateY(-10px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 350, easing: 'ease-out' })); };
    A.$('#igGo', b).onclick = go;
    const sv = A.$('#igSave', b);
    if (sv) sv.onclick = async () => { if (!A.state.projectId) return A.toast('Önce bir proje seçin', 'err'); try { await A.col.create('ideas', { projectId: A.state.projectId, text: `${cur.genre}: ${cur.setting}, ${cur.mechanic} — ${cur.twist}`, color: '#b197fc', category: 'Mekanik', x: 60 + Math.random() * 400, y: 60 + Math.random() * 200, votes: [] }); A.toast('Fikir duvarına eklendi 💡', 'ok'); } catch (e) { A.err(e); } };
    go();
  }

  // ---------------------------------------------------------------- palette
  let palGen = null;
  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && palGen && A.$('#pOut') && !e.target.closest('input,textarea,select,button') && !A.$('.modal-back')) { e.preventDefault(); palGen(); } });
  function palette(b) {
    let cols = ['#9b87f5', '#20c997', '#f06595', '#ffd43b', '#1d1b2c'];
    const locked = new Set();
    b.innerHTML = `<div class="card"><div class="row wrap" style="gap:8px;margin-bottom:14px">
      <input type="color" id="pBase" value="#9b87f5"><select class="select sm" id="pMode" style="width:200px"><option value="analog">Analog</option><option value="comp">Tamamlayıcı</option><option value="triad">Üçlü (triadik)</option><option value="split">Ayrık tamamlayıcı</option><option value="mono">Monokrom</option><option value="random">Rastgele</option></select>
      <button class="btn primary sm" id="pGen">${A.icon('shuffle')} Üret (Boşluk)</button><span class="spacer"></span>
      <button class="btn sm" id="pCss">${A.icon('code')} CSS kopyala</button>${A.can('create') ? `<button class="btn sm" id="pSave">${A.icon('save')} Kaydet</button>` : ''}</div>
      <div class="pal" id="pOut"></div></div>
      <div class="card" style="margin-top:16px"><div class="card-title">${A.icon('swatch-book')} Kayıtlı paletler</div><div id="pSaved" class="grid auto"></div></div>`;
    const hsl2hex = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
    const hex2hsl = (hex) => { let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, bl = parseInt(hex.slice(5, 7), 16) / 255; const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - bl) / d + (g < bl ? 6 : 0) : mx === g ? (bl - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s * 100, l * 100]; };
    const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return ((0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255) * 100; };
    const gen = () => {
      const [h, s, l] = hex2hsl(A.$('#pBase', b).value);
      const mode = A.$('#pMode', b).value;
      const r = () => Math.random();
      const sets = {
        analog: [-40, -20, 0, 20, 40].map((d, i) => hsl2hex((h + d + 360) % 360, s, A.clamp(l + (i - 2) * 6, 10, 90))),
        comp: [hsl2hex(h, s, A.clamp(l - 25, 8, 90)), hsl2hex(h, s, l), hsl2hex(h, A.clamp(s - 30, 5, 100), A.clamp(l + 25, 10, 95)), hsl2hex((h + 180) % 360, s, l), hsl2hex((h + 180) % 360, s, A.clamp(l - 20, 8, 90))],
        triad: [hsl2hex(h, s, l), hsl2hex((h + 120) % 360, s, l), hsl2hex((h + 240) % 360, s, l), hsl2hex(h, s * 0.4, 90), hsl2hex(h, s * 0.5, 15)],
        split: [hsl2hex(h, s, l), hsl2hex((h + 150) % 360, s, l), hsl2hex((h + 210) % 360, s, l), hsl2hex(h, s, A.clamp(l + 25, 10, 95)), hsl2hex(h, s, A.clamp(l - 25, 5, 90))],
        mono: [15, 32, 50, 68, 86].map((L) => hsl2hex(h, s, L)),
        random: Array.from({ length: 5 }, () => hsl2hex(r() * 360, 40 + r() * 50, 25 + r() * 55)),
      };
      cols = sets[mode].map((c, i) => (locked.has(i) ? cols[i] : c));
      draw();
    };
    const draw = () => {
      const out = A.$('#pOut', b);
      out.innerHTML = cols.map((c, i) => `<div class="pal-c" style="background:${c};color:${lum(c) > 62 ? '#111' : '#fff'}"><button class="pal-lock" data-l="${i}">${A.icon(locked.has(i) ? 'lock' : 'unlock')}</button><input type="color" value="${c}" data-i="${i}"><b data-copy="${c}">${c.toUpperCase()}</b></div>`).join('');
      A.icons(out);
      A.$$('[data-l]', out).forEach((x) => (x.onclick = () => { const i = +x.dataset.l; locked.has(i) ? locked.delete(i) : locked.add(i); draw(); }));
      A.$$('[data-i]', out).forEach((x) => (x.oninput = () => { cols[+x.dataset.i] = x.value; x.parentElement.style.background = x.value; x.nextElementSibling.textContent = x.value.toUpperCase(); }));
      A.$$('[data-copy]', out).forEach((x) => (x.onclick = () => navigator.clipboard.writeText(x.dataset.copy).then(() => A.toast(x.dataset.copy + ' kopyalandı', 'ok'))));
    };
    const drawSaved = async () => {
      const list = await A.col.list('palettes');
      const box = A.$('#pSaved', b);
      if (!box) return;
      box.innerHTML = list.length ? list.map((p) => `<div class="saved-pal" data-id="${p.id}"><div class="sp-cols">${p.colors.map((c) => `<i style="background:${A.esc(c)}"></i>`).join('')}</div><div class="row small"><b class="grow ell">${A.esc(p.name)}</b>${A.canDelete(p) ? `<button class="btn xs ghost" data-del>${A.icon('trash-2')}</button>` : ''}</div></div>`).join('') : '<p class="muted small">Henüz kayıtlı palet yok.</p>';
      A.icons(box);
      A.$$('.saved-pal', box).forEach((d) => { const p = list.find((x) => x.id === d.dataset.id); d.onclick = (e) => { if (e.target.closest('[data-del]')) { A.col.remove('palettes', p.id).then(drawSaved).catch(A.err); return; } cols = [...p.colors]; locked.clear(); draw(); }; });
    };
    A.$('#pGen', b).onclick = gen;
    A.$('#pBase', b).oninput = gen;
    A.$('#pMode', b).onchange = gen;
    A.$('#pCss', b).onclick = () => navigator.clipboard.writeText(':root {\n' + cols.map((c, i) => `  --renk-${i + 1}: ${c};`).join('\n') + '\n}').then(() => A.toast('CSS değişkenleri kopyalandı', 'ok'));
    const sv = A.$('#pSave', b);
    if (sv) sv.onclick = async () => { const n = await A.prompt('Palet adı', { value: 'Yeni palet' }); if (n) { await A.col.create('palettes', { name: n, colors: cols }).catch(A.err); drawSaved(); A.toast('Palet kaydedildi', 'ok'); } };
    palGen = gen;
    draw(); drawSaved();
  }

  // ---------------------------------------------------------------- xp curve
  function xp(b) {
    b.innerHTML = `<div class="grid c2"><div class="card"><div class="card-title">${A.icon('sliders-horizontal')} Parametreler</div>
      <div class="field"><label>Formül</label><select class="select" id="xF"><option value="pow">Üstel: taban × seviye ^ üs</option><option value="exp">Geometrik: taban × çarpan ^ (seviye-1)</option><option value="lin">Doğrusal: taban + artış × (seviye-1)</option></select></div>
      <div class="row"><div class="field"><label>Taban XP</label><input class="input" type="number" id="xB" value="100"></div><div class="field"><label id="xKL">Üs</label><input class="input" type="number" step="0.05" id="xK" value="1.5"></div><div class="field"><label>Maks seviye</label><input class="input" type="number" id="xM" value="30"></div></div>
      <div class="field"><label>Düşman başına ortalama XP (kaç düşman gerektiğini hesaplar)</label><input class="input" type="number" id="xE" value="25"></div>
      <button class="btn sm" id="xCsv">${A.icon('download')} CSV indir</button></div>
      <div class="card"><div class="card-title">${A.icon('trending-up')} Eğri</div><div id="xChart"></div></div></div>
      <div class="card" style="margin-top:16px;max-height:380px;overflow:auto"><table class="table"><thead><tr><th>Seviye</th><th>Gereken XP</th><th>Toplam XP</th><th>~Düşman</th></tr></thead><tbody id="xT"></tbody></table></div>`;
    let rows = [];
    const calc = () => {
      const f = A.$('#xF', b).value, B = +A.$('#xB', b).value || 1, K = +A.$('#xK', b).value || 1, M = A.clamp(+A.$('#xM', b).value || 10, 2, 200), E = +A.$('#xE', b).value || 1;
      A.$('#xKL', b).textContent = f === 'pow' ? 'Üs' : f === 'exp' ? 'Çarpan' : 'Artış';
      rows = []; let tot = 0;
      for (let l = 1; l <= M; l++) { const need = Math.round(f === 'pow' ? B * Math.pow(l, K) : f === 'exp' ? B * Math.pow(K, l - 1) : B + K * (l - 1)); tot += need; rows.push([l, need, tot, Math.ceil(need / E)]); }
      A.$('#xT', b).innerHTML = rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1].toLocaleString('tr-TR')}</td><td>${r[2].toLocaleString('tr-TR')}</td><td>${r[3].toLocaleString('tr-TR')}</td></tr>`).join('');
      const W = 460, H = 220, P = 36, max = rows[rows.length - 1][1];
      const pts = rows.map((r, i) => [P + (i / (rows.length - 1)) * (W - P - 10), H - P - (r[1] / max) * (H - P - 10)]);
      A.$('#xChart', b).innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%"><defs><linearGradient id="xg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".4"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
        ${[0, 0.25, 0.5, 0.75, 1].map((k) => `<line x1="${P}" x2="${W - 10}" y1="${H - P - k * (H - P - 10)}" y2="${H - P - k * (H - P - 10)}" stroke="var(--line)"/><text x="${P - 4}" y="${H - P - k * (H - P - 10) + 4}" text-anchor="end" font-size="9" fill="var(--muted)">${Math.round(max * k).toLocaleString('tr-TR')}</text>`).join('')}
        <path d="M${pts.map((p) => p.join(',')).join(' L')} L${pts[pts.length - 1][0]},${H - P} L${P},${H - P} Z" fill="url(#xg)"/>
        <path d="M${pts.map((p) => p.join(',')).join(' L')}" fill="none" stroke="var(--accent)" stroke-width="2.5" class="draw-path"/>
        <text x="${P}" y="${H - 10}" font-size="10" fill="var(--muted)">Sv 1</text><text x="${W - 10}" y="${H - 10}" font-size="10" fill="var(--muted)" text-anchor="end">Sv ${M}</text></svg>`;
    };
    A.$$('input,select', b).forEach((x) => (x.oninput = calc));
    A.$('#xCsv', b).onclick = () => A.download('xp_egrisi.csv', '﻿Seviye;Gereken XP;Toplam XP;Düşman\n' + rows.map((r) => r.join(';')).join('\n'), 'text/csv');
    calc();
  }

  // ---------------------------------------------------------------- loot
  function loot(b) {
    let table = A.ls.get('lootTable', [{ n: 'Altın kesesi', w: 50 }, { n: 'Can iksiri', w: 30 }, { n: 'Nadir kılıç', w: 15 }, { n: 'Efsanevi yüzük', w: 4 }, { n: 'Ejderha yumurtası', w: 1 }]);
    b.innerHTML = `<div class="grid c2"><div class="card"><div class="card-title">${A.icon('gem')} Ganimet Tablosu <span class="small muted">(ağırlık)</span></div><div id="lT"></div><button class="btn xs" id="lAdd" style="margin-top:8px">${A.icon('plus')} Satır ekle</button></div>
      <div class="card"><div class="card-title">${A.icon('dices')} Simülasyon</div><div class="row"><input class="input" type="number" id="lN" value="100" style="width:120px"><button class="btn primary" id="lGo">Sandık aç</button><button class="btn" id="lOne">Tek sandık</button></div><div id="lOut" style="margin-top:14px"></div></div></div>`;
    const save = () => A.ls.set('lootTable', table);
    const drawT = () => {
      const tot = table.reduce((s, r) => s + (+r.w || 0), 0) || 1;
      A.$('#lT', b).innerHTML = table.map((r, i) => `<div class="row" style="gap:6px;margin-bottom:6px"><input class="input sm" value="${A.esc(r.n)}" data-n="${i}"><input class="input sm" type="number" value="${r.w}" data-w="${i}" style="width:90px"><span class="badge" style="width:64px;justify-content:center">%${((r.w / tot) * 100).toFixed(1)}</span><button class="btn xs ghost" data-rm="${i}">${A.icon('x')}</button></div>`).join('');
      A.icons(A.$('#lT', b));
      A.$$('[data-n]', b).forEach((x) => (x.oninput = () => { table[x.dataset.n].n = x.value; save(); }));
      A.$$('[data-w]', b).forEach((x) => (x.onchange = () => { table[x.dataset.w].w = Math.max(0, +x.value); save(); drawT(); }));
      A.$$('[data-rm]', b).forEach((x) => (x.onclick = () => { table.splice(+x.dataset.rm, 1); save(); drawT(); }));
    };
    const pick = () => { const tot = table.reduce((s, r) => s + (+r.w || 0), 0); let x = Math.random() * tot; for (const r of table) { x -= r.w; if (x < 0) return r.n; } return table[table.length - 1].n; };
    A.$('#lAdd', b).onclick = () => { table.push({ n: 'Yeni eşya', w: 10 }); save(); drawT(); };
    A.$('#lOne', b).onclick = () => { if (!table.length) return; const r = pick(); A.$('#lOut', b).innerHTML = `<div class="loot-pop">🎁 <b>${A.esc(r)}</b></div>`; A.sound('done'); };
    A.$('#lGo', b).onclick = () => {
      if (!table.length) return;
      const N = A.clamp(+A.$('#lN', b).value || 100, 1, 1000000), c = {};
      for (let i = 0; i < N; i++) { const r = pick(); c[r] = (c[r] || 0) + 1; }
      const max = Math.max(...Object.values(c));
      A.$('#lOut', b).innerHTML = table.map((r) => `<div class="bar-row"><span style="width:140px" class="ell">${A.esc(r.n)}</span><div class="progress grow"><i style="width:${((c[r.n] || 0) / max) * 100}%"></i></div><b style="width:110px;text-align:right">${(c[r.n] || 0).toLocaleString('tr-TR')} (%${(((c[r.n] || 0) / N) * 100).toFixed(1)})</b></div>`).join('');
    };
    drawT();
  }

  // ---------------------------------------------------------------- pomodoro view
  function pomo(b) {
    const left = pomoLeft();
    b.innerHTML = `<div class="card pomo">
      <div class="seg">${Object.entries(POMO_LABEL).map(([k, l]) => `<button data-m="${k}" class="${A.pomo.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="pomo-ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" class="rbg"/><circle id="pomoRing" cx="100" cy="100" r="90" class="rfg ${A.pomo.mode}" style="stroke-dasharray:565;stroke-dashoffset:${565 * (left / (A.pomo[A.pomo.mode] * 60))}"/></svg><div><div id="pomoBig" class="pomo-time">${fmt(left)}</div><div class="muted">${POMO_LABEL[A.pomo.mode]} · ${A.pomo.count} pomodoro tamamlandı</div></div></div>
      <div class="row" style="justify-content:center"><button class="btn primary" id="pmGo">${A.icon(A.pomo.endAt ? 'pause' : 'play')} ${A.pomo.endAt ? 'Duraklat' : 'Başlat'}</button><button class="btn" id="pmReset">${A.icon('refresh-cw')} Sıfırla</button></div>
      <div class="row" style="justify-content:center;margin-top:16px;gap:10px">${['work', 'short', 'long'].map((k) => `<label class="small muted">${POMO_LABEL[k]} (dk) <input class="input sm" type="number" min="1" max="120" value="${A.pomo[k]}" data-set="${k}" style="width:70px"></label>`).join('')}</div>
      <p class="small muted" style="text-align:center">Zamanlayıcı diğer bölümlere geçtiğinizde de üst barda çalışmaya devam eder. Odak modunda durumunuzu “Odak modunda” yapmayı unutmayın!</p></div>`;
    A.$$('[data-m]', b).forEach((x) => (x.onclick = () => { A.resetPomodoro(x.dataset.m); pomo(b); A.icons(b); }));
    A.$('#pmGo', b).onclick = () => { A.pomo.endAt ? A.pausePomodoro() : A.startPomodoro(); pomo(b); A.icons(b); };
    A.$('#pmReset', b).onclick = () => { A.resetPomodoro(); pomo(b); A.icons(b); };
    A.$$('[data-set]', b).forEach((x) => (x.onchange = () => { A.pomo[x.dataset.set] = A.clamp(+x.value || 1, 1, 120); if (!A.pomo.endAt) A.pomo.left = A.pomo[A.pomo.mode] * 60; pomoSave(); pomo(b); A.icons(b); }));
  }
})();
