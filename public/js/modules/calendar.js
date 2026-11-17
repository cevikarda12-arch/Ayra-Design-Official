/* Takvim — kilometre taşları, toplantılar, sprintler, teslimler */
(function () {
  const TYPES = { meeting: ['Toplantı', '#4dabf7', 'users'], milestone: ['Kilometre Taşı', '#9b87f5', 'flag'], deadline: ['Son Teslim', '#ff6b6b', 'clock'], sprint: ['Sprint', '#ffa94d', 'repeat'], playtest: ['Oyun Testi', '#20c997', 'flask-conical'], release: ['Yayın', '#f06595', 'rocket'], other: ['Diğer', '#868e96', 'calendar'] };
  const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  A.register('calendar', {
    title: 'Takvim', icon: 'calendar-days', group: 'genel', scoped: false,
    async render(el) {
      let events = [], tasks = [];
      const now = new Date();
      let y = now.getFullYear(), m = now.getMonth();
      let onlyProject = A.ls.get('calProj', false);
      el.innerHTML = `<div class="page-head"><div><h1>Takvim</h1><p>Toplantılar, kilometre taşları, sprintler ve görev teslim tarihleri.</p></div>
        <div class="actions">
          <label class="row small" style="gap:8px;cursor:pointer"><label class="switch"><input type="checkbox" id="cProj" ${onlyProject ? 'checked' : ''}><span></span></label> Yalnızca aktif proje</label>
          <button class="btn sm" id="cToday">Bugün</button>
          <div class="seg"><button id="cPrev">${A.icon('chevron-left')}</button><button id="cNext">${A.icon('chevron-right')}</button></div>
          ${A.can('create') ? `<button class="btn primary" id="cNew">${A.icon('plus')} Etkinlik</button>` : ''}
        </div></div>
        <div class="cal-layout"><div class="card cal-card"><h2 id="cTitle" style="margin:0 0 14px"></h2><div class="cal" id="cGrid"></div></div>
        <div class="card"><div class="card-title">${A.icon('list')} Bu ay</div><div id="cAgenda"></div><div class="cal-legend">${Object.values(TYPES).map(([l, c]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div></div></div>`;
      A.icons(el);
      A.$('#cPrev', el).onclick = () => { m--; if (m < 0) { m = 11; y--; } draw(); };
      A.$('#cNext', el).onclick = () => { m++; if (m > 11) { m = 0; y++; } draw(); };
      A.$('#cToday', el).onclick = () => { y = now.getFullYear(); m = now.getMonth(); draw(); };
      A.$('#cProj', el).onchange = (e) => { onlyProject = e.target.checked; A.ls.set('calProj', onlyProject); draw(); };
      const nb = A.$('#cNew', el);
      if (nb) nb.onclick = () => edit({ date: A.today() });

      const ds = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const itemsOn = (dateStr) => {
        const ev = events.filter((e) => (!onlyProject || e.projectId === A.state.projectId) && (e.date === dateStr || (e.endDate && e.date <= dateStr && e.endDate >= dateStr)));
        const tk = tasks.filter((t) => t.due === dateStr && t.status !== 'done' && (!onlyProject || t.projectId === A.state.projectId));
        return [...ev.map((e) => ({ kind: 'event', e })), ...tk.map((t) => ({ kind: 'task', t }))];
      };
      const draw = () => {
        A.$('#cTitle', el).textContent = new Date(y, m, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        const first = new Date(y, m, 1);
        const start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));
        let html = DAYS.map((d) => `<div class="cal-dow">${d}</div>`).join('');
        for (let i = 0; i < 42; i++) {
          const d = new Date(start); d.setDate(start.getDate() + i);
          const s = ds(d);
          const items = itemsOn(s);
          html += `<div class="cal-day ${d.getMonth() !== m ? 'out' : ''} ${s === A.today() ? 'today' : ''}" data-d="${s}"><span class="cd-n">${d.getDate()}</span>
            ${items.slice(0, 3).map((it) => it.kind === 'event' ? `<div class="cal-ev" data-ev="${it.e.id}" style="--c:${A.esc(it.e.color || (TYPES[it.e.type] || TYPES.other)[1])}">${A.esc(it.e.title)}</div>` : `<div class="cal-ev task" data-task="${it.t.id}">✓ ${A.esc(it.t.title)}</div>`).join('')}
            ${items.length > 3 ? `<div class="small muted">+${items.length - 3} daha</div>` : ''}</div>`;
        }
        const grid = A.$('#cGrid', el);
        grid.innerHTML = html;
        A.$$('.cal-day', grid).forEach((d) => (d.onclick = (e) => {
          const ev = e.target.closest('[data-ev]'), tk = e.target.closest('[data-task]');
          if (ev) return edit(events.find((x) => x.id === ev.dataset.ev));
          if (tk) return A.go('tasks/' + tk.dataset.task);
          if (A.can('create')) edit({ date: d.dataset.d });
        }));
        // ajanda
        const mStr = `${y}-${String(m + 1).padStart(2, '0')}`;
        const list = [...events.filter((e) => (e.date || '').startsWith(mStr) && (!onlyProject || e.projectId === A.state.projectId)).map((e) => ({ date: e.date, title: e.title, color: e.color || (TYPES[e.type] || TYPES.other)[1], type: (TYPES[e.type] || TYPES.other)[0], id: e.id })),
          ...tasks.filter((t) => (t.due || '').startsWith(mStr) && t.status !== 'done' && (!onlyProject || t.projectId === A.state.projectId)).map((t) => ({ date: t.due, title: t.title, color: '#9b87f5', type: 'Görev teslimi', task: t.id }))].sort((a, b) => a.date.localeCompare(b.date));
        const ag = A.$('#cAgenda', el);
        ag.innerHTML = list.length ? `<div class="up-list">${list.map((x) => { const d = new Date(x.date); return `<div class="up click" data-id="${x.id || ''}" data-task="${x.task || ''}"><div class="up-date" style="border-color:${A.esc(x.color)}"><b>${d.getDate()}</b><span>${d.toLocaleDateString('tr-TR', { month: 'short' })}</span></div><div class="grow"><div>${A.esc(x.title)}</div><div class="small muted">${x.type}</div></div></div>`; }).join('')}</div>` : '<p class="muted">Bu ay için kayıt yok.</p>';
        A.$$('.up', ag).forEach((u) => (u.onclick = () => (u.dataset.task ? A.go('tasks/' + u.dataset.task) : edit(events.find((e) => e.id === u.dataset.id)))));
      };

      let editingEv = null;
      const edit = async (ev) => {
        if (!ev) return;
        if (ev._ms) return A.go('roadmap');
        const isNew = !ev.id;
        if (!isNew && !A.canEdit(ev)) {
          const t = TYPES[ev.type] || TYPES.other;
          A.modal({ title: ev.title, icon: t[2], body: `<p><span class="badge" style="background:${t[1]}22;color:${t[1]}">${t[0]}</span> ${A.fmtDate(ev.date)}${ev.endDate ? ' – ' + A.fmtDate(ev.endDate) : ''} ${ev.time ? '· ' + A.esc(ev.time) : ''}</p><div class="md">${A.md(ev.description || '')}</div>` });
          return;
        }
        editingEv = ev;
        const r = await A.form({
          title: isNew ? 'Yeni Etkinlik' : 'Etkinliği Düzenle', icon: 'calendar-days',
          fields: [
            { key: 'title', label: 'Başlık', value: ev.title, required: true },
            { key: 'type', label: 'Tür', type: 'select', options: Object.entries(TYPES).map(([k, v]) => [k, v[0]]), value: ev.type || 'meeting', half: true },
            { key: 'time', label: 'Saat', type: 'time', value: ev.time || '', half: true },
            { key: 'date', label: 'Başlangıç', type: 'date', value: ev.date, half: true },
            { key: 'endDate', label: 'Bitiş (isteğe bağlı)', type: 'date', value: ev.endDate || '', half: true },
            { key: 'description', label: 'Açıklama', type: 'textarea', value: ev.description || '', rows: 3 },
            { key: 'scope', label: 'Kapsam', type: 'select', options: [['project', 'Aktif proje: ' + (A.project() ? A.project().name : '-')], ['studio', 'Tüm stüdyo']], value: ev.projectId === null ? 'studio' : 'project' },
          ],
          extra: !isNew && A.canDelete(ev) ? `<button type="button" class="btn danger sm" id="evDel">${A.icon('trash-2')} Etkinliği sil</button>` : '',
        });
        if (!r) return;
        const body = { title: r.title, type: r.type, time: r.time, date: r.date, endDate: r.endDate && r.endDate >= r.date ? r.endDate : '', description: r.description, color: TYPES[r.type][1], projectId: r.scope === 'studio' ? null : A.state.projectId };
        try { if (isNew) await A.col.create('events', body); else await A.col.update('events', ev.id, body); A.toast('Etkinlik kaydedildi', 'ok'); } catch (e) { A.err(e); }
      };
      document.addEventListener('click', delHandler);
      function delHandler(e) {
        const b = e.target.closest('#evDel');
        if (!b) return;
        const ev = editingEv;
        A.$('.modal-back:last-child [data-close]').click();
        if (ev) A.confirm(`“${ev.title}” silinsin mi?`).then((ok) => ok && A.col.remove('events', ev.id).catch(A.err));
      }

      const load = async () => {
        let ms;
        [events, tasks, ms] = await Promise.all([A.col.list('events'), A.col.list('tasks'), A.col.list('milestones')]);
        events = [...events, ...ms.filter((m) => m.end).map((m) => ({ id: 'ms-' + m.id, _ms: true, title: '🏁 ' + m.title, date: m.end, type: 'milestone', color: m.color || '#9b87f5', projectId: m.projectId, description: m.description }))];
        draw();
      };
      await load();
      const reload = A.debounce(load, 300);
      A.viewOn('db:events', reload);
      A.viewOn('db:tasks', reload);
      A.viewOn('db:milestones', reload);
      this.destroy = () => document.removeEventListener('click', delHandler);
    },
  });
})();
