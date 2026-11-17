/* Varlık Takibi — oyunun ihtiyaç duyduğu tüm sanat / ses varlıklarının üretim hattı */
(function () {
  const TYPES = { sprite: ['Sprite', 'image'], anim: ['Animasyon', 'film'], model: ['3D Model', 'box'], texture: ['Doku', 'layers'], ui: ['Arayüz (UI)', 'layout'], vfx: ['Efekt (VFX)', 'sparkles'], sfx: ['Ses efekti', 'volume-2'], music: ['Müzik', 'music'], voice: ['Seslendirme', 'mic'], font: ['Yazı tipi', 'type'], other: ['Diğer', 'package'] };
  const STAGES = [['todo', 'Yapılacak', '#868e96'], ['concept', 'Konsept', '#b197fc'], ['wip', 'Üretimde', '#4dabf7'], ['review', 'İncelemede', '#ffa94d'], ['done', 'Oyunda ✓', '#20c997']];
  const stage = (k) => STAGES.find((s) => s[0] === k) || STAGES[0];

  A.register('assets', {
    title: 'Varlık Takibi', icon: 'boxes', group: 'uretim',
    async render(el, [openId]) {
      if (A.needProject(el)) return;
      let items = await A.col.project('assets');
      const f = A.ls.get('assetFilter', { type: '', stage: '', q: '', mine: false });
      el.innerHTML = `<div class="page-head"><div><h1>Varlık Takibi</h1><p>Oyunun ihtiyaç duyduğu her sprite, model, ses ve müzik — konseptten oyuna kadar.</p></div>
        <div class="actions">
          <div class="input-icon" style="width:200px">${A.icon('search')}<input class="input sm" id="asQ" placeholder="Varlık ara..." value="${A.esc(f.q)}"></div>
          <select class="select sm" id="asT" style="width:150px"><option value="">Tüm türler</option>${Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select>
          <label class="row small" style="gap:6px;cursor:pointer"><input type="checkbox" id="asMine" ${f.mine ? 'checked' : ''}> Bana atananlar</label>
          ${A.can('create') ? `<button class="btn sm" id="asBulk">${A.icon('list-checks')} Toplu ekle</button><button class="btn primary" id="asNew">${A.icon('plus')} Varlık</button>` : ''}
        </div></div>
        <div class="as-pipe" id="asPipe"></div>
        <div class="card" style="padding:0;overflow:auto;margin-top:14px"><table class="table"><thead><tr><th>Varlık</th><th>Tür</th><th>Aşama</th><th>Sorumlu</th><th>Teslim</th><th>Dosya</th></tr></thead><tbody id="asBody"></tbody></table></div>`;
      A.icons(el);
      A.$('#asT', el).value = f.type;
      const save = () => A.ls.set('assetFilter', f);
      A.$('#asQ', el).oninput = (e) => { f.q = e.target.value; save(); draw(); };
      A.$('#asT', el).onchange = (e) => { f.type = e.target.value; save(); draw(); };
      A.$('#asMine', el).onchange = (e) => { f.mine = e.target.checked; save(); draw(); };
      const nb = A.$('#asNew', el); if (nb) nb.onclick = () => edit({ type: f.type || 'sprite', stage: 'todo' });
      const bk = A.$('#asBulk', el);
      if (bk) bk.onclick = async () => {
        const r = await A.form({ title: 'Toplu varlık ekle', icon: 'list-checks', fields: [
          { key: 'type', label: 'Tür', type: 'select', options: Object.entries(TYPES).map(([k, v]) => [k, v[0]]), value: f.type || 'sprite' },
          { key: 'names', label: 'Her satıra bir varlık', type: 'textarea', rows: 8, placeholder: 'Kahraman - koşma animasyonu\nKahraman - zıplama animasyonu\nOrman arka planı\n...' },
        ] });
        if (!r) return;
        const names = r.names.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 100);
        for (const name of names) await A.col.create('assets', { projectId: A.state.projectId, name, type: r.type, stage: 'todo' }).catch(A.err);
        if (names.length) A.toast(`${names.length} varlık eklendi`, 'ok');
      };

      const draw = () => {
        const pipe = A.$('#asPipe', el);
        const scope = items.filter((i) => !f.type || i.type === f.type);
        const total = scope.length || 1;
        const done = scope.filter((i) => i.stage === 'done').length;
        pipe.innerHTML = `<div class="card as-sum"><div><div class="st-n">%${Math.round((done / total) * 100)}</div><div class="st-l">${done}/${scope.length} varlık oyunda</div></div>
          <div class="as-bar">${STAGES.map(([k, l, c]) => { const n = scope.filter((i) => (i.stage || 'todo') === k).length; return n ? `<i style="flex:${n};background:${c}" title="${l}: ${n}"></i>` : ''; }).join('') || '<i style="flex:1;background:var(--panel-3)"></i>'}</div>
          <div class="as-stages">${STAGES.map(([k, l, c]) => `<button class="${f.stage === k ? 'on' : ''}" data-st="${k}" style="--c:${c}"><b>${scope.filter((i) => (i.stage || 'todo') === k).length}</b>${l}</button>`).join('')}</div></div>`;
        A.$$('[data-st]', pipe).forEach((b) => (b.onclick = () => { f.stage = f.stage === b.dataset.st ? '' : b.dataset.st; save(); draw(); }));
        const q = f.q.toLocaleLowerCase('tr');
        const list = scope.filter((i) => (!f.stage || (i.stage || 'todo') === f.stage) && (!f.mine || i.assignee === A.state.user.id) && (!q || (i.name + ' ' + (i.notes || '')).toLocaleLowerCase('tr').includes(q)))
          .sort((a, b) => STAGES.findIndex((s) => s[0] === (a.stage || 'todo')) - STAGES.findIndex((s) => s[0] === (b.stage || 'todo')) || a.name.localeCompare(b.name, 'tr'));
        const body = A.$('#asBody', el);
        body.innerHTML = list.map((i) => { const t = TYPES[i.type] || TYPES.other, s = stage(i.stage), d = A.daysUntil(i.due); const ed = A.canEdit(i); return `<tr class="click" data-id="${i.id}">
            <td><div class="row" style="gap:10px">${i.preview ? `<img class="as-thumb" src="${A.esc(i.preview)}">` : `<span class="as-ic">${A.icon(t[1])}</span>`}<b>${A.esc(i.name)}</b></div></td>
            <td class="small">${t[0]}</td>
            <td>${ed ? `<select class="select sm as-stage" data-stage="${i.id}" style="--c:${s[2]}">${STAGES.map(([k, l]) => `<option value="${k}" ${(i.stage || 'todo') === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : `<span class="badge" style="background:${s[2]}22;color:${s[2]}">${s[1]}</span>`}</td>
            <td>${i.assignee ? `<span class="row" style="gap:6px">${A.avatar(i.assignee, 'xs')}<span class="small">${A.esc(A.user(i.assignee).displayName)}</span></span>` : '<span class="muted small">—</span>'}</td>
            <td class="small">${i.due ? `<span class="badge ${i.stage !== 'done' && d < 0 ? 'red' : i.stage !== 'done' && d <= 3 ? 'yellow' : ''}">${A.fmtDate(i.due, { day: 'numeric', month: 'short' })}</span>` : ''}</td>
            <td>${i.fileUrl ? `<a class="btn xs ghost" href="${A.esc(i.fileUrl)}" target="_blank" onclick="event.stopPropagation()">${A.icon('paperclip')}</a>` : ''}</td></tr>`; }).join('') || `<tr><td colspan="6">${A.emptyState('boxes', items.length ? 'Filtreyle eşleşen varlık yok' : 'Henüz varlık yok', 'Oyunun ihtiyaç duyduğu sprite, ses ve müzikleri listeleyin; “Toplu ekle” ile hızlıca başlayın.')}</td></tr>`;
        A.icons(body);
        A.$$('tr[data-id]', body).forEach((r) => (r.onclick = (e) => { if (e.target.closest('select,a')) return; edit(items.find((i) => i.id === r.dataset.id)); }));
        A.$$('[data-stage]', body).forEach((sel) => (sel.onchange = async () => {
          const it = items.find((i) => i.id === sel.dataset.stage);
          it.stage = sel.value; draw();
          try { await A.col.update('assets', it.id, { stage: sel.value }); if (sel.value === 'done') { A.sound('done'); A.toast(`“${it.name}” oyuna eklendi ✓`, 'ok'); } } catch (er) { A.err(er); }
        }));
      };

      const edit = (i) => {
        const isNew = !i.id;
        let fileUrl = i.fileUrl || null, preview = i.preview || null, fileName = i.fileName || '';
        const m = A.modal({
          title: isNew ? 'Yeni varlık' : i.name, icon: 'boxes', size: 'wide',
          body: `<div class="field"><label>Ad</label><input class="input" id="aN" value="${A.esc(i.name || '')}" placeholder="Örn: Kahraman - koşma animasyonu (8 kare)"></div>
            <div class="row" style="align-items:flex-start"><div class="field"><label>Tür</label><select class="select" id="aT">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${i.type === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
            <div class="field"><label>Aşama</label><select class="select" id="aS">${STAGES.map(([k, l]) => `<option value="${k}" ${(i.stage || 'todo') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
            <div class="row" style="align-items:flex-start"><div class="field"><label>Sorumlu</label><select class="select" id="aA">${A.userOptions(i.assignee)}</select></div><div class="field"><label>Teslim tarihi</label><input type="date" class="input" id="aD" value="${A.esc(i.due || '')}"></div></div>
            <div class="field"><label>Teknik notlar (boyut, format, kare sayısı, referans...)</label><textarea class="textarea" id="aNo" rows="3" placeholder="Örn: 64×64 px, 8 kare, 12 fps, PNG sprite sheet">${A.esc(i.notes || '')}</textarea></div>
            <div class="field"><label>Dosya</label><div id="aF"></div></div>`,
          foot: `${!isNew && A.canDelete(i) ? `<button class="btn danger" data-del>${A.icon('trash-2')}</button>` : ''}<span class="spacer"></span><button class="btn" data-close>Vazgeç</button><button class="btn primary" data-save>Kaydet</button>`,
        });
        const root = m.el;
        const drawF = () => {
          const b = A.$('#aF', root);
          b.innerHTML = fileUrl ? `<div class="row" style="gap:10px">${preview ? `<img src="${A.esc(preview)}" style="max-height:90px;border-radius:8px">` : A.icon('file')}<a href="${A.esc(fileUrl)}" target="_blank">${A.esc(fileName || 'dosya')}</a><button class="btn xs danger" id="aFr">${A.icon('x')}</button></div>` : `<button class="btn sm" id="aFu">${A.icon('upload')} Dosya yükle</button> <span class="small muted">Yüklenen dosya Dosyalar bölümünde “Varlıklar” klasörüne de eklenir.</span>`;
          A.icons(b);
          const u = A.$('#aFu', b); if (u) u.onclick = async () => { const file = await A.pickFile('*/*'); if (!file) return; try { const up = await A.upload(file, { folder: 'Varlıklar', projectId: A.state.projectId }); fileUrl = up.url; fileName = up.name; preview = (up.type || '').startsWith('image/') ? up.url : null; drawF(); } catch (e) { A.err(e); } };
          const rr = A.$('#aFr', b); if (rr) rr.onclick = () => { fileUrl = preview = null; fileName = ''; drawF(); };
        };
        drawF();
        A.$('[data-save]', root).onclick = async () => {
          const body = { name: A.$('#aN', root).value.trim(), type: A.$('#aT', root).value, stage: A.$('#aS', root).value, assignee: A.$('#aA', root).value, due: A.$('#aD', root).value, notes: A.$('#aNo', root).value, fileUrl, fileName, preview, projectId: A.state.projectId };
          if (!body.name) return A.toast('Ad gerekli', 'err');
          try { if (isNew) await A.col.create('assets', body); else await A.col.update('assets', i.id, body); m.close(); } catch (e) { A.err(e); }
        };
        const dl = A.$('[data-del]', root);
        if (dl) dl.onclick = async () => { if (await A.confirm(`“${i.name}” silinsin mi?`)) { await A.col.remove('assets', i.id).catch(A.err); m.close(); } };
      };

      draw();
      if (openId) { const it = items.find((x) => x.id === openId); if (it) edit(it); }
      A.viewOn('db:assets', (p) => {
        if (p.item.projectId && p.item.projectId !== A.state.projectId) return;
        if (p.action === 'delete') items = items.filter((i) => i.id !== p.item.id);
        else { const k = items.findIndex((i) => i.id === p.item.id); if (k >= 0) items[k] = p.item; else items.push(p.item); }
        if (!document.activeElement || !document.activeElement.classList.contains('as-stage')) draw();
      });
    },
  });
})();
