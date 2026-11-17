/* Oyun Tasarım Dokümanı (GDD) + ortak doküman editörü */
(function () {
  const STATUS = { draft: ['Taslak', 'yellow'], review: ['İncelemede', 'blue'], approved: ['Onaylandı', 'green'] };
  const SEC_ICONS = ['sparkles', 'book-open', 'gamepad-2', 'cog', 'users', 'map', 'layout', 'palette', 'music', 'cpu', 'coins', 'rocket', 'scroll-text', 'swords', 'trophy', 'target', 'brain', 'globe', 'castle', 'skull', 'gem', 'flag', 'lightbulb', 'file-text'];

  // opts: { col, title, subtitle, categories?, categoryLabel?, newDefaults, icon, allowOrder }
  A.docEditor = async function (el, openId, opts) {
    if (A.needProject(el)) return;
    let docs = await A.col.project(opts.col);
    let cur = null;
    let mode = A.ls.get(opts.col + 'Mode', 'view');
    let q = '';
    el.innerHTML = `<div class="notes doc-ed">
      <aside class="notes-side">
        <div class="row" style="padding:14px 14px 4px"><h3 style="margin:0">${A.esc(opts.title)}</h3><span class="spacer"></span>${A.can('create') ? `<button class="btn primary sm" id="dNew">${A.icon('plus')}</button>` : ''}</div>
        <p class="small muted" style="padding:0 14px;margin:0 0 10px">${A.esc(opts.subtitle)}</p>
        <div style="padding:0 14px 8px"><div class="input-icon">${A.icon('search')}<input class="input sm" id="dQ" placeholder="Ara..."></div></div>
        <div class="doc-progress" id="dProg"></div>
        <div class="note-list" id="dList"></div>
        <div style="padding:10px 14px;border-top:1px solid var(--line)" class="row"><button class="btn sm grow" id="dAll">${A.icon('book-open')} Tüm doküman</button><button class="btn sm icon" id="dExp" title="Dışa aktar">${A.icon('download')}</button></div>
      </aside>
      <section class="notes-main" id="dMain"></section></div>`;
    A.icons(el);
    const nb = A.$('#dNew', el);
    if (nb) nb.onclick = async () => {
      const fields = [{ key: 'title', label: 'Başlık', required: true }];
      if (opts.categories) fields.push({ key: 'category', label: opts.categoryLabel || 'Kategori', type: 'select', options: opts.categories });
      fields.push({ key: 'icon', label: 'Simge', type: 'select', options: SEC_ICONS, value: opts.icon || 'file-text' });
      const r = await A.form({ title: 'Yeni ' + (opts.itemLabel || 'bölüm'), icon: 'plus', fields });
      if (!r) return;
      try {
        const d = await A.col.create(opts.col, { ...r, projectId: A.state.projectId, content: `# ${r.title}\n\n`, order: docs.length, status: 'draft' });
        if (!docs.find((x) => x.id === d.id)) docs.push(d);
        mode = 'split'; select(d.id);
      } catch (e) { A.err(e); }
    };
    A.$('#dQ', el).oninput = (e) => { q = e.target.value.toLocaleLowerCase('tr'); drawList(); };
    A.$('#dAll', el).onclick = () => { cur = null; drawList(); showAll(); };
    A.$('#dExp', el).onclick = (e) => A.menu(e.currentTarget, [
      { icon: 'file-text', label: 'Markdown (.md) indir', action: () => A.download(`${A.project().name} - ${opts.title}.md`, fullMd(), 'text/markdown') },
      { icon: 'printer', label: 'Yazdır / PDF olarak kaydet', action: () => A.printHtml(`${A.project().name} — ${opts.title}`, A.md(fullMd())) },
      { icon: 'download', label: 'JSON olarak indir', action: () => A.download(`${opts.col}.json`, JSON.stringify(docs, null, 2)) },
    ]);

    const sorted = () => [...docs].sort((a, b) => (a.order || 0) - (b.order || 0) || a.createdAt - b.createdAt);
    const fullMd = () => `# ${A.project().name} — ${opts.title}\n\n` + sorted().map((d) => d.content || '').join('\n\n---\n\n');

    const drawList = () => {
      const list = sorted().filter((d) => !q || ((d.title || '') + ' ' + (d.content || '')).toLocaleLowerCase('tr').includes(q));
      const box = A.$('#dList', el);
      let html = '';
      if (opts.categories) {
        const cats = [...new Set(list.map((d) => d.category || 'Diğer'))];
        cats.forEach((c) => { html += `<div class="room-sec" style="padding:10px 14px 4px">${A.esc(c)}</div>` + list.filter((d) => (d.category || 'Diğer') === c).map(item).join(''); });
      } else html = list.map(item).join('');
      box.innerHTML = html || '<p class="muted small" style="padding:14px">Henüz içerik yok.</p>';
      A.icons(box);
      A.$$('.doc-item', box).forEach((d) => (d.onclick = (e) => {
        const mv = e.target.closest('[data-mv]');
        if (mv) { e.stopPropagation(); return move(d.dataset.id, Number(mv.dataset.mv)); }
        select(d.dataset.id);
      }));
      const approved = docs.filter((d) => d.status === 'approved').length;
      const words = docs.reduce((s, d) => s + ((d.content || '').trim().split(/\s+/).filter(Boolean).length), 0);
      A.$('#dProg', el).innerHTML = docs.length ? `<div class="small muted row" style="justify-content:space-between"><span>${approved}/${docs.length} onaylı</span><span>${words} kelime</span></div><div class="progress" style="height:6px"><i style="width:${(approved / docs.length) * 100}%"></i></div>` : '';
    };
    const item = (d) => `<div class="doc-item note-item ${cur && cur.id === d.id ? 'on' : ''}" data-id="${d.id}">
      <div class="row" style="gap:8px">${A.icon(d.icon || 'file-text')}<b class="grow ell">${A.esc(d.title)}</b>
      ${opts.allowOrder && A.canEdit(d) && !q ? `<span class="mv"><button class="btn xs ghost" data-mv="-1">${A.icon('chevron-up')}</button><button class="btn xs ghost" data-mv="1">${A.icon('chevron-down')}</button></span>` : ''}
      <span class="sdot ${STATUS[d.status || 'draft'][1]}" title="${STATUS[d.status || 'draft'][0]}"></span></div></div>`;
    const move = async (id, dir) => {
      const s = sorted();
      const i = s.findIndex((d) => d.id === id), j = i + dir;
      if (j < 0 || j >= s.length) return;
      [s[i], s[j]] = [s[j], s[i]];
      s.forEach((d, k) => (d.order = k));
      drawList();
      await Promise.all([A.col.update(opts.col, s[i].id, { order: i }), A.col.update(opts.col, s[j].id, { order: j })]).catch(A.err);
    };

    const showAll = () => {
      const main = A.$('#dMain', el);
      main.innerHTML = `<div class="doc-full"><div class="doc-cover"><div class="small muted">${A.esc(opts.title)}</div><h1>${A.esc(A.project().name)}</h1><p class="muted">${A.esc(A.project().description || '')}</p></div>
        <div class="doc-toc"><b>İçindekiler</b><ol>${sorted().map((d) => `<li><a href="javascript:void 0" data-j="${d.id}">${A.esc(d.title)}</a></li>`).join('')}</ol></div>
        ${sorted().map((d) => `<section class="md doc-sec" id="sec-${d.id}">${A.md(d.content || '')}</section>`).join('<hr>')}</div>`;
      A.$$('[data-j]', main).forEach((a) => (a.onclick = () => A.$('#sec-' + a.dataset.j, main).scrollIntoView({ behavior: 'smooth' })));
    };

    let pending = {}, pendingId = null;
    const save = A.debounce(async () => {
      if (!pendingId) return;
      const id = pendingId, patch = pending;
      pending = {}; pendingId = null;
      const s = A.$('#deSaved', el);
      try { if (s) s.textContent = 'Kaydediliyor...'; await A.col.update(opts.col, id, patch); if (s && s.isConnected) { s.innerHTML = A.icon('check') + ' Kaydedildi'; A.icons(s); } } catch (e) { A.err(e); }
    }, 700);
    const queue = (patch) => { if (pendingId && pendingId !== cur.id) save.flush(); Object.assign(cur, patch); pendingId = cur.id; pending = { ...pending, ...patch }; save(); };

    const select = (id) => {
      if (pendingId) save.flush();
      cur = docs.find((d) => d.id === id) || null;
      drawList();
      const main = A.$('#dMain', el);
      if (!cur) return showAll();
      const editable = A.canEdit(cur);
      const m = editable ? mode : 'view';
      main.innerHTML = `
        <div class="ne-head">
          <div class="row" style="gap:10px">${A.icon(cur.icon || 'file-text')}<input class="ne-title" id="deTitle" value="${A.esc(cur.title)}" ${editable ? '' : 'readonly'}></div>
          <div class="row wrap" style="gap:8px">
            <span class="small muted" id="deSaved">${A.avatar(cur.updatedBy || cur.createdBy, 'xs')} ${A.esc(A.user(cur.updatedBy || cur.createdBy).displayName)} · ${A.timeAgo(cur.updatedAt)}</span>
            <span class="spacer"></span>
            ${opts.categories ? `<select class="select sm" id="deCat" style="width:150px" ${editable ? '' : 'disabled'}>${opts.categories.map((c) => `<option ${cur.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>` : ''}
            <select class="select sm" id="deStatus" style="width:140px" ${editable ? '' : 'disabled'}>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${(cur.status || 'draft') === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
            ${editable ? `<div class="seg">${[['edit', 'pencil'], ['split', 'columns-2'], ['view', 'eye']].map(([k, ic]) => `<button data-m="${k}" class="${m === k ? 'on' : ''}">${A.icon(ic)}</button>`).join('')}</div>` : ''}
            ${A.canDelete(cur) ? `<button class="btn sm danger icon" id="deDel" title="Sil">${A.icon('trash-2')}</button>` : ''}
          </div>
        </div>
        ${editable ? `<div class="md-toolbar">${[['bold', '**', '**'], ['italic', '*', '*'], ['heading', '## ', ''], ['list', '- ', ''], ['square-check-big', '- [ ] ', ''], ['quote', '> ', ''], ['code', '`', '`'], ['table', '\n| Özellik | Değer |\n|---|---|\n| | |\n', ''], ['minus', '\n---\n', '']].map(([ic, a, b]) => `<button class="btn ghost xs" data-a="${A.esc(a)}" data-b="${A.esc(b)}">${A.icon(ic)}</button>`).join('')}<button class="btn ghost xs" id="deImg" title="Görsel">${A.icon('image')}</button><span class="spacer"></span><span class="small muted" id="deCount"></span></div>` : ''}
        <div class="ne-body mode-${m}">
          <textarea class="ne-text" id="deText" ${editable ? '' : 'readonly'}>${A.esc(cur.content || '')}</textarea>
          <div class="ne-prev md" id="dePrev"></div>
        </div>`;
      A.icons(main);
      const ta = A.$('#deText', main), prev = A.$('#dePrev', main);
      const render = () => {
        prev.innerHTML = A.md(ta.value);
        const c = A.$('#deCount', main); if (c) c.textContent = (ta.value.trim().split(/\s+/).filter(Boolean).length) + ' kelime';
        A.$$('input[data-task]', prev).forEach((cb) => { cb.disabled = !editable; cb.onchange = () => { ta.value = A.toggleMdTask(ta.value, +cb.dataset.task); queue({ content: ta.value }); render(); }; });
      };
      render();
      if (!editable) return;
      ta.oninput = () => { queue({ content: ta.value }); render(); };
      ta.onkeydown = (e) => { if (e.key === 'Tab') { e.preventDefault(); ta.setRangeText('  ', ta.selectionStart, ta.selectionEnd, 'end'); } };
      const ins = (a, b) => { const s = ta.selectionStart, en = ta.selectionEnd; ta.setRangeText(a + ta.value.slice(s, en) + b, s, en, 'end'); ta.focus(); ta.oninput(); };
      A.$$('[data-a]', main).forEach((b) => (b.onclick = () => ins(b.dataset.a, b.dataset.b)));
      A.$('#deImg', main).onclick = async () => { const f = await A.pickFile('image/*'); if (!f) return; try { const up = await A.upload(f, { hidden: true }); ins(`![${f.name}](${up.url})`, ''); } catch (e) { A.err(e); } };
      A.$('#deTitle', main).oninput = (e) => { queue({ title: e.target.value }); drawList(); };
      A.$('#deStatus', main).onchange = (e) => { queue({ status: e.target.value }); drawList(); if (e.target.value === 'approved') { A.toast('Bölüm onaylandı ✅', 'ok'); A.sound('done'); } };
      const cat = A.$('#deCat', main); if (cat) cat.onchange = (e) => { queue({ category: e.target.value }); drawList(); };
      A.$$('.seg button', main).forEach((b) => (b.onclick = () => { mode = b.dataset.m; A.ls.set(opts.col + 'Mode', mode); A.$('.ne-body', main).className = 'ne-body mode-' + mode; A.$$('.seg button', main).forEach((x) => x.classList.toggle('on', x === b)); }));
      const del = A.$('#deDel', main);
      if (del) del.onclick = async () => { if (await A.confirm(`“${cur.title}” silinsin mi?`)) A.col.remove(opts.col, cur.id).catch(A.err); };
    };

    drawList();
    if (openId && docs.find((d) => d.id === openId)) select(openId);
    else if (sorted()[0]) select(sorted()[0].id);
    else showAll();

    A.viewOn('db:' + opts.col, (p) => {
      if (p.item.projectId && p.item.projectId !== A.state.projectId) return;
      if (p.action === 'delete') { docs = docs.filter((d) => d.id !== p.item.id); if (cur && cur.id === p.item.id) { cur = null; showAll(); } }
      else {
        const i = docs.findIndex((d) => d.id === p.item.id);
        if (i >= 0) {
          if (p.by !== A.state.user.id) {
            docs[i] = p.item;
            if (cur && cur.id === p.item.id) {
              const ta = A.$('#deText', el);
              if (!ta || document.activeElement !== ta) { select(cur.id); A.toast(`${A.user(p.by).displayName} bu bölümü güncelledi`, 'info'); }
            }
          }
        } else docs.push(p.item);
      }
      drawList();
    });
    return () => { if (pendingId) save.flush(); };
  };

  A.register('gdd', {
    title: 'Tasarım Dokümanı', icon: 'book-open', group: 'tasarim', full: true,
    async render(el, [id]) {
      const cleanup = await A.docEditor(el, id, { col: 'gdd', title: 'Tasarım Dokümanı (GDD)', subtitle: 'Oyunun tüm tasarım kararları tek yerde.', icon: 'file-text', itemLabel: 'GDD bölümü', allowOrder: true });
      this.destroy = cleanup;
    },
  });
})();
