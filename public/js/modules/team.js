/* Ekip — üyeler, durumlar, profil kartları */
(function () {
  A.showUser = (id) => {
    const u = A.user(id);
    const m = A.modal({
      title: '', size: '', foot: false,
      body: `<div class="ucard"><div class="ucard-bg" style="background:linear-gradient(135deg, ${A.esc(u.avatarColor)}, transparent)"></div>
        ${A.avatar(u, 'xl', true)}
        <h2>${A.esc(u.displayName)}</h2><div class="muted">@${A.esc(u.username)} · ${A.esc(u.title || '')}</div>
        <div class="row" style="justify-content:center;gap:6px;margin:10px 0">${A.roleBadge(u.role)}<span class="badge"><i class="pres ${A.presenceOf(u)}" style="position:static;width:8px;height:8px;border-radius:50%;display:inline-block;border:0"></i>${A.PRESENCE[A.presenceOf(u)]}</span></div>
        ${u.statusText ? `<p class="hand" style="font-size:18px;margin:6px 0">“${A.esc(u.statusText)}”</p>` : ''}
        ${u.bio ? `<p class="small">${A.esc(u.bio)}</p>` : ''}
        ${(u.skills || []).length ? `<div class="row wrap" style="justify-content:center;gap:6px">${u.skills.map((s) => `<span class="tag">${A.esc(s)}</span>`).join('')}</div>` : ''}
        <div class="small muted" style="margin-top:12px">${A.state.online.has(u.id) ? 'Şu an çevrimiçi' : u.lastSeen ? 'Son görülme: ' + A.timeAgo(u.lastSeen) : ''} · Katılım: ${A.fmtDate(u.createdAt)}</div>
        <div class="row" style="justify-content:center;margin-top:16px;gap:8px">${u.id !== A.state.user.id ? `<button class="btn primary" data-dm>${A.icon('message-circle')} Mesaj gönder</button>` : `<button class="btn" data-prof>${A.icon('pencil')} Profili düzenle</button>`}</div></div>`,
    });
    const dm = A.$('[data-dm]', m.el);
    if (dm) dm.onclick = async () => { m.close(); try { const r = await A.post('/api/rooms', { type: 'dm', userId: u.id }); A.go('chat/' + r.id); } catch (e) { A.err(e); } };
    const pr = A.$('[data-prof]', m.el);
    if (pr) pr.onclick = () => { m.close(); A.go('profile'); };
  };

  A.register('team', {
    title: 'Ekip', icon: 'users', group: 'genel', scoped: false,
    async render(el) {
      let tasks = await A.col.list('tasks');
      el.innerHTML = `<div class="page-head"><div><h1>Ekip</h1><p>Stüdyodaki herkes, ne üzerinde çalıştıkları ve şu anki durumları.</p></div>
        <div class="actions"><div class="input-icon" style="width:220px">${A.icon('search')}<input class="input sm" id="tmQ" placeholder="Kişi ara..."></div>${A.can('manage_users') ? `<button class="btn" onclick="A.go('admin')">${A.icon('user-cog')} Kullanıcıları yönet</button>` : ''}</div></div>
        <div class="grid auto stagger" id="tmGrid"></div>`;
      A.icons(el);
      let q = '';
      A.$('#tmQ', el).oninput = (e) => { q = e.target.value.toLocaleLowerCase('tr'); draw(); };
      const draw = () => {
        const users = A.activeUsers().filter((u) => !q || (u.displayName + u.username + (u.title || '')).toLocaleLowerCase('tr').includes(q))
          .sort((a, b) => (A.state.online.has(b.id) ? 1 : 0) - (A.state.online.has(a.id) ? 1 : 0) || a.displayName.localeCompare(b.displayName, 'tr'));
        A.$('#tmGrid', el).innerHTML = users.map((u) => {
          const open = tasks.filter((t) => t.assignee === u.id && t.status !== 'done').length;
          const done = tasks.filter((t) => t.assignee === u.id && t.status === 'done').length;
          const doing = tasks.find((t) => t.assignee === u.id && t.status === 'progress');
          return `<div class="card hover member" data-id="${u.id}"><div class="member-bg" style="background:linear-gradient(135deg, ${A.esc(u.avatarColor)}55, transparent)"></div>
            ${A.avatar(u, 'lg', true)}<h3>${A.esc(u.displayName)}</h3><div class="small muted">${A.esc(u.title || 'Takım üyesi')}</div>
            <div style="margin:8px 0">${A.roleBadge(u.role)}</div>
            ${u.statusText ? `<div class="small hand" style="font-size:15px">“${A.esc(u.statusText)}”</div>` : ''}
            ${doing ? `<div class="small doing">${A.icon('timer')} ${A.esc(doing.title)}</div>` : ''}
            <div class="row" style="justify-content:center;gap:16px;margin-top:10px"><div><b>${open}</b><div class="small muted">açık iş</div></div><div><b>${done}</b><div class="small muted">tamamlanan</div></div></div></div>`;
        }).join('') || A.emptyState('users', 'Kimse bulunamadı');
        A.icons(A.$('#tmGrid', el));
        A.$$('.member', el).forEach((c) => (c.onclick = () => A.showUser(c.dataset.id)));
      };
      draw();
      A.viewOn('presence', draw);
      A.viewOn('users', draw);
    },
  });
})();
