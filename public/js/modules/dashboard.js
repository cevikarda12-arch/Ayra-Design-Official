/* Pano (Dashboard) */
(function () {
  const QUOTES = [
    ['Bir oyun, bir dizi ilginç karardır.', 'Sid Meier'],
    ['Oyun tasarımı, oyuncunun deneyimini tasarlamaktır.', 'Jesse Schell'],
    ['Erken prototiple, sık test et.', 'Stüdyo kuralı #1'],
    ['Eğlenceli değilse, sorun mekaniktedir — grafik değil.', 'Bilinmeyen tasarımcı'],
    ['Basit kurallar, derin oynanış.', 'Tasarım ilkesi'],
    ['Oyuncuya güven; her şeyi açıklamak zorunda değilsin.', 'Tasarım ilkesi'],
    ['Kes, kes, kes. Kalan şey oyunun özüdür.', 'Stüdyo kuralı #7'],
    ['Geciken bir oyun eninde sonunda iyi olabilir, ama aceleye getirilmiş bir oyun sonsuza dek kötüdür.', 'Shigeru Miyamoto'],
  ];

  A.register('dashboard', {
    title: 'Pano', icon: 'layout-dashboard', group: 'genel',
    async render(el) {
      const u = A.state.user;
      const p = A.project();
      const hour = new Date().getHours();
      const greet = hour < 6 ? 'İyi geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
      const q = QUOTES[new Date().getDate() % QUOTES.length];
      el.innerHTML = `
        <div class="dash-hero">
          <div class="dh-glow"></div>
          <div class="dh-text">
            <div class="dh-date">${A.icon('calendar')} ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <h1>${greet}, <span class="hand">${A.esc(u.displayName.split(' ')[0])}</span> 👋</h1>
            <p>${p ? `Aktif projen: <b>${A.esc(p.name)}</b> · ${A.esc(p.status || '')}` : 'Başlamak için bir proje oluştur.'}</p>
            <div class="dh-quote">“${A.esc(q[0])}” <span>— ${A.esc(q[1])}</span></div>
          </div>
          <div class="dh-actions">
            <button class="btn primary" data-q="tasks">${A.icon('plus')} Görev</button>
            <button class="btn" data-q="notes">${A.icon('notebook-pen')} Not</button>
            <button class="btn" data-q="draw">${A.icon('pen-tool')} Çizim</button>
            <button class="btn" data-q="chat">${A.icon('messages-square')} Sohbet</button>
            <button class="btn ghost icon" id="dEdit" title="Panoyu düzenle">${A.icon('sliders-horizontal')}</button>
          </div>
          <div class="dh-orbs"><i></i><i></i><i></i></div>
        </div>
        <div class="grid c4 stagger" id="dStats" style="margin:18px 0"></div>
        <div class="dash-grid">
          <div class="card" id="dAnn"></div>
          <div class="card" id="dMine"></div>
          <div class="card" id="dProg"></div>
          <div class="card" id="dEvents"></div>
          <div class="card" id="dAct"></div>
          <div class="card" id="dTeam"></div>
        </div>`;
      A.icons(el);
      const WIDGETS = [['quote', 'Günün sözü', '.dh-quote'], ['stats', 'İstatistik kartları', '#dStats'], ['ann', 'Duyurular', '#dAnn'], ['mine', 'Bana atananlar', '#dMine'], ['prog', 'Proje ilerlemesi', '#dProg'], ['events', 'Yaklaşanlar', '#dEvents'], ['act', 'Son aktiviteler', '#dAct'], ['team', 'Ekip', '#dTeam']];
      const applyHidden = () => { const h = new Set((A.state.user.prefs || {}).dashHidden || []); WIDGETS.forEach(([k, , sel]) => { const n = A.$(sel, el); if (n) n.style.display = h.has(k) ? 'none' : ''; }); };
      applyHidden();
      A.$('#dEdit', el).onclick = (e) => {
        const h = new Set((A.state.user.prefs || {}).dashHidden || []);
        A.menu(e.currentTarget, [{ head: 'Panoda göster' }, ...WIDGETS.map(([k, l]) => ({ html: `${A.icon(h.has(k) ? 'square' : 'square-check-big')} ${l}`, action: async () => { const next = h.has(k) ? [...h].filter((x) => x !== k) : [...h, k]; await A.savePrefs({ dashHidden: next }); applyHidden(); } }))], { align: 'right' });
      };
      A.$$('[data-q]', el).forEach((b) => (b.onclick = () => { A.go(b.dataset.q); if (b.dataset.q === 'tasks') setTimeout(() => A.emit('tasks:new'), 300); if (b.dataset.q === 'notes') setTimeout(() => A.emit('notes:new'), 300); }));

      const load = async () => {
        const pid = A.state.projectId;
        const [tasks, bugs, events, anns, acts] = await Promise.all([
          pid ? A.col.project('tasks') : [], pid ? A.col.project('bugs') : [], A.col.list('events'), A.col.list('announcements'), A.get('/api/activity'),
        ]);
        stats(tasks, bugs, events);
        announcements(anns);
        mine(tasks, bugs);
        progress(tasks);
        upcoming(events, tasks);
        activity(acts);
        team();
      };

      const stats = (tasks, bugs, events) => {
        const open = tasks.filter((t) => t.status !== 'done').length;
        const mineN = tasks.filter((t) => t.assignee === u.id && t.status !== 'done').length;
        const openBugs = bugs.filter((b) => !['fixed', 'closed'].includes(b.status)).length;
        const up = events.filter((e) => { const d = A.daysUntil(e.date); return d !== null && d >= 0 && d <= 14; }).length;
        const cards = [
          ['list-todo', 'Açık görevler', open, 'var(--accent)', 'tasks'],
          ['user-check', 'Bana atanan', mineN, 'var(--mint)', 'tasks'],
          ['bug', 'Açık hatalar', openBugs, 'var(--pink)', 'bugs'],
          ['calendar-days', '14 gün içinde etkinlik', up, 'var(--blue)', 'calendar'],
        ];
        const box = A.$('#dStats', el);
        if (!box) return;
        box.innerHTML = cards.map(([ic, label, n, c, go]) => `<div class="card hover stat" data-go="${go}"><div class="st-ico" style="color:${c};background:color-mix(in srgb, ${c} 15%, transparent)">${A.icon(ic)}</div><div><div class="st-n" data-n="${n}">0</div><div class="st-l">${label}</div></div></div>`).join('');
        A.icons(box);
        A.$$('[data-go]', box).forEach((c) => (c.onclick = () => A.go(c.dataset.go)));
        A.$$('.st-n', box).forEach((n) => countUp(n, Number(n.dataset.n)));
      };

      const announcements = (anns) => {
        const box = A.$('#dAnn', el);
        if (!box) return;
        anns.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);
        box.innerHTML = `<div class="card-title">${A.icon('megaphone')} Duyurular<div class="actions">${A.can('announce') ? `<button class="btn xs" id="annNew">${A.icon('plus')} Yeni</button>` : ''}</div></div>
          <div class="ann-list">${anns.length ? anns.slice(0, 5).map((a) => `<div class="ann ${a.priority === 'high' ? 'hi' : ''}">
            <div class="row" style="gap:8px">${a.pinned ? A.icon('pin') : ''}<b>${A.esc(a.title)}</b><span class="spacer"></span>${A.can('announce') ? `<button class="btn xs ghost" data-del="${a.id}">${A.icon('trash-2')}</button>` : ''}</div>
            <div class="md small">${A.md(a.content || '')}</div>
            <div class="row small muted" style="gap:6px">${A.avatar(a.createdBy, 'xs')} ${A.esc(A.user(a.createdBy).displayName)} · ${A.timeAgo(a.createdAt)}</div></div>`).join('') : '<p class="muted">Henüz duyuru yok.</p>'}</div>`;
        A.icons(box);
        const nb = A.$('#annNew', box);
        if (nb) nb.onclick = async () => {
          const r = await A.form({ title: 'Yeni Duyuru', icon: 'megaphone', fields: [
            { key: 'title', label: 'Başlık', required: true },
            { key: 'content', label: 'İçerik (Markdown)', type: 'textarea', rows: 5 },
            { key: 'priority', label: 'Önem', type: 'select', options: [['normal', 'Normal'], ['high', 'Yüksek']], half: true },
            { key: 'pinned', label: 'Sabitle', type: 'checkbox', hint: 'Üstte sabitle', half: true },
          ] });
          if (r) { try { await A.col.create('announcements', r); A.toast('Duyuru yayınlandı', 'ok'); } catch (e) { A.err(e); } }
        };
        A.$$('[data-del]', box).forEach((b) => (b.onclick = async () => { if (await A.confirm('Duyuru silinsin mi?')) A.col.remove('announcements', b.dataset.del).catch(A.err); }));
      };

      const mine = (tasks, bugs) => {
        const box = A.$('#dMine', el);
        if (!box) return;
        const my = tasks.filter((t) => t.assignee === u.id && t.status !== 'done').sort((a, b) => (a.due || '9') .localeCompare(b.due || '9'));
        const myBugs = bugs.filter((b) => b.assignee === u.id && !['fixed', 'closed'].includes(b.status));
        box.innerHTML = `<div class="card-title">${A.icon('user-check')} Bana Atananlar<div class="actions"><button class="btn xs ghost" onclick="A.go('tasks')">Tümü ${A.icon('arrow-right')}</button></div></div>
          ${my.length || myBugs.length ? `<div class="mini-list">${my.slice(0, 6).map((t) => {
            const d = A.daysUntil(t.due);
            const due = t.due ? `<span class="badge ${d < 0 ? 'red' : d <= 2 ? 'yellow' : ''}">${d < 0 ? Math.abs(d) + ' gün gecikti' : d === 0 ? 'Bugün' : d + ' gün'}</span>` : '';
            return `<div class="mini-item" data-task="${t.id}"><button class="chk" data-done="${t.id}" title="Tamamla"></button><span class="grow">${A.esc(t.title)}</span><span class="prio p-${t.priority}"></span>${due}</div>`;
          }).join('')}${myBugs.slice(0, 3).map((b) => `<div class="mini-item" onclick="A.go('bugs/${b.id}')">${A.icon('bug')}<span class="grow">${A.esc(b.title)}</span><span class="badge red">${A.esc(b.severity || '')}</span></div>`).join('')}</div>` : '<p class="muted">Sana atanmış açık iş yok. 🎉</p>'}`;
        A.icons(box);
        A.$$('[data-done]', box).forEach((b) => (b.onclick = async (e) => {
          e.stopPropagation();
          b.classList.add('on');
          A.sound('done');
          try { await A.col.update('tasks', b.dataset.done, { status: 'done' }); A.toast('Görev tamamlandı! 🎉', 'ok'); A.confetti(40); } catch (er) { A.err(er); }
        }));
        A.$$('[data-task]', box).forEach((r) => (r.onclick = () => A.go('tasks/' + r.dataset.task)));
      };

      const progress = (tasks) => {
        const box = A.$('#dProg', el);
        if (!box) return;
        const st = { todo: 0, progress: 0, review: 0, done: 0 };
        tasks.forEach((t) => (st[t.status] = (st[t.status] || 0) + 1));
        const total = tasks.length || 1;
        const pct = Math.round((st.done / total) * 100);
        const cats = {};
        tasks.forEach((t) => (cats[t.category || 'Diğer'] = (cats[t.category || 'Diğer'] || 0) + 1));
        const maxC = Math.max(1, ...Object.values(cats));
        box.innerHTML = `<div class="card-title">${A.icon('trending-up')} Proje İlerlemesi</div>
          <div class="ring-wrap"><svg viewBox="0 0 120 120" class="ring"><circle cx="60" cy="60" r="50" class="rbg"/><circle cx="60" cy="60" r="50" class="rfg" style="stroke-dasharray:314;stroke-dashoffset:314" data-off="${314 - (314 * pct) / 100}"/></svg><div class="ring-txt"><b>%${pct}</b><span>tamamlandı</span></div>
          <div class="ring-legend">${[['todo', 'Yapılacak', '#868e96'], ['progress', 'Devam ediyor', '#4dabf7'], ['review', 'İncelemede', '#ffa94d'], ['done', 'Tamamlandı', '#20c997']].map(([k, l, c]) => `<div><i style="background:${c}"></i>${l}<b>${st[k] || 0}</b></div>`).join('')}</div></div>
          <div class="bars">${Object.entries(cats).map(([k, v]) => `<div class="bar-row"><span>${A.esc(k)}</span><div class="progress grow"><i style="width:0" data-w="${(v / maxC) * 100}%"></i></div><b>${v}</b></div>`).join('')}</div>`;
        A.icons(box);
        requestAnimationFrame(() => setTimeout(() => {
          const r = A.$('.rfg', box); if (r) r.style.strokeDashoffset = r.dataset.off;
          A.$$('[data-w]', box).forEach((i) => (i.style.width = i.dataset.w));
        }, 80));
      };

      const upcoming = (events, tasks) => {
        const box = A.$('#dEvents', el);
        if (!box) return;
        const list = [
          ...events.map((e) => ({ title: e.title, date: e.date, color: e.color, kind: 'Etkinlik' })),
          ...tasks.filter((t) => t.due && t.status !== 'done').map((t) => ({ title: t.title, date: t.due, color: '#9b87f5', kind: 'Görev teslimi' })),
        ].filter((x) => A.daysUntil(x.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
        box.innerHTML = `<div class="card-title">${A.icon('calendar-days')} Yaklaşanlar<div class="actions"><button class="btn xs ghost" onclick="A.go('calendar')">Takvim ${A.icon('arrow-right')}</button></div></div>
          ${list.length ? `<div class="up-list">${list.map((x) => { const d = new Date(x.date); return `<div class="up"><div class="up-date" style="border-color:${A.esc(x.color || '#9b87f5')}"><b>${d.getDate()}</b><span>${d.toLocaleDateString('tr-TR', { month: 'short' })}</span></div><div class="grow"><div>${A.esc(x.title)}</div><div class="small muted">${x.kind} · ${A.daysUntil(x.date) === 0 ? 'bugün' : A.daysUntil(x.date) + ' gün sonra'}</div></div></div>`; }).join('')}</div>` : '<p class="muted">Yaklaşan etkinlik yok.</p>'}`;
        A.icons(box);
      };

      const activity = (acts) => {
        const box = A.$('#dAct', el);
        if (!box) return;
        box.innerHTML = `<div class="card-title">${A.icon('activity')} Son Aktiviteler <span class="live-dot" title="Canlı"></span></div><div class="act-list">${acts.slice(0, 12).map(actRow).join('') || '<p class="muted">Henüz aktivite yok.</p>'}</div>`;
        A.icons(box);
      };
      const actRow = (a) => `<div class="act">${A.avatar(a.userId, 'sm')}<div class="grow"><b>${A.esc(A.user(a.userId).displayName)}</b> ${A.esc(a.action)}${a.targetTitle ? `: <span class="accent-txt">${A.esc(a.targetTitle)}</span>` : ''}<div class="small muted">${A.timeAgo(a.createdAt)}</div></div></div>`;

      const team = () => {
        const box = A.$('#dTeam', el);
        if (!box) return;
        const users = A.activeUsers().sort((a, b) => (A.state.online.has(b.id) ? 1 : 0) - (A.state.online.has(a.id) ? 1 : 0));
        box.innerHTML = `<div class="card-title">${A.icon('users')} Ekip <span class="badge green">${A.state.online.size} çevrimiçi</span><div class="actions"><button class="btn xs ghost" onclick="A.go('team')">Tümü ${A.icon('arrow-right')}</button></div></div>
          <div class="team-mini">${users.slice(0, 10).map((x) => `<div class="tm">${A.avatar(x, '', true)}<div class="grow"><div>${A.esc(x.displayName)}</div><div class="small muted">${A.esc(x.statusText || x.title || A.roleName(x.role))}</div></div></div>`).join('')}</div>`;
        A.icons(box);
      };

      await load();
      const reload = A.debounce(load, 500);
      A.viewOn('db', (p) => { if (['tasks', 'bugs', 'events', 'announcements'].includes(p.col)) reload(); });
      A.viewOn('activity', (a) => {
        if (a.kind === 'auth' || a.kind === 'admin') return;
        const list = A.$('.act-list', el);
        if (!list) return;
        const row = A.h(actRow(a));
        row.classList.add('act-new');
        list.prepend(row);
        A.icons(row);
        while (list.children.length > 12) list.lastElementChild.remove();
      });
      A.viewOn('presence', team);
      A.viewOn('users', team);
    },
  });

  function countUp(el, to) {
    const dur = 900, t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  A.countUp = countUp;
})();
