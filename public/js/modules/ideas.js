/* Fikir Duvarı — beyin fırtınası için yapışkan notlar + oylama */
(function () {
  const COLORS = ['#ffd43b', '#69db7c', '#74c0fc', '#f783ac', '#ffa94d', '#b197fc', '#ffffff'];
  const CATS = ['Mekanik', 'Hikaye', 'Karakter', 'Seviye', 'Sanat', 'Ses', 'UI/UX', 'İş / Pazarlama', 'Diğer'];

  A.register('ideas', {
    title: 'Fikir Duvarı', icon: 'lightbulb', group: 'yaratici', full: true,
    async render(el) {
      if (A.needProject(el)) return;
      let ideas = await A.col.project('ideas');
      let cat = '';
      let view = A.ls.get('ideaView', 'wall');
      el.innerHTML = `<div class="ideas">
        <div class="draw-top">
          <b>Fikir Duvarı</b><span class="small muted">Fikirleri yapıştır, sürükle, oyla 💡</span><span class="spacer"></span>
          <select class="select sm" id="iCat" style="width:160px"><option value="">Tüm kategoriler</option>${CATS.map((c) => `<option>${c}</option>`).join('')}</select>
          <div class="seg"><button data-v="wall">${A.icon('sticky-note')} Duvar</button><button data-v="rank">${A.icon('trophy')} Sıralama</button></div>
          ${A.can('create') ? `<button class="btn primary sm" id="iNew">${A.icon('plus')} Fikir ekle</button>` : ''}
        </div>
        <div class="cork" id="iWall"></div></div>`;
      A.icons(el);
      const wall = A.$('#iWall', el);
      A.$('#iCat', el).onchange = (e) => { cat = e.target.value; draw(); };
      A.$$('.seg button', el).forEach((b) => (b.onclick = () => { view = b.dataset.v; A.ls.set('ideaView', view); draw(); }));
      const nb = A.$('#iNew', el);
      if (nb) nb.onclick = () => add(80 + wall.scrollLeft + Math.random() * 200, 60 + wall.scrollTop + Math.random() * 120);
      wall.addEventListener('dblclick', (e) => { if (e.target === wall || e.target.classList.contains('cork-inner')) { const r = wall.getBoundingClientRect(); if (A.can('create')) add(e.clientX - r.left + wall.scrollLeft - 100, e.clientY - r.top + wall.scrollTop - 40); } });

      const add = async (x, y) => {
        const r = await A.form({ title: 'Yeni Fikir', icon: 'lightbulb', fields: [
          { key: 'text', label: 'Fikrin', type: 'textarea', rows: 4, required: true, placeholder: 'Örn: Oyuncu zamanı 5 saniye geri sarabilsin!' },
          { key: 'category', label: 'Kategori', type: 'select', options: CATS, value: cat || 'Mekanik', half: true },
          { key: 'color', label: 'Renk', type: 'select', options: [['#ffd43b', 'Sarı'], ['#69db7c', 'Yeşil'], ['#74c0fc', 'Mavi'], ['#f783ac', 'Pembe'], ['#ffa94d', 'Turuncu'], ['#b197fc', 'Mor'], ['#ffffff', 'Beyaz']], half: true },
        ] });
        if (!r) return;
        try { await A.col.create('ideas', { ...r, x: Math.max(10, Math.round(x)), y: Math.max(10, Math.round(y)), rot: Math.round((Math.random() - 0.5) * 6), votes: [], projectId: A.state.projectId }); } catch (e) { A.err(e); }
      };

      const noteHtml = (i) => {
        const voted = (i.votes || []).includes(A.state.user.id);
        return `<div class="idea" data-id="${i.id}" style="left:${i.x}px;top:${i.y}px;background:${A.esc(i.color || '#ffd43b')};--rot:${i.rot || 0}deg">
          <div class="pin"></div>
          <div class="idea-cat">${A.esc(i.category || '')}</div>
          <div class="idea-text">${A.esc(i.text)}</div>
          <div class="idea-foot">${A.avatar(i.createdBy, 'xs')}<span class="spacer"></span>
            <button class="vote ${voted ? 'on' : ''}" data-vote title="${(i.votes || []).map((v) => A.esc(A.user(v).displayName)).join(', ')}">👍 ${(i.votes || []).length}</button>
            ${A.canEdit(i) ? `<button class="ib" data-edit title="Düzenle">✎</button>` : ''}${A.canDelete(i) ? `<button class="ib" data-del title="Sil">✕</button>` : ''}
          </div></div>`;
      };
      const draw = () => {
        A.$$('.seg button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === view));
        const list = ideas.filter((i) => !cat || i.category === cat);
        if (view === 'rank') {
          wall.className = 'cork rank';
          const sorted = [...list].sort((a, b) => (b.votes || []).length - (a.votes || []).length);
          wall.innerHTML = `<div class="rank-list">${sorted.map((i, k) => `<div class="rank-item card" data-id="${i.id}"><div class="rk">${k === 0 ? '🥇' : k === 1 ? '🥈' : k === 2 ? '🥉' : '#' + (k + 1)}</div><div class="rank-color" style="background:${A.esc(i.color)}"></div><div class="grow"><div>${A.esc(i.text)}</div><div class="small muted">${A.esc(i.category || '')} · ${A.esc(A.user(i.createdBy).displayName)}</div></div><button class="vote ${(i.votes || []).includes(A.state.user.id) ? 'on' : ''}" data-vote>👍 ${(i.votes || []).length}</button>${A.can('create') ? `<button class="btn xs" data-task title="Göreve dönüştür">${A.icon('check-square')} Göreve dönüştür</button>` : ''}</div>`).join('') || A.emptyState('lightbulb', 'Henüz fikir yok', 'İlk fikri sen ekle!')}</div>`;
        } else {
          wall.className = 'cork';
          wall.innerHTML = `<div class="cork-inner">${list.map(noteHtml).join('')}${!list.length ? `<div class="cork-empty">${A.icon('lightbulb')}<h3>Duvar boş</h3><p>Boş bir alana çift tıklayarak veya “Fikir ekle” ile ilk fikri yapıştır.</p></div>` : ''}</div>`;
        }
        A.icons(wall);
        A.$$('[data-id]', wall).forEach((n) => {
          const i = ideas.find((x) => x.id === n.dataset.id);
          const v = A.$('[data-vote]', n);
          if (v) v.onclick = async (e) => { e.stopPropagation(); const votes = new Set(i.votes || []); if (votes.has(A.state.user.id)) votes.delete(A.state.user.id); else { votes.add(A.state.user.id); A.sound('pop'); } i.votes = [...votes]; draw(); try { await A.col.update('ideas', i.id, { votes: i.votes }); } catch (er) { A.err(er); } };
          const ed = A.$('[data-edit]', n);
          if (ed) ed.onclick = async (e) => { e.stopPropagation(); const r = await A.form({ title: 'Fikri düzenle', icon: 'pencil', fields: [{ key: 'text', label: 'Fikir', type: 'textarea', value: i.text, required: true }, { key: 'category', label: 'Kategori', type: 'select', options: CATS, value: i.category, half: true }, { key: 'color', label: 'Renk', type: 'select', options: COLORS.map((c) => [c, c]), value: i.color, half: true }] }); if (r) A.col.update('ideas', i.id, r).catch(A.err); };
          const dl = A.$('[data-del]', n);
          if (dl) dl.onclick = async (e) => { e.stopPropagation(); if (await A.confirm('Fikir silinsin mi?')) A.col.remove('ideas', i.id).catch(A.err); };
          const tk = A.$('[data-task]', n);
          if (tk) tk.onclick = async () => { try { await A.col.create('tasks', { projectId: A.state.projectId, title: i.text.slice(0, 120), description: `💡 Fikir duvarından dönüştürüldü (${(i.votes || []).length} oy)`, status: 'todo', priority: 'medium', category: 'Tasarım', tags: ['fikir'], checklist: [], comments: [] }); A.toast('Görev panosuna eklendi', 'ok'); } catch (er) { A.err(er); } };
          if (view === 'wall' && A.canEdit(i)) {
            A.drag(n, {
              onStart: (e) => { if (e.target.closest('button')) return false; n.classList.add('dragging'); n.style.zIndex = 50; return { x: i.x, y: i.y }; },
              onMove: (e, dx, dy, s) => { n.style.left = Math.max(0, s.x + dx) + 'px'; n.style.top = Math.max(0, s.y + dy) + 'px'; },
              onEnd: async (e, dx, dy, s) => { n.classList.remove('dragging'); n.style.zIndex = ''; if (Math.abs(dx) + Math.abs(dy) < 3) return; i.x = Math.max(0, Math.round(s.x + dx)); i.y = Math.max(0, Math.round(s.y + dy)); try { await A.col.update('ideas', i.id, { x: i.x, y: i.y }); } catch (er) { A.err(er); } },
            });
          }
        });
      };
      draw();
      A.viewOn('db:ideas', (p) => {
        if (p.item.projectId && p.item.projectId !== A.state.projectId) return;
        if (p.action === 'delete') ideas = ideas.filter((i) => i.id !== p.item.id);
        else { const k = ideas.findIndex((i) => i.id === p.item.id); if (k >= 0) ideas[k] = p.item; else ideas.push(p.item); }
        if (!A.$('.idea.dragging', el)) draw();
      });
    },
  });
})();
