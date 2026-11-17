/* Görev Panosu (Kanban) */
(function () {
  const COLS = [
    ['todo', 'Yapılacak', '#868e96', 'circle-dot'],
    ['progress', 'Devam Ediyor', '#4dabf7', 'timer'],
    ['review', 'İncelemede', '#ffa94d', 'eye'],
    ['done', 'Tamamlandı', '#20c997', 'check-circle-2'],
  ];
  const PRIO = { low: ['Düşük', '#69db7c'], medium: ['Orta', '#ffd43b'], high: ['Yüksek', '#ffa94d'], urgent: ['Acil', '#ff6b6b'] };
  const CATS = { 'Tasarım': '#9b87f5', 'Programlama': '#4dabf7', 'Sanat': '#f06595', 'Ses': '#20c997', 'Seviye': '#ffa94d', 'Senaryo': '#b197fc', 'QA': '#ff6b6b', 'Yönetim': '#868e96', 'Pazarlama': '#ffd43b' };
  A.TASK_CATS = CATS;

  A.register('tasks', {
    title: 'Görev Panosu', icon: 'kanban', group: 'uretim',
    async render(el, [openId]) {
      if (A.needProject(el)) return;
      let tasks = [];
      let milestones = [];
      const msOptions = (sel) => `<option value="">— Aşama yok —</option>` + milestones.map((m) => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${A.esc(m.title)}</option>`).join('');
      const f = A.ls.get('taskFilter', { q: '', who: '', cat: '', view: 'board' });
      el.innerHTML = `<div class="page-head"><div><h1>Görev Panosu</h1><p>${A.esc(A.project().name)} · görevleri sürükleyip bırakarak durumlarını değiştirin.</p></div>
        <div class="actions">
          <div class="input-icon" style="width:220px">${A.icon('search')}<input class="input sm" id="tq" placeholder="Görev ara..." value="${A.esc(f.q)}"></div>
          <select class="select sm" id="twho" style="width:150px"><option value="">Herkes</option><option value="me">Bana atananlar</option>${A.activeUsers().map((u) => `<option value="${u.id}">${A.esc(u.displayName)}</option>`).join('')}</select>
          <select class="select sm" id="tcat" style="width:170px"><option value="">Tüm kategoriler</option>${Object.keys(CATS).map((c) => `<option>${c}</option>`).join('')}</select>
          <div class="seg"><button data-v="board">${A.icon('kanban')}</button><button data-v="list">${A.icon('list')}</button></div>
          ${A.can('create') ? `<button class="btn primary" id="tNew">${A.icon('plus')} Görev</button>` : ''}
        </div></div>
        <div id="tBody"></div>`;
      A.icons(el);
      A.$('#twho', el).value = f.who; A.$('#tcat', el).value = f.cat;
      const save = () => A.ls.set('taskFilter', f);
      A.$('#tq', el).oninput = (e) => { f.q = e.target.value; save(); draw(); };
      A.$('#twho', el).onchange = (e) => { f.who = e.target.value; save(); draw(); };
      A.$('#tcat', el).onchange = (e) => { f.cat = e.target.value; save(); draw(); };
      A.$$('.seg button', el).forEach((b) => { b.classList.toggle('on', b.dataset.v === f.view); b.onclick = () => { f.view = b.dataset.v; save(); A.$$('.seg button', el).forEach((x) => x.classList.toggle('on', x === b)); draw(); }; });
      const nb = A.$('#tNew', el);
      if (nb) nb.onclick = () => newTask('todo');

      const filtered = () => tasks.filter((t) => {
        if (f.q && !(t.title + ' ' + (t.description || '') + ' ' + (t.tags || []).join(' ')).toLocaleLowerCase('tr').includes(f.q.toLocaleLowerCase('tr'))) return false;
        if (f.who === 'me' && t.assignee !== A.state.user.id) return false;
        if (f.who && f.who !== 'me' && t.assignee !== f.who) return false;
        if (f.cat && t.category !== f.cat) return false;
        return true;
      });

      const cardHtml = (t) => {
        const d = A.daysUntil(t.due);
        const cl = t.checklist || [];
        const cld = cl.filter((c) => c.done).length;
        const cat = t.category ? `<span class="tcat" style="--c:${CATS[t.category] || '#868e96'}">${A.esc(t.category)}</span>` : '';
        const imp = t.important || (t.tags || []).includes('önemli');
        return `<div class="tcard ${imp ? 'important' : ''}" draggable="${A.canEdit(t)}" data-id="${t.id}">${imp ? '<div class="imp-flag">❗ ÖNEMLİ</div>' : ''}
          <div class="row" style="gap:6px;margin-bottom:6px">${cat}<span class="spacer"></span><span class="prio p-${t.priority}" title="${PRIO[t.priority] ? PRIO[t.priority][0] : ''}"></span></div>
          <div class="tc-title">${A.esc(t.title)}</div>
          ${(t.tags || []).length ? `<div class="row wrap" style="gap:4px;margin-top:6px">${t.tags.map((x) => `<span class="tag">#${A.esc(x)}</span>`).join('')}</div>` : ''}
          <div class="tc-meta">
            ${t.due ? `<span class="badge ${t.status !== 'done' && d < 0 ? 'red' : t.status !== 'done' && d <= 2 ? 'yellow' : ''}">${A.icon('clock')}${A.fmtDate(t.due, { day: 'numeric', month: 'short' })}</span>` : ''}
            ${cl.length ? `<span class="badge ${cld === cl.length ? 'green' : ''}">${A.icon('list-checks')}${cld}/${cl.length}</span>` : ''}
            ${(t.comments || []).length ? `<span class="badge">${A.icon('message-circle')}${t.comments.length}</span>` : ''}
            ${t.milestoneId && milestones.find((m) => m.id === t.milestoneId) ? `<span class="badge" style="color:${A.esc(milestones.find((m) => m.id === t.milestoneId).color || '#9b87f5')}">${A.icon('flag')}${A.esc(milestones.find((m) => m.id === t.milestoneId).title)}</span>` : ''}
            <span class="spacer"></span>${t.assignee ? A.avatar(t.assignee, 'xs') : ''}
          </div></div>`;
      };

      const draw = () => {
        const body = A.$('#tBody', el);
        if (!body) return;
        const list = filtered();
        if (f.view === 'list') {
          body.innerHTML = `<div class="card" style="padding:0;overflow:auto"><table class="table"><thead><tr><th>Görev</th><th>Durum</th><th>Öncelik</th><th>Kategori</th><th>Atanan</th><th>Teslim</th></tr></thead><tbody>
            ${list.sort((a, b) => (a.due || '9').localeCompare(b.due || '9')).map((t) => { const c = COLS.find((x) => x[0] === t.status) || COLS[0]; return `<tr class="click" data-id="${t.id}"><td><b>${A.esc(t.title)}</b></td><td><span class="badge" style="background:${c[2]}22;color:${c[2]}">${c[1]}</span></td><td>${PRIO[t.priority] ? `<span class="badge" style="background:${PRIO[t.priority][1]}22;color:${PRIO[t.priority][1]}">${PRIO[t.priority][0]}</span>` : ''}</td><td>${A.esc(t.category || '')}</td><td>${t.assignee ? `<span class="row" style="gap:6px">${A.avatar(t.assignee, 'xs')}${A.esc(A.user(t.assignee).displayName)}</span>` : '<span class="muted">—</span>'}</td><td>${A.fmtDate(t.due)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">Görev bulunamadı</td></tr>'}
          </tbody></table></div>`;
          A.icons(body);
          A.$$('tr[data-id]', body).forEach((r) => (r.onclick = () => openTask(r.dataset.id)));
          return;
        }
        body.innerHTML = `<div class="kanban">${COLS.map(([k, label, color, icon]) => {
          const items = list.filter((t) => (t.status || 'todo') === k).sort((a, b) => (a.order || 0) - (b.order || 0));
          return `<div class="kcol" data-col="${k}" style="--c:${color}">
            <div class="kcol-head">${A.icon(icon)}<b>${label}</b><span class="badge">${items.length}</span><span class="spacer"></span>${A.can('create') ? `<button class="btn xs ghost" data-add="${k}">${A.icon('plus')}</button>` : ''}</div>
            <div class="kcol-body">${items.map(cardHtml).join('')}${!items.length ? '<div class="kempty">Buraya sürükleyin</div>' : ''}</div></div>`;
        }).join('')}</div>`;
        A.icons(body);
        A.$$('[data-add]', body).forEach((b) => (b.onclick = () => newTask(b.dataset.add)));
        A.$$('.tcard', body).forEach((c) => {
          c.onclick = () => openTask(c.dataset.id);
          c.ondragstart = (e) => { e.dataTransfer.setData('text/plain', c.dataset.id); c.classList.add('dragging'); };
          c.ondragend = () => c.classList.remove('dragging');
        });
        A.$$('.kcol', body).forEach((col) => {
          const bodyEl = A.$('.kcol-body', col);
          col.ondragover = (e) => {
            e.preventDefault();
            col.classList.add('over');
            const after = [...bodyEl.querySelectorAll('.tcard:not(.dragging)')].find((x) => e.clientY < x.getBoundingClientRect().top + x.offsetHeight / 2);
            const dragging = A.$('.tcard.dragging');
            if (dragging) { if (after) bodyEl.insertBefore(dragging, after); else bodyEl.appendChild(dragging); }
          };
          col.ondragleave = (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); };
          col.ondrop = async (e) => {
            e.preventDefault();
            col.classList.remove('over');
            const id = e.dataTransfer.getData('text/plain');
            const t = tasks.find((x) => x.id === id);
            if (!t) return;
            const newStatus = col.dataset.col;
            const ids = A.$$('.tcard', bodyEl).map((x) => x.dataset.id);
            const updates = [];
            ids.forEach((tid, i) => { const tt = tasks.find((x) => x.id === tid); if (tt && (tt.order !== i || tt.id === id)) { tt.order = i; updates.push(tt); } });
            const was = t.status;
            t.status = newStatus;
            draw();
            try {
              await Promise.all(updates.map((tt) => A.col.update('tasks', tt.id, tt.id === id ? { status: newStatus, order: tt.order } : { order: tt.order })));
              if (newStatus === 'done' && was !== 'done') { A.sound('done'); A.confetti(50); A.toast(`“${t.title}” tamamlandı!`, 'ok'); }
            } catch (er) { A.err(er); load(); }
          };
        });
      };

      const newTask = async (status) => {
        const r = await A.form({
          title: 'Yeni Görev', icon: 'check-square', size: 'wide',
          fields: [
            { key: 'title', label: 'Başlık', required: true, placeholder: 'Örn: Ana karakterin koşma animasyonu' },
            { key: 'description', label: 'Açıklama (Markdown)', type: 'textarea', rows: 4 },
            { key: 'category', label: 'Kategori', type: 'select', options: Object.keys(CATS), value: 'Tasarım', half: true },
            { key: 'priority', label: 'Öncelik', type: 'select', options: Object.entries(PRIO).map(([k, v]) => [k, v[0]]), value: 'medium', half: true },
            { key: 'assignee', label: 'Atanan kişi', type: 'html', html: `<select class="select" name="assignee">${A.userOptions('')}</select>`, half: true },
            { key: 'due', label: 'Teslim tarihi', type: 'date', half: true },
            { key: 'milestoneId', label: 'Aşama (yol haritası)', type: 'html', html: `<select class="select" name="milestoneId">${msOptions('')}</select>`, half: true },
            { key: 'tags', label: 'Etiketler (virgülle)', placeholder: 'karakter, animasyon', half: true },
          ],
        });
        if (!r) return;
        try {
          await A.col.create('tasks', { ...r, status, projectId: A.state.projectId, tags: splitTags(r.tags), checklist: [], comments: [], order: tasks.filter((t) => t.status === status).length });
          A.toast('Görev oluşturuldu', 'ok');
        } catch (e) { A.err(e); }
      };

      const openTask = (id) => {
        const t = tasks.find((x) => x.id === id);
        if (!t) return A.toast('Görev bulunamadı', 'err');
        const editable = A.canEdit(t);
        const dis = editable ? '' : 'disabled';
        const m = A.modal({
          title: 'Görev Detayı', icon: 'check-square', size: 'wide', foot: false,
          body: `<div class="task-detail">
            <div class="td-main">
              <input class="input td-title" id="mTitle" value="${A.esc(t.title)}" ${dis}>
              <div class="label" style="margin:14px 0 6px">Açıklama</div>
              <div class="md-edit"><div class="md card" id="mDescView" style="min-height:60px;cursor:${editable ? 'text' : 'default'}">${t.description ? A.md(t.description) : '<span class="muted">Açıklama eklemek için tıklayın...</span>'}</div>
              <textarea class="textarea hidden" id="mDesc" rows="6">${A.esc(t.description || '')}</textarea></div>
              <div class="label" style="margin:16px 0 6px">Kontrol listesi <span id="clProg" class="muted"></span></div>
              <div class="progress" style="margin-bottom:8px"><i id="clBar" style="width:0"></i></div>
              <div id="mCl"></div>
              ${editable ? `<div class="row" style="margin-top:6px"><input class="input sm" id="clNew" placeholder="Yeni madde ekle ve Enter'a bas"></div>` : ''}
              <div class="label" style="margin:18px 0 8px">Yorumlar</div>
              <div id="mCom"></div>
              <div class="row" style="margin-top:8px">${A.avatar(A.state.user, 'sm')}<input class="input sm" id="comNew" placeholder="Yorum yaz... (Enter)"></div>
            </div>
            <div class="td-side">
              <div class="field"><label>Durum</label><select class="select sm" id="mStatus" ${dis}>${COLS.map(([k, l]) => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
              <div class="field"><label>Atanan</label><select class="select sm" id="mAssignee" ${dis}>${A.userOptions(t.assignee)}</select></div>
              <div class="field"><label>Öncelik</label><select class="select sm" id="mPrio" ${dis}>${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${t.priority === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
              <div class="field"><label>Kategori</label><select class="select sm" id="mCat" ${dis}>${Object.keys(CATS).map((c) => `<option ${t.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
              <div class="field"><label>Aşama</label><select class="select sm" id="mMs" ${dis}>${msOptions(t.milestoneId)}</select></div>
              <div class="field"><label>Teslim tarihi</label><input type="date" class="input sm" id="mDue" value="${A.esc(t.due || '')}" ${dis}></div>
              <div class="field"><label>Tahmini süre (saat)</label><input type="number" min="0" class="input sm" id="mEst" value="${t.estimate || ''}" ${dis}></div>
              <div class="field"><label>Etiketler</label><input class="input sm" id="mTags" value="${A.esc((t.tags || []).join(', '))}" ${dis}></div>
              <div class="small muted" style="margin:8px 0">Oluşturan: ${A.esc(A.user(t.createdBy).displayName)}<br>${A.timeAgo(t.createdAt)} · güncellendi ${A.timeAgo(t.updatedAt)}</div>
              ${A.canDelete(t) ? `<button class="btn danger sm block" id="mDel">${A.icon('trash-2')} Görevi sil</button>` : ''}
            </div></div>`,
        });
        const root = m.el;
        const upd = async (patch) => { Object.assign(t, patch); try { await A.col.update('tasks', t.id, patch); } catch (e) { A.err(e); } };
        const drawCl = () => {
          const cl = t.checklist || [];
          const done = cl.filter((c) => c.done).length;
          A.$('#clProg', root).textContent = cl.length ? `(${done}/${cl.length})` : '';
          A.$('#clBar', root).style.width = cl.length ? (done / cl.length) * 100 + '%' : '0';
          A.$('#mCl', root).innerHTML = cl.map((c, i) => `<div class="cl-item ${c.done ? 'done' : ''}"><input type="checkbox" data-i="${i}" ${c.done ? 'checked' : ''} ${dis}><span class="grow">${A.esc(c.text)}</span>${editable ? `<button class="btn xs ghost" data-rm="${i}">${A.icon('x')}</button>` : ''}</div>`).join('');
          A.icons(A.$('#mCl', root));
          A.$$('#mCl input', root).forEach((c) => (c.onchange = () => { t.checklist[c.dataset.i].done = c.checked; upd({ checklist: t.checklist }); drawCl(); if (c.checked) A.sound('pop'); }));
          A.$$('#mCl [data-rm]', root).forEach((b) => (b.onclick = () => { t.checklist.splice(b.dataset.rm, 1); upd({ checklist: t.checklist }); drawCl(); }));
        };
        const drawCom = () => {
          A.$('#mCom', root).innerHTML = (t.comments || []).map((c) => `<div class="comment">${A.avatar(c.userId, 'sm')}<div class="grow"><div><b>${A.esc(A.user(c.userId).displayName)}</b> <span class="small muted">${A.timeAgo(c.at)}</span></div><div class="md small">${A.md(c.text)}</div></div></div>`).join('') || '<p class="muted small">Henüz yorum yok.</p>';
        };
        drawCl(); drawCom();
        if (editable) {
          A.$('#mTitle', root).onchange = (e) => upd({ title: e.target.value.trim() || t.title });
          const dv = A.$('#mDescView', root), dt = A.$('#mDesc', root);
          dv.onclick = (e) => { if (e.target.tagName === 'A') return; dv.classList.add('hidden'); dt.classList.remove('hidden'); dt.focus(); };
          dt.onblur = () => { upd({ description: dt.value }); dv.innerHTML = dt.value ? A.md(dt.value) : '<span class="muted">Açıklama eklemek için tıklayın...</span>'; dt.classList.add('hidden'); dv.classList.remove('hidden'); };
          A.$('#mStatus', root).onchange = (e) => { const was = t.status; upd({ status: e.target.value }); if (e.target.value === 'done' && was !== 'done') { A.confetti(40); A.sound('done'); } };
          A.$('#mAssignee', root).onchange = (e) => upd({ assignee: e.target.value });
          A.$('#mPrio', root).onchange = (e) => upd({ priority: e.target.value });
          A.$('#mCat', root).onchange = (e) => upd({ category: e.target.value });
          A.$('#mDue', root).onchange = (e) => upd({ due: e.target.value });
          A.$('#mMs', root).onchange = (e) => upd({ milestoneId: e.target.value || null });
          A.$('#mEst', root).onchange = (e) => upd({ estimate: Number(e.target.value) || null });
          A.$('#mTags', root).onchange = (e) => upd({ tags: splitTags(e.target.value) });
          A.$('#clNew', root).onkeydown = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { t.checklist = [...(t.checklist || []), { text: e.target.value.trim(), done: false }]; e.target.value = ''; upd({ checklist: t.checklist }); drawCl(); } };
        }
        A.$('#comNew', root).onkeydown = (e) => { if (e.key === 'Enter' && e.target.value.trim()) { t.comments = [...(t.comments || []), { userId: A.state.user.id, text: e.target.value.trim(), at: Date.now() }]; e.target.value = ''; upd({ comments: t.comments }); drawCom(); } };
        const delB = A.$('#mDel', root);
        if (delB) delB.onclick = async () => { if (await A.confirm('Bu görev silinsin mi?')) { await A.col.remove('tasks', t.id).catch(A.err); m.close(); } };
      };

      const load = async () => { [tasks, milestones] = await Promise.all([A.col.project('tasks'), A.col.project('milestones')]); draw(); };
      await load();
      if (openId) openTask(openId);
      A.viewOn('db:tasks', (p) => {
        if (p.item.projectId && p.item.projectId !== A.state.projectId) return;
        if (p.action === 'delete') tasks = tasks.filter((t) => t.id !== p.item.id);
        else { const i = tasks.findIndex((t) => t.id === p.item.id); if (i >= 0) tasks[i] = p.item; else tasks.push(p.item); }
        if (!A.$('.tcard.dragging')) draw();
      });
      A.viewOn('tasks:new', () => newTask('todo'));
    },
  });

  function splitTags(s) { return String(s || '').split(',').map((x) => x.trim().replace(/^#/, '')).filter(Boolean).slice(0, 10); }
  A.splitTags = splitTags;
})();
