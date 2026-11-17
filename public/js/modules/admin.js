/* Yönetim Paneli — onaylar, kullanıcılar, roller & yetkiler, sistem, aktivite günlüğü */
(function () {
  const STATUS = { active: ['Aktif', 'green'], pending: ['Onay bekliyor', 'yellow'], rejected: ['Reddedildi', 'red'], disabled: ['Devre dışı', ''] };

  A.register('admin', {
    title: 'Yönetim Paneli', icon: 'shield-check', group: 'yonetim', perm: 'view_admin', scoped: false,
    async render(el, [tab = 'pending']) {
      el.innerHTML = `<div class="page-head"><div><h1>Yönetim Paneli</h1><p>Hesap onayları, kullanıcı yetkileri ve sistem ayarları.</p></div></div>
        <div class="grid c4 stagger" id="adStats" style="margin-bottom:18px"></div>
        <div class="tabs" id="adTabs"></div>
        <div id="adBody"></div>`;
      A.icons(el);
      let users = [];
      const tabs = [['pending', 'user-plus', 'Onay Bekleyenler'], ['users', 'users', 'Kullanıcılar'], ['roles', 'key-round', 'Roller & Yetkiler'], ['system', 'server', 'Sistem'], ['log', 'history', 'Aktivite Günlüğü']];
      const drawTabs = () => {
        const pend = users.filter((u) => u.status === 'pending').length;
        A.$('#adTabs', el).innerHTML = tabs.map(([k, ic, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${A.icon(ic)} ${l}${k === 'pending' && pend ? ` <span class="badge count">${pend}</span>` : ''}</button>`).join('');
        A.icons(A.$('#adTabs', el));
        A.$$('#adTabs button', el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; history.replaceState(null, '', '#/admin/' + tab); drawTabs(); show(); }));
      };
      const loadUsers = async () => { users = await A.get('/api/users'); users.forEach((u) => A.state.users.set(u.id, u)); };
      const stats = async () => {
        try {
          const o = await A.get('/api/admin/overview');
          const box = A.$('#adStats', el);
          if (!box) return;
          box.innerHTML = [['users', 'Toplam kullanıcı', o.users, 'var(--accent)'], ['user-plus', 'Onay bekleyen', o.pending, 'var(--yellow)'], ['wifi', 'Şu an çevrimiçi', o.online, 'var(--mint)'], ['folder-kanban', 'Proje', o.counts.projects, 'var(--blue)']]
            .map(([ic, l, n, c]) => `<div class="card stat"><div class="st-ico" style="color:${c};background:color-mix(in srgb, ${c} 15%, transparent)">${A.icon(ic)}</div><div><div class="st-n">${n}</div><div class="st-l">${l}</div></div></div>`).join('');
          A.icons(box);
          return o;
        } catch (e) { A.err(e); }
      };
      const show = async () => {
        const body = A.$('#adBody', el);
        body.innerHTML = '<div class="loader"></div>';
        if (tab === 'pending') pending(body);
        else if (tab === 'users') usersTab(body);
        else if (tab === 'roles') roles(body);
        else if (tab === 'system') system(body);
        else log(body);
        A.icons(body);
      };

      // ------------------------------------------------------------ pending
      const pending = (body) => {
        const list = users.filter((u) => u.status === 'pending').sort((a, b) => a.createdAt - b.createdAt);
        if (!A.can('manage_users')) { body.innerHTML = A.emptyState('lock', 'Yetkiniz yok', 'Hesap onayları için kullanıcı yönetimi yetkisi gerekir.'); return; }
        body.innerHTML = list.length ? `<div class="grid auto stagger">${list.map((u) => `<div class="card pend" data-id="${u.id}">
            <div class="row">${A.avatar(u, 'lg')}<div class="grow"><b>${A.esc(u.displayName)}</b><div class="small muted">@${A.esc(u.username)}${u.email ? ' · ' + A.esc(u.email) : ''}</div><div class="small">${A.esc(u.title || '')}</div></div></div>
            ${u.signupNote ? `<div class="pend-note">“${A.esc(u.signupNote)}”</div>` : ''}
            <div class="small muted" style="margin:8px 0">${A.timeAgo(u.createdAt)} başvurdu</div>
            <div class="field" style="margin-bottom:10px"><label>Verilecek rol</label><select class="select sm" data-role>${Object.entries(A.state.roles).filter(([k]) => k !== 'admin' || A.isAdmin()).map(([k, r]) => `<option value="${k}" ${k === 'member' ? 'selected' : ''}>${A.esc(r.name)}</option>`).join('')}</select></div>
            <div class="row"><button class="btn mint grow" data-ok>${A.icon('check')} Onayla</button><button class="btn danger grow" data-no>${A.icon('x')} Reddet</button></div></div>`).join('')}</div>`
          : A.emptyState('user-check', 'Bekleyen başvuru yok', 'Biri kayıt olduğunda burada görünecek ve size bildirim gelecek.');
        A.icons(body);
        A.$$('.pend', body).forEach((c) => {
          const id = c.dataset.id;
          A.$('[data-ok]', c).onclick = async () => {
            try { await A.post(`/api/admin/users/${id}/approve`, { role: A.$('[data-role]', c).value }); c.animate([{ transform: 'scale(1)' }, { transform: 'scale(.9)', opacity: 0 }], { duration: 300 }).onfinish = refresh; A.toast('Kullanıcı onaylandı 🎉', 'ok'); A.confetti(40); } catch (e) { A.err(e); }
          };
          A.$('[data-no]', c).onclick = async () => {
            if (!(await A.confirm('Bu başvuru reddedilsin mi?', { ok: 'Reddet' }))) return;
            try { await A.post(`/api/admin/users/${id}/reject`); refresh(); A.toast('Başvuru reddedildi', 'info'); } catch (e) { A.err(e); }
          };
        });
      };

      // ------------------------------------------------------------ users
      const usersTab = (body) => {
        const canM = A.can('manage_users');
        let q = '';
        body.innerHTML = `<div class="card" style="padding:0"><div class="row" style="padding:12px;border-bottom:1px solid var(--line)"><div class="input-icon" style="width:260px">${A.icon('search')}<input class="input sm" id="auQ" placeholder="Kullanıcı ara..."></div><span class="spacer"></span>${canM ? `<button class="btn sm primary" id="auNew">${A.icon('user-plus')} Kullanıcı oluştur</button>` : ''}</div>
          <div style="overflow:auto"><table class="table"><thead><tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th><th>Son görülme</th><th>Kayıt</th><th></th></tr></thead><tbody id="auBody"></tbody></table></div></div>`;
        A.icons(body);
        const draw = () => {
          const list = users.filter((u) => !q || (u.displayName + u.username + (u.email || '')).toLocaleLowerCase('tr').includes(q)).sort((a, b) => (a.role === 'admin' ? -1 : 0) - (b.role === 'admin' ? -1 : 0) || a.displayName.localeCompare(b.displayName, 'tr'));
          A.$('#auBody', body).innerHTML = list.map((u) => `<tr data-id="${u.id}"><td><div class="row" style="gap:10px">${A.avatar(u, 'sm', true)}<div><b>${A.esc(u.displayName)}</b> ${u.id === A.state.user.id ? '<span class="badge accent">Sen</span>' : ''}<div class="small muted">@${A.esc(u.username)}${u.email ? ' · ' + A.esc(u.email) : ''}</div></div></div></td>
            <td>${canM && u.id !== A.state.user.id && (A.isAdmin() || u.role !== 'admin') ? `<select class="select sm" data-role style="width:160px">${Object.entries(A.state.roles).filter(([k]) => k !== 'admin' || A.isAdmin()).map(([k, r]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${A.esc(r.name)}</option>`).join('')}</select>` : A.roleBadge(u.role)}</td>
            <td><span class="badge ${STATUS[u.status][1]}">${STATUS[u.status][0]}</span></td>
            <td class="small muted">${A.state.online.has(u.id) ? '<span class="badge green">Çevrimiçi</span>' : u.lastSeen ? A.timeAgo(u.lastSeen) : '—'}</td>
            <td class="small muted">${A.fmtDate(u.createdAt)}</td>
            <td>${canM && u.id !== A.state.user.id ? `<button class="btn xs ghost" data-more>${A.icon('more-horizontal')}</button>` : ''}</td></tr>`).join('');
          A.icons(A.$('#auBody', body));
          A.$$('#auBody tr', body).forEach((tr) => {
            const u = users.find((x) => x.id === tr.dataset.id);
            const rs = A.$('[data-role]', tr);
            if (rs) rs.onchange = async () => { try { await A.put('/api/admin/users/' + u.id, { role: rs.value }); A.toast(`${u.displayName} → ${A.roleName(rs.value)}`, 'ok'); await loadUsers(); } catch (e) { A.err(e); rs.value = u.role; } };
            const mb = A.$('[data-more]', tr);
            if (mb) mb.onclick = () => A.menu(mb, [
              { icon: 'user', label: 'Profili görüntüle', action: () => A.showUser(u.id) },
              ...(u.status === 'pending' ? [{ icon: 'check', label: 'Onayla', action: async () => { await A.post(`/api/admin/users/${u.id}/approve`, { role: 'member' }).catch(A.err); refresh(); } }] : []),
              u.status === 'disabled' || u.status === 'rejected'
                ? { icon: 'user-check', label: 'Etkinleştir', action: async () => { await A.put('/api/admin/users/' + u.id, { status: 'active' }).catch(A.err); refresh(); } }
                : u.status === 'active' ? { icon: 'ban', label: 'Devre dışı bırak', action: async () => { if (await A.confirm(`${u.displayName} hesabı devre dışı bırakılsın mı? Oturumları kapatılacak.`)) { await A.put('/api/admin/users/' + u.id, { status: 'disabled' }).catch(A.err); refresh(); } } } : null,
              { icon: 'pencil', label: 'Ad / unvan düzenle', action: async () => { const r = await A.form({ title: 'Kullanıcıyı düzenle', icon: 'pencil', fields: [{ key: 'displayName', label: 'Görünen ad', value: u.displayName }, { key: 'title', label: 'Unvan', value: u.title }] }); if (r) { await A.put('/api/admin/users/' + u.id, r).catch(A.err); refresh(); } } },
              { icon: 'key-round', label: 'Şifre sıfırla', action: async () => { const pw = await A.prompt('Yeni şifre', { label: `${u.displayName} için yeni şifre (en az 6 karakter)`, type: 'text', value: genPw() }); if (pw) { try { await A.post(`/api/admin/users/${u.id}/reset-password`, { password: pw }); A.modal({ title: 'Şifre sıfırlandı', icon: 'key-round', body: `<p>${A.esc(u.displayName)} için yeni şifre:</p><p class="mono" style="font-size:20px;background:var(--bg-2);padding:12px;border-radius:10px;text-align:center">${A.esc(pw)}</p><p class="small muted">Bu şifreyi kullanıcıyla güvenli bir şekilde paylaşın.</p>` }); } catch (e) { A.err(e); } } } },
              '-',
              { icon: 'trash-2', label: 'Kullanıcıyı sil', danger: true, action: async () => { if (await A.confirm(`${u.displayName} kalıcı olarak silinsin mi? İçerikleri silinmez.`, { ok: 'Sil' })) { await A.del('/api/admin/users/' + u.id).catch(A.err); refresh(); } } },
            ].filter(Boolean), { align: 'right' });
          });
        };
        draw();
        A.$('#auQ', body).oninput = (e) => { q = e.target.value.toLocaleLowerCase('tr'); draw(); };
        const nb = A.$('#auNew', body);
        if (nb) nb.onclick = async () => {
          const r = await A.form({ title: 'Yeni kullanıcı oluştur', icon: 'user-plus', fields: [
            { key: 'displayName', label: 'Ad Soyad', required: true, half: true }, { key: 'username', label: 'Kullanıcı adı', required: true, half: true },
            { key: 'email', label: 'E-posta', type: 'email', half: true }, { key: 'title', label: 'Unvan', half: true },
            { key: 'role', label: 'Rol', type: 'select', options: Object.entries(A.state.roles).filter(([k]) => k !== 'admin' || A.isAdmin()).map(([k, v]) => [k, v.name]), value: 'member', half: true },
            { key: 'password', label: 'Geçici şifre', value: genPw(), half: true },
          ] });
          if (!r) return;
          try { await A.post('/api/admin/users', r); A.toast(`${r.displayName} oluşturuldu. Şifre: ${r.password}`, 'ok'); refresh(); } catch (e) { A.err(e); }
        };
      };
      const genPw = () => { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join('') + '!'; };

      // ------------------------------------------------------------ roles
      const roles = async (body) => {
        const { roles: rs, permissions } = await A.get('/api/admin/roles');
        const work = JSON.parse(JSON.stringify(rs));
        const editable = A.isAdmin();
        const draw = () => {
          body.innerHTML = `<div class="card" style="padding:0;overflow:auto"><table class="table perm-table"><thead><tr><th>Yetki</th>${Object.entries(work).map(([k, r]) => `<th style="text-align:center"><span class="badge" style="background:${r.color}22;color:${r.color}">${A.esc(r.name)}</span>${editable && !['admin', 'member'].includes(k) ? ` <button class="btn xs ghost" data-delr="${k}" title="Rolü sil">${A.icon('x')}</button>` : ''}<div class="small muted">${users.filter((u) => u.role === k).length} kişi</div></th>`).join('')}</tr></thead>
            <tbody>${Object.entries(permissions).map(([p, label]) => `<tr><td>${A.esc(label)}</td>${Object.entries(work).map(([k, r]) => `<td style="text-align:center"><input type="checkbox" data-r="${k}" data-p="${p}" ${r.perms.includes(p) || k === 'admin' ? 'checked' : ''} ${!editable || k === 'admin' ? 'disabled' : ''}></td>`).join('')}</tr>`).join('')}</tbody></table></div>
            ${editable ? `<div class="row" style="margin-top:14px"><button class="btn" id="rlNew">${A.icon('plus')} Yeni rol</button><span class="spacer"></span><button class="btn primary" id="rlSave">${A.icon('save')} Yetkileri kaydet</button></div>` : '<p class="small muted" style="margin-top:12px">Rolleri yalnızca Admin düzenleyebilir.</p>'}
            <div class="card" style="margin-top:16px"><div class="card-title">${A.icon('info')} Nasıl çalışır?</div><ul class="small muted" style="margin:0;padding-left:18px;line-height:1.9"><li><b>Admin</b> rolü her zaman tüm yetkilere sahiptir ve değiştirilemez.</li><li>Kendi oluşturduğu içerikleri herkes (izleyici hariç) düzenleyip silebilir.</li><li><b>Başkalarının içeriğini düzenle</b> yetkisi ortak çalışma (GDD, görevler, seviyeler) için gereklidir.</li><li>Yeni kayıt olan kullanıcılar onaylanana kadar giriş yapamaz.</li></ul></div>`;
          A.icons(body);
          A.$$('[data-r]', body).forEach((c) => (c.onchange = () => { const r = work[c.dataset.r]; r.perms = c.checked ? [...new Set([...r.perms, c.dataset.p])] : r.perms.filter((x) => x !== c.dataset.p); }));
          A.$$('[data-delr]', body).forEach((b) => (b.onclick = async () => { if (await A.confirm(`“${work[b.dataset.delr].name}” rolü silinsin mi? Bu roldeki kullanıcılar Takım Üyesi olur.`)) { delete work[b.dataset.delr]; draw(); } }));
          const nr = A.$('#rlNew', body);
          if (nr) nr.onclick = async () => { const r = await A.form({ title: 'Yeni rol', icon: 'key-round', fields: [{ key: 'name', label: 'Rol adı', required: true, placeholder: 'Örn: Sanat Yönetmeni' }, { key: 'color', label: 'Renk', type: 'color', value: '#4dabf7' }] }); if (r) { const key = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20) || 'rol_' + Date.now().toString(36); work[key.length >= 2 ? key : 'rol_' + key] = { name: r.name, color: r.color, perms: ['create'] }; draw(); } };
          const sv = A.$('#rlSave', body);
          if (sv) sv.onclick = async () => { try { const res = await A.put('/api/admin/roles', { roles: work }); A.state.roles = res.roles; A.toast('Roller ve yetkiler kaydedildi', 'ok'); await loadUsers(); } catch (e) { A.err(e); } };
        };
        draw();
      };

      // ------------------------------------------------------------ system
      const system = async (body) => {
        const [o, s] = await Promise.all([A.get('/api/admin/overview'), A.get('/api/admin/settings')]);
        const canSys = A.can('manage_system');
        body.innerHTML = `<div class="grid c2">
          <div class="card"><div class="card-title">${A.icon('sliders-horizontal')} Stüdyo ayarları</div>
            <label class="pref-row"><div><b>Yeni kayıtlara izin ver</b><div class="small muted">Kapalıyken kimse başvuru yapamaz. Açıkken her başvuru onayınıza düşer.</div></div><label class="switch"><input type="checkbox" id="syReg" ${s.registrationOpen !== false ? 'checked' : ''} ${canSys ? '' : 'disabled'}><span></span></label></label>
            <div class="field" style="margin-top:12px"><label>Stüdyo adı</label><input class="input" id="syName" value="${A.esc(s.studioName || 'Ayra Design')}" ${canSys ? '' : 'disabled'}></div>
            <div class="field"><label>Hoş geldin mesajı</label><textarea class="textarea" id="syWel" rows="2" ${canSys ? '' : 'disabled'}>${A.esc(s.welcomeMessage || '')}</textarea></div>
            ${canSys ? `<button class="btn primary" id="sySave">${A.icon('save')} Kaydet</button>` : ''}</div>
          <div class="card"><div class="card-title">${A.icon('wifi')} Ekibi bağlama</div>
            <p class="small muted" style="margin-top:0">Aynı ağdaki (Wi-Fi / LAN) ekip arkadaşlarınız aşağıdaki adreslerden birini tarayıcıda açarak veya Ayra Design uygulamasında <b>Sunucu → Uzak sunucuya bağlan</b> seçeneğiyle stüdyoya katılabilir:</p>
            ${o.lanAddresses.length ? o.lanAddresses.map((a) => `<div class="row lan"><code class="grow">${A.esc(a)}</code><button class="btn xs" data-copy="${A.esc(a)}">${A.icon('copy')}</button></div>`).join('') : '<p class="small">Ağ bağlantısı bulunamadı.</p>'}
            <p class="small muted">İnternet üzerinden erişim için sunucuyu bir buluta (ör. VPS) kurabilir veya port yönlendirme yapabilirsiniz. Ayrıntılar README dosyasında.</p></div>
          <div class="card"><div class="card-title">${A.icon('database')} Yedekleme</div>
            <p class="small muted" style="margin-top:0">Tüm verilerin (kullanıcılar, projeler, notlar, mesajlar...) tek bir JSON yedeği. Yüklenen dosyalar <code>${A.esc(o.dataDir)}</code> klasöründedir.</p>
            ${canSys ? `<div class="row"><button class="btn" id="syBackup">${A.icon('download')} Yedek indir</button><button class="btn danger" id="syRestore">${A.icon('upload')} Yedekten geri yükle</button></div>
            <div class="label" style="margin:16px 0 6px">Otomatik günlük yedekler <span class="muted">(son 14 gün saklanır)</span></div><div id="syAuto" class="small muted">Yükleniyor...</div>` : '<p class="small">Yetkiniz yok.</p>'}</div>
          <div class="card"><div class="card-title">${A.icon('activity')} Sistem durumu</div>
            <table class="table small"><tr><td class="muted">Çalışma süresi</td><td>${Math.floor(o.uptime / 3600)} sa ${Math.floor((o.uptime % 3600) / 60)} dk</td></tr><tr><td class="muted">Veritabanı boyutu</td><td>${A.fmtSize(o.dbSize)}</td></tr><tr><td class="muted">Node.js</td><td>${A.esc(o.node)}</td></tr>
            ${Object.entries(o.counts).map(([k, v]) => `<tr><td class="muted">${A.esc(k)}</td><td>${v}</td></tr>`).join('')}</table></div></div>`;
        A.icons(body);
        A.$$('[data-copy]', body).forEach((b) => (b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => A.toast('Adres kopyalandı', 'ok'))));
        const sv = A.$('#sySave', body);
        if (sv) sv.onclick = async () => { try { await A.put('/api/admin/settings', { registrationOpen: A.$('#syReg', body).checked, studioName: A.$('#syName', body).value, welcomeMessage: A.$('#syWel', body).value }); A.toast('Ayarlar kaydedildi', 'ok'); } catch (e) { A.err(e); } };
        const reg = A.$('#syReg', body);
        if (reg && canSys) reg.onchange = async () => { try { await A.put('/api/admin/settings', { registrationOpen: reg.checked }); A.toast(reg.checked ? 'Kayıtlar açıldı' : 'Kayıtlar kapatıldı', 'ok'); } catch (e) { A.err(e); } };
        const bk = A.$('#syBackup', body);
        if (bk) bk.onclick = async () => { try { const d = await A.get('/api/admin/backup'); A.download(`ayra-yedek-${A.today()}.json`, JSON.stringify(d)); } catch (e) { A.err(e); } };
        const auto = A.$('#syAuto', body);
        if (auto) {
          const drawAuto = async () => {
            const list = await A.get('/api/admin/backups').catch(() => []);
            auto.innerHTML = (list.length ? list.map((b) => `<div class="row lan" style="gap:8px">${A.icon('database')}<span class="grow mono">${A.esc(b.name)}</span><span>${A.fmtSize(b.size)}</span><button class="btn xs" data-bk="${A.esc(b.name)}">${A.icon('download')}</button></div>`).join('') : '<p>Henüz otomatik yedek yok.</p>') + `<button class="btn xs" id="syNow" style="margin-top:6px">${A.icon('save')} Şimdi yedekle</button>`;
            A.icons(auto);
            A.$$('[data-bk]', auto).forEach((b) => (b.onclick = async () => { try { const r = await fetch('/api/admin/backups/' + encodeURIComponent(b.dataset.bk), { headers: { Authorization: 'Bearer ' + A.state.token } }); if (!r.ok) throw new Error('İndirilemedi'); A.download(b.dataset.bk, await r.blob()); } catch (e) { A.err(e); } }));
            A.$('#syNow', auto).onclick = async () => { await A.post('/api/admin/backups').catch(A.err); A.toast('Yedek alındı', 'ok'); drawAuto(); };
          };
          drawAuto();
        }
        const rs = A.$('#syRestore', body);
        if (rs) rs.onclick = async () => {
          const f = await A.pickFile('application/json,.json');
          if (!f) return;
          if (!(await A.confirm('Mevcut TÜM veriler yedektekiyle değiştirilecek. Bu işlem geri alınamaz!', { ok: 'Geri yükle' }))) return;
          try { const data = JSON.parse(await A.readFile(f, 'text')); await A.post('/api/admin/restore', { data }); A.toast('Yedek geri yüklendi, sayfa yenileniyor...', 'ok'); } catch (e) { A.err(e); }
        };
      };

      // ------------------------------------------------------------ log
      const log = async (body) => {
        const list = await A.get('/api/admin/activity');
        const ICON = { auth: 'log-in', admin: 'shield-check', tasks: 'check-square', notes: 'sticky-note', bugs: 'bug', rooms: 'hash', files: 'file', user: 'user-plus' };
        body.innerHTML = `<div class="card"><div class="act-list">${list.map((a) => `<div class="act">${A.avatar(a.userId, 'sm')}<div class="grow"><b>${A.esc(A.user(a.userId).displayName)}</b> ${A.esc(a.action)}${a.targetTitle ? `: <span class="accent-txt">${A.esc(a.targetTitle)}</span>` : ''}<div class="small muted">${A.icon(ICON[a.kind] || 'activity')} ${new Date(a.createdAt).toLocaleString('tr-TR')}</div></div></div>`).join('') || '<p class="muted">Kayıt yok.</p>'}</div></div>`;
        A.icons(body);
      };

      const refresh = async () => { await loadUsers(); drawTabs(); stats(); show(); A.refreshPending(); };
      await loadUsers();
      drawTabs(); stats(); show();
      A.viewOn('pending:changed', A.debounce(refresh, 300));
    },
  });
})();
