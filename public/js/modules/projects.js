/* Projeler */
(function () {
  const ICONS = ['gamepad-2', 'swords', 'castle', 'rocket', 'ghost', 'trees', 'gem', 'skull', 'crosshair', 'flame', 'trophy', 'box'];
  const STATUSES = ['Fikir', 'Ön Üretim', 'Prototip', 'Üretim', 'Alfa', 'Beta', 'Yayında', 'Beklemede'];

  A.register('projects', {
    title: 'Projeler', icon: 'folder-kanban', group: 'yonetim', scoped: false,
    async render(el) {
      el.innerHTML = `<div class="page-head"><div><h1>Oyun Projeleri</h1><p>Stüdyonuzdaki tüm oyun projeleri. Aktif projeyi seçerek modüller arasında çalışın.</p></div>
        <div class="actions">${A.can('manage_projects') ? `<button class="btn primary" id="pNew">${A.icon('plus')} Yeni Proje</button>` : ''}</div></div>
        <div class="grid auto stagger" id="pList"></div>`;
      A.icons(el);
      const nb = A.$('#pNew', el);
      if (nb) nb.onclick = () => edit();
      const draw = async () => {
        const [tasks, bugs] = await Promise.all([A.col.list('tasks'), A.col.list('bugs')]);
        const box = A.$('#pList', el);
        if (!box) return;
        const ps = A.state.projects;
        box.innerHTML = ps.length ? ps.map((p) => {
          const t = tasks.filter((x) => x.projectId === p.id);
          const done = t.filter((x) => x.status === 'done').length;
          const pct = t.length ? Math.round((done / t.length) * 100) : 0;
          const ob = bugs.filter((b) => b.projectId === p.id && !['fixed', 'closed'].includes(b.status)).length;
          return `<div class="card hover proj ${p.id === A.state.projectId ? 'active' : ''}" data-id="${p.id}" style="--pc:${A.esc(p.color || '#9b87f5')}">
            <div class="proj-banner"><div class="proj-ico">${A.icon(p.icon || 'gamepad-2')}</div>${p.id === A.state.projectId ? '<span class="badge accent">Aktif</span>' : ''}</div>
            <h3>${A.esc(p.name)}</h3>
            <p class="muted small">${A.esc(p.description || 'Açıklama yok')}</p>
            <div class="row wrap" style="gap:6px;margin:10px 0">${p.genre ? `<span class="tag">${A.esc(p.genre)}</span>` : ''}${p.platform ? `<span class="tag">${A.esc(p.platform)}</span>` : ''}${p.engine ? `<span class="tag">${A.esc(p.engine)}</span>` : ''}<span class="badge blue">${A.esc(p.status || '')}</span></div>
            <div class="row small muted" style="justify-content:space-between"><span>${done}/${t.length} görev</span><span>${ob} açık hata</span><span>%${pct}</span></div>
            <div class="progress" style="margin-top:6px"><i style="width:${pct}%"></i></div>
            <div class="row" style="margin-top:14px;gap:6px">
              <button class="btn sm primary" data-act="use">${A.icon('play')} Aç</button>
              ${A.can('manage_projects') ? `<button class="btn sm" data-act="edit">${A.icon('pencil')}</button><button class="btn sm danger" data-act="del">${A.icon('trash-2')}</button>` : ''}
            </div></div>`;
        }).join('') : A.emptyState('folder-kanban', 'Henüz proje yok', 'İlk oyun projenizi oluşturun!');
        A.icons(box);
        A.$$('.proj', box).forEach((c) => {
          const p = A.state.projects.find((x) => x.id === c.dataset.id);
          c.onclick = (e) => {
            const act = e.target.closest('[data-act]');
            const a = act ? act.dataset.act : 'use';
            if (a === 'edit') return edit(p);
            if (a === 'del') return del(p);
            A.setProject(p.id);
            A.toast(`“${p.name}” aktif proje olarak seçildi`, 'ok');
            A.go('dashboard');
          };
        });
      };
      const edit = async (p = {}) => {
        const r = await A.form({
          title: p.id ? 'Projeyi Düzenle' : 'Yeni Oyun Projesi', icon: 'folder-kanban', size: 'wide',
          fields: [
            { key: 'name', label: 'Proje adı', value: p.name, required: true },
            { key: 'description', label: 'Açıklama', type: 'textarea', value: p.description, rows: 3 },
            { key: 'genre', label: 'Tür', value: p.genre, placeholder: 'Platform, RPG, Bulmaca...', half: true },
            { key: 'platform', label: 'Platform', value: p.platform, placeholder: 'PC, Mobil, Konsol', half: true },
            { key: 'engine', label: 'Oyun motoru', type: 'select', value: p.engine || 'Unity', options: ['Unity', 'Unreal Engine', 'Godot', 'GameMaker', 'Construct', 'RPG Maker', 'Özel motor', 'Diğer'], half: true },
            { key: 'status', label: 'Durum', type: 'select', value: p.status || 'Fikir', options: STATUSES, half: true },
            { key: 'icon', label: 'Simge', type: 'select', value: p.icon || 'gamepad-2', options: ICONS, half: true },
            { key: 'color', label: 'Renk', type: 'color', value: p.color || '#9b87f5', half: true },
          ],
        });
        if (!r) return;
        try {
          if (p.id) await A.col.update('projects', p.id, r);
          else {
            const np = await A.col.create('projects', r);
            if (!A.state.projects.find((x) => x.id === np.id)) A.state.projects.push(np);
            // varsayılan GDD şablonu
            const sections = ['Genel Bakış', 'Hikaye & Evren', 'Oynanış (Gameplay)', 'Mekanikler', 'Karakterler', 'Seviye Tasarımı', 'Arayüz (UI/UX)', 'Sanat Yönü', 'Ses & Müzik', 'Teknik Tasarım'];
            const icons = ['sparkles', 'book-open', 'gamepad-2', 'cog', 'users', 'map', 'layout', 'palette', 'music', 'cpu'];
            await Promise.all(sections.map((s, i) => A.col.create('gdd', { projectId: np.id, title: s, icon: icons[i], content: `## ${s}\n\n`, order: i })));
            A.setProject(np.id);
            A.confetti(60);
          }
          A.toast('Proje kaydedildi', 'ok');
        } catch (e) { A.err(e); }
      };
      const del = async (p) => {
        if (!(await A.confirm(`“${p.name}” projesi ve ona bağlı TÜM içerikler (görevler, GDD, seviyeler, hatalar...) kalıcı olarak silinecek.`, { ok: 'Projeyi sil' }))) return;
        try { await A.col.remove('projects', p.id); A.toast('Proje silindi', 'ok'); } catch (e) { A.err(e); }
      };
      await draw();
      A.viewOn('db:projects', () => setTimeout(draw, 50));
    },
  });
})();
