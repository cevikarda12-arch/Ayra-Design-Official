/* Hata Takibi (Bug Tracker) */
(function () {
  const SEV = { critical: ['Kritik', '#ff6b6b'], high: ['Yüksek', '#ffa94d'], medium: ['Orta', '#ffd43b'], low: ['Düşük', '#69db7c'] };
  const STATUS = { open: ['Açık', '#ff6b6b', 'circle-dot'], progress: ['İnceleniyor', '#4dabf7', 'timer'], fixed: ['Düzeltildi', '#20c997', 'check-circle-2'], closed: ['Kapandı', '#868e96', 'circle-x'], wontfix: ['Düzeltilmeyecek', '#adb5bd', 'ban'] };
  const PLATFORMS = ['Windows', 'macOS', 'Linux', 'Android', 'iOS', 'Web', 'PlayStation', 'Xbox', 'Switch', 'Tümü'];

  A.register('bugs', {
    title: 'Hata Takibi', icon: 'bug', group: 'uretim',
    async render(el, [openId]) {
      if (A.needProject(el)) return;
      let bugs = await A.col.project('bugs');
      const f = { q: '', status: 'active', sev: '' };
      el.innerHTML = `<div class="page-head"><div><h1>Hata Takibi</h1><p>Oyundaki hataları kaydedin, önceliklendirin ve takip edin.</p></div>
        <div class="actions"><button class="btn primary" id="bNew">${A.icon('plus')} Hata Bildir</button></div></div>
        <div class="grid c4 stagger" id="bStats" style="margin-bottom:16px"></div>
        <div class="card" style="padding:0">
          <div class="row wrap" style="padding:12px;gap:8px;border-bottom:1px solid var(--line)">
            <div class="input-icon" style="width:240px">${A.icon('search')}<input class="input sm" id="bQ" placeholder="Hata ara..."></div>
            <div class="seg" id="bSt"><button data-s="active">Aktif</button><button data-s="">Tümü</button>${Object.entries(STATUS).map(([k, v]) => `<button data-s="${k}">${v[0]}</button>`).join('')}</div>
            <select class="select sm" id="bSev" style="width:150px"><option value="">Tüm önem dereceleri</option>${Object.entries(SEV).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
          </div>
          <div style="overflow:auto"><table class="table"><thead><tr><th>#</th><th>Başlık</th><th>Önem</th><th>Durum</th><th>Platform</th><th>Atanan</th><th>Bildiren</th><th>Tarih</th></tr></thead><tbody id="bBody"></tbody></table></div>
        </div>`;
      A.icons(el);
      A.$('#bNew', el).onclick = () => edit({});
      A.$('#bQ', el).oninput = (e) => { f.q = e.target.value.toLocaleLowerCase('tr'); draw(); };
      A.$('#bSev', el).onchange = (e) => { f.sev = e.target.value; draw(); };
      A.$$('#bSt button', el).forEach((b) => (b.onclick = () => { f.status = b.dataset.s; draw(); }));

      const num = (b) => bugs.slice().sort((x, y) => x.createdAt - y.createdAt).indexOf(b) + 1;
      const draw = () => {
        A.$$('#bSt button', el).forEach((b) => b.classList.toggle('on', b.dataset.s === f.status));
        const stats = [['Açık', bugs.filter((b) => b.status === 'open').length, '#ff6b6b', 'circle-dot'], ['Kritik (aktif)', bugs.filter((b) => b.severity === 'critical' && ['open', 'progress'].includes(b.status)).length, '#f06595', 'flame'], ['İnceleniyor', bugs.filter((b) => b.status === 'progress').length, '#4dabf7', 'timer'], ['Düzeltildi', bugs.filter((b) => b.status === 'fixed' || b.status === 'closed').length, '#20c997', 'check-circle-2']];
        A.$('#bStats', el).innerHTML = stats.map(([l, n, c, ic]) => `<div class="card stat"><div class="st-ico" style="color:${c};background:${c}22">${A.icon(ic)}</div><div><div class="st-n">${n}</div><div class="st-l">${l}</div></div></div>`).join('');
        A.icons(A.$('#bStats', el));
        const list = bugs.filter((b) => (f.status === 'active' ? ['open', 'progress'].includes(b.status) : !f.status || b.status === f.status) && (!f.sev || b.severity === f.sev) && (!f.q || (b.title + ' ' + (b.description || '')).toLocaleLowerCase('tr').includes(f.q)))
          .sort((a, b) => Object.keys(SEV).indexOf(a.severity) - Object.keys(SEV).indexOf(b.severity) || b.createdAt - a.createdAt);
        const body = A.$('#bBody', el);
        body.innerHTML = list.map((b) => { const s = SEV[b.severity] || SEV.medium, t = STATUS[b.status] || STATUS.open; return `<tr class="click" data-id="${b.id}"><td class="muted">${num(b)}</td><td><b>${A.esc(b.title)}</b>${b.screenshot ? ' ' + A.icon('image') : ''}</td><td><span class="badge" style="background:${s[1]}22;color:${s[1]}">${s[0]}</span></td><td><span class="badge" style="background:${t[1]}22;color:${t[1]}">${A.icon(t[2])} ${t[0]}</span></td><td>${A.esc(b.platform || '')}</td><td>${b.assignee ? A.avatar(b.assignee, 'xs') + ' ' + A.esc(A.user(b.assignee).displayName) : '<span class="muted">—</span>'}</td><td>${A.avatar(b.createdBy, 'xs')}</td><td class="small muted">${A.timeAgo(b.createdAt)}</td></tr>`; }).join('') || `<tr><td colspan="8">${A.emptyState('bug', 'Hata bulunamadı', 'Harika! Ya da filtreleri değiştirin.')}</td></tr>`;
        A.icons(body);
        A.$$('tr[data-id]', body).forEach((r) => (r.onclick = () => edit(bugs.find((b) => b.id === r.dataset.id))));
      };

      const edit = (b) => {
        const isNew = !b.id;
        const ed = isNew || A.canEdit(b);
        let shot = b.screenshot || null;
        const dis = ed ? '' : 'disabled';
        const m = A.modal({
          title: isNew ? 'Hata Bildir' : `Hata #${num(b)}`, icon: 'bug', size: 'wide',
          body: `<div class="field"><label>Başlık</label><input class="input" id="bfT" value="${A.esc(b.title || '')}" placeholder="Kısa ve açıklayıcı bir başlık" ${dis}></div>
            <div class="row" style="align-items:flex-start">
              <div class="field"><label>Önem</label><select class="select" id="bfS" ${dis}>${Object.entries(SEV).map(([k, v]) => `<option value="${k}" ${(b.severity || 'medium') === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
              <div class="field"><label>Durum</label><select class="select" id="bfSt" ${dis}>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${(b.status || 'open') === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
              <div class="field"><label>Platform</label><select class="select" id="bfP" ${dis}>${PLATFORMS.map((p) => `<option ${b.platform === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
            </div>
            <div class="row"><div class="field"><label>Atanan</label><select class="select" id="bfA" ${dis}>${A.userOptions(b.assignee)}</select></div><div class="field"><label>Sürüm / Build</label><input class="input" id="bfV" value="${A.esc(b.version || '')}" placeholder="v0.1.3" ${dis}></div></div>
            <div class="field"><label>Açıklama</label><textarea class="textarea" id="bfD" rows="3" ${dis}>${A.esc(b.description || '')}</textarea></div>
            <div class="field"><label>Tekrar üretme adımları</label><textarea class="textarea" id="bfR" rows="3" placeholder="1. Oyunu başlat\n2. ...\n3. Hata oluşuyor" ${dis}>${A.esc(b.steps || '')}</textarea></div>
            <div class="row" style="align-items:flex-start"><div class="field"><label>Beklenen davranış</label><textarea class="textarea" id="bfE" rows="2" ${dis}>${A.esc(b.expected || '')}</textarea></div><div class="field"><label>Gerçekleşen davranış</label><textarea class="textarea" id="bfAc" rows="2" ${dis}>${A.esc(b.actual || '')}</textarea></div></div>
            <div class="field"><label>Ekran görüntüsü</label><div class="shot" id="bfShot"></div></div>
            ${!isNew ? `<div class="small muted">Bildiren: ${A.esc(A.user(b.createdBy).displayName)} · ${A.fmtDate(b.createdAt)}</div>` : ''}`,
          foot: `${!isNew && A.canDelete(b) ? `<button class="btn danger" data-del>${A.icon('trash-2')}</button>` : ''}<span class="spacer"></span><button class="btn" data-close>Kapat</button>${ed ? `<button class="btn primary" data-save>${isNew ? 'Bildir' : 'Kaydet'}</button>` : ''}`,
        });
        const root = m.el;
        const drawShot = () => {
          const box = A.$('#bfShot', root);
          box.innerHTML = shot ? `<a href="${A.esc(shot)}" target="_blank"><img src="${A.esc(shot)}"></a>${ed ? `<button class="btn xs danger" id="bfRm">${A.icon('x')} Kaldır</button>` : ''}` : ed ? `<button class="btn sm" id="bfUp">${A.icon('upload')} Görsel yükle</button> <span class="small muted">veya Ctrl+V ile yapıştır</span>` : '<span class="muted small">Yok</span>';
          A.icons(box);
          const up = A.$('#bfUp', box); if (up) up.onclick = async () => { const f = await A.pickFile('image/*'); if (f) upload(f); };
          const rm = A.$('#bfRm', box); if (rm) rm.onclick = () => { shot = null; drawShot(); };
        };
        const upload = async (file) => { try { const r = await A.upload(file, { hidden: true, projectId: A.state.projectId }); shot = r.url; drawShot(); } catch (e) { A.err(e); } };
        root.addEventListener('paste', (e) => { const it = [...(e.clipboardData || {}).items || []].find((i) => i.type.startsWith('image/')); if (it && ed) upload(it.getAsFile()); });
        drawShot();
        const sv = A.$('[data-save]', root);
        if (sv) sv.onclick = async () => {
          const body = { title: A.$('#bfT', root).value.trim(), severity: A.$('#bfS', root).value, status: A.$('#bfSt', root).value, platform: A.$('#bfP', root).value, assignee: A.$('#bfA', root).value, version: A.$('#bfV', root).value, description: A.$('#bfD', root).value, steps: A.$('#bfR', root).value, expected: A.$('#bfE', root).value, actual: A.$('#bfAc', root).value, screenshot: shot, projectId: A.state.projectId };
          if (!body.title) return A.toast('Başlık gerekli', 'err');
          try {
            if (isNew) await A.col.create('bugs', body); else await A.col.update('bugs', b.id, body);
            if (!isNew && body.status === 'fixed' && b.status !== 'fixed') { A.confetti(40); A.sound('done'); }
            m.close(); A.toast(isNew ? 'Hata kaydedildi 🐛' : 'Güncellendi', 'ok');
          } catch (e) { A.err(e); }
        };
        const dl = A.$('[data-del]', root);
        if (dl) dl.onclick = async () => { if (await A.confirm('Hata kaydı silinsin mi?')) { await A.col.remove('bugs', b.id).catch(A.err); m.close(); } };
      };

      draw();
      if (openId) { const b = bugs.find((x) => x.id === openId); if (b) edit(b); }
      A.viewOn('db:bugs', (p) => {
        if (p.item.projectId && p.item.projectId !== A.state.projectId) return;
        if (p.action === 'delete') bugs = bugs.filter((b) => b.id !== p.item.id);
        else { const i = bugs.findIndex((b) => b.id === p.item.id); if (i >= 0) bugs[i] = p.item; else bugs.push(p.item); }
        draw();
      });
      A.viewOn('bugs:new', () => edit({}));
    },
  });
})();
