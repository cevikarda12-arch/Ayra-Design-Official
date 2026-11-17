/* Not Defteri */
(function () {
  const COLORS = ['', '#9b87f5', '#20c997', '#f06595', '#4dabf7', '#ffa94d', '#ffd43b'];
  A.register('notes', {
    title: 'Not Defteri', icon: 'notebook-pen', group: 'kaynak', full: true, scoped: false,
    async render(el, [openId]) {
      let notes = [];
      let cur = null;
      let mode = A.ls.get('noteMode', 'split');
      let filter = { q: '', folder: '' };
      el.innerHTML = `<div class="notes">
        <aside class="notes-side">
          <div class="row" style="padding:14px 14px 8px"><h3 style="margin:0">Notlar</h3><span class="spacer"></span><button class="btn primary sm" id="nNew">${A.icon('plus')} Yeni</button></div>
          <div style="padding:0 14px 8px"><div class="input-icon">${A.icon('search')}<input class="input sm" id="nQ" placeholder="Notlarda ara..."></div></div>
          <div class="note-folders" id="nFolders"></div>
          <div class="note-list" id="nList"></div>
        </aside>
        <section class="notes-main" id="nMain"></section></div>`;
      A.icons(el);
      A.$('#nNew', el).onclick = () => create();
      A.$('#nQ', el).oninput = (e) => { filter.q = e.target.value; drawList(); };

      const create = async () => {
        try {
          const n = await A.col.create('notes', { title: 'Adsız not', content: '', private: true, folder: filter.folder || 'Kişisel', tags: [], pinned: false });
          if (!notes.find((x) => x.id === n.id)) notes.push(n);
          select(n.id);
          setTimeout(() => { const t = A.$('#neTitle', el); if (t) { t.focus(); t.select(); } }, 50);
        } catch (e) { A.err(e); }
      };

      const drawFolders = () => {
        const folders = [...new Set(notes.map((n) => n.folder || 'Genel'))].sort();
        const box = A.$('#nFolders', el);
        box.innerHTML = `<button class="${!filter.folder ? 'on' : ''}" data-f="">${A.icon('layers')} Tümü <span>${notes.length}</span></button>` + folders.map((f) => `<button class="${filter.folder === f ? 'on' : ''}" data-f="${A.esc(f)}">${A.icon('folder')} ${A.esc(f)} <span>${notes.filter((n) => (n.folder || 'Genel') === f).length}</span></button>`).join('');
        A.icons(box);
        A.$$('button', box).forEach((b) => (b.onclick = () => { filter.folder = b.dataset.f; drawFolders(); drawList(); }));
      };

      const drawList = () => {
        const q = filter.q.toLocaleLowerCase('tr');
        const list = notes.filter((n) => (!filter.folder || (n.folder || 'Genel') === filter.folder) && (!q || (n.title + ' ' + n.content).toLocaleLowerCase('tr').includes(q)))
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
        const box = A.$('#nList', el);
        box.innerHTML = list.map((n) => `<div class="note-item ${cur && cur.id === n.id ? 'on' : ''}" data-id="${n.id}" style="${n.color ? `--nc:${n.color}` : ''}">
          <div class="row" style="gap:6px">${n.pinned ? A.icon('pin') : ''}<b class="grow ell">${A.esc(n.title || 'Adsız not')}</b>${n.private ? A.icon('lock') : A.icon('users')}</div>
          <div class="ni-prev">${A.esc((n.content || '').replace(/[#>*`\-\[\]]/g, '').slice(0, 90)) || '<i>Boş not</i>'}</div>
          <div class="small muted row" style="gap:6px">${n.createdBy !== A.state.user.id ? A.avatar(n.createdBy, 'xs') : ''}${A.timeAgo(n.updatedAt)}</div></div>`).join('') || '<p class="muted small" style="padding:14px">Not bulunamadı.</p>';
        A.icons(box);
        A.$$('.note-item', box).forEach((d) => (d.onclick = () => select(d.dataset.id)));
      };

      let pending = {}, pendingId = null;
      const saveNow = A.debounce(async () => {
        if (!pendingId || !Object.keys(pending).length) return;
        const id = pendingId, patch = pending;
        pending = {}; pendingId = null;
        const st = A.$('#neSaved', el);
        try {
          if (st) st.textContent = 'Kaydediliyor...';
          await A.col.update('notes', id, patch);
          if (st && st.isConnected) { st.innerHTML = `${A.icon('check')} Kaydedildi`; A.icons(st); }
        } catch (e) { A.err(e); }
      }, 600);
      const queue = (patch) => {
        if (pendingId && pendingId !== cur.id) saveNow.flush();
        Object.assign(cur, patch, { updatedAt: Date.now() });
        pendingId = cur.id; pending = { ...pending, ...patch };
        saveNow();
        drawList();
      };

      const select = (id) => {
        if (pendingId) saveNow.flush();
        cur = notes.find((n) => n.id === id) || null;
        drawList();
        const main = A.$('#nMain', el);
        if (!cur) { main.innerHTML = A.emptyState('notebook-pen', 'Bir not seçin', 'veya yeni bir not oluşturun.'); A.icons(main); return; }
        const own = cur.createdBy === A.state.user.id;
        const editable = own || (!cur.private && A.can('edit_all'));
        main.innerHTML = `
          <div class="ne-head">
            <input class="ne-title" id="neTitle" value="${A.esc(cur.title)}" placeholder="Başlık" ${editable ? '' : 'readonly'}>
            <div class="row wrap" style="gap:8px">
              <span class="small muted" id="neSaved">${A.icon('check')} Kaydedildi</span>
              <span class="spacer"></span>
              <div class="seg">${[['edit', 'pencil', 'Düzenle'], ['split', 'columns-2', 'Bölünmüş'], ['view', 'eye', 'Önizle']].map(([k, ic, t]) => `<button data-m="${k}" class="${mode === k ? 'on' : ''}" title="${t}">${A.icon(ic)}</button>`).join('')}</div>
              <button class="btn sm" id="neMore">${A.icon('more-horizontal')}</button>
            </div>
          </div>
          <div class="ne-meta row wrap">
            <span class="row" style="gap:6px">${A.icon('folder')}<input class="input sm" id="neFolder" value="${A.esc(cur.folder || 'Genel')}" style="width:140px" ${own ? '' : 'readonly'}></span>
            <span class="row" style="gap:6px">${A.icon('tag')}<input class="input sm" id="neTags" value="${A.esc((cur.tags || []).join(', '))}" placeholder="etiketler" style="width:200px" ${editable ? '' : 'readonly'}></span>
            ${own ? `<label class="row small" style="gap:8px;cursor:pointer"><label class="switch"><input type="checkbox" id="nePriv" ${cur.private ? 'checked' : ''}><span></span></label> ${cur.private ? 'Özel (yalnızca ben)' : 'Takımla paylaşılıyor'}</label>` : `<span class="badge">${A.avatar(cur.createdBy, 'xs')} ${A.esc(A.user(cur.createdBy).displayName)} tarafından paylaşıldı</span>`}
            <div class="color-dots">${COLORS.map((c) => `<button data-c="${c}" class="${(cur.color || '') === c ? 'on' : ''}" style="background:${c || 'var(--panel-3)'}"></button>`).join('')}</div>
          </div>
          ${editable ? `<div class="md-toolbar">${[['bold', '**', '**'], ['italic', '*', '*'], ['heading', '## ', ''], ['list', '- ', ''], ['list-ordered', '1. ', ''], ['square-check-big', '- [ ] ', ''], ['quote', '> ', ''], ['code', '`', '`'], ['link', '[', '](https://)'], ['table', '\n| Başlık | Başlık |\n|---|---|\n| | |\n', ''], ['minus', '\n---\n', '']].map(([ic, a, b]) => `<button class="btn ghost xs" data-a="${A.esc(a)}" data-b="${A.esc(b)}" title="${ic}">${A.icon(ic)}</button>`).join('')}<button class="btn ghost xs" id="neImg" title="Görsel ekle">${A.icon('image')}</button><span class="spacer"></span><span class="small muted" id="neCount"></span></div>` : ''}
          <div class="ne-body mode-${mode}">
            <textarea id="neText" class="ne-text" placeholder="Yazmaya başla... (Markdown desteklenir)" ${editable ? '' : 'readonly'}>${A.esc(cur.content || '')}</textarea>
            <div class="ne-prev md" id="nePrev"></div>
          </div>`;
        A.icons(main);
        const ta = A.$('#neText', main), prev = A.$('#nePrev', main);
        const render = () => {
          prev.innerHTML = A.md(ta.value) || '<p class="muted">Önizleme burada görünecek.</p>';
          const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
          const cnt = A.$('#neCount', main); if (cnt) cnt.textContent = `${words} kelime · ${ta.value.length} karakter`;
          A.$$('input[data-task]', prev).forEach((c) => { c.disabled = !editable; c.onchange = () => { ta.value = A.toggleMdTask(ta.value, Number(c.dataset.task)); queue({ content: ta.value }); render(); }; });
        };
        render();
        ta.oninput = () => { queue({ content: ta.value }); render(); };
        ta.onkeydown = (e) => {
          if (e.key === 'Tab') { e.preventDefault(); ins('  ', ''); }
          if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); ins('**', '**'); }
          if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); ins('*', '*'); }
        };
        const ins = (a, b) => {
          const s = ta.selectionStart, en = ta.selectionEnd;
          const sel = ta.value.slice(s, en);
          ta.setRangeText(a + sel + b, s, en, 'end');
          if (!sel) ta.selectionStart = ta.selectionEnd = s + a.length;
          ta.focus(); ta.oninput();
        };
        A.$$('.md-toolbar [data-a]', main).forEach((b) => (b.onclick = () => ins(b.dataset.a, b.dataset.b)));
        const imgB = A.$('#neImg', main);
        if (imgB) imgB.onclick = async () => {
          const file = await A.pickFile('image/*');
          if (!file) return;
          try { const up = await A.upload(file, { hidden: true }); ins(`![${file.name}](${up.url})`, ''); } catch (e) { A.err(e); }
        };
        A.$('#neTitle', main).oninput = (e) => queue({ title: e.target.value });
        A.$('#neFolder', main).onchange = (e) => { queue({ folder: e.target.value.trim() || 'Genel' }); drawFolders(); };
        A.$('#neTags', main).onchange = (e) => queue({ tags: A.splitTags(e.target.value) });
        const pv = A.$('#nePriv', main);
        if (pv) pv.onchange = () => { queue({ private: pv.checked }); select(cur.id); A.toast(pv.checked ? 'Not artık özel' : 'Not takımla paylaşıldı', 'ok'); };
        A.$$('.color-dots button', main).forEach((b) => (b.onclick = () => { if (!editable) return; queue({ color: b.dataset.c }); A.$$('.color-dots button', main).forEach((x) => x.classList.toggle('on', x === b)); }));
        A.$$('.seg button', main).forEach((b) => (b.onclick = () => { mode = b.dataset.m; A.ls.set('noteMode', mode); A.$('.ne-body', main).className = 'ne-body mode-' + mode; A.$$('.seg button', main).forEach((x) => x.classList.toggle('on', x === b)); }));
        A.$('#neMore', main).onclick = (e) => A.menu(e.currentTarget, [
          { icon: cur.pinned ? 'pin' : 'pin', label: cur.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle', action: () => { queue({ pinned: !cur.pinned }); } },
          { icon: 'download', label: 'Markdown olarak indir', action: () => A.download((cur.title || 'not') + '.md', ta.value, 'text/markdown') },
          { icon: 'copy', label: 'Kopyasını oluştur', action: async () => { const n = await A.col.create('notes', { title: cur.title + ' (kopya)', content: ta.value, private: true, folder: cur.folder, tags: cur.tags }); notes.push(n); select(n.id); } },
          { icon: 'printer', label: 'Yazdır / PDF', action: () => printHtml(cur.title, prev.innerHTML) },
          ...(A.canDelete(cur) ? ['-', { icon: 'trash-2', label: 'Notu sil', danger: true, action: async () => { if (await A.confirm('Not kalıcı olarak silinecek.')) { await A.col.remove('notes', cur.id).catch(A.err); } } }] : []),
        ], { align: 'right' });
      };

      notes = await A.col.list('notes');
      drawFolders();
      drawList();
      select(openId || (notes.sort((a, b) => b.updatedAt - a.updatedAt)[0] || {}).id);
      A.viewOn('db:notes', (p) => {
        if (p.action === 'delete') { notes = notes.filter((n) => n.id !== p.item.id); if (cur && cur.id === p.item.id) select(null); }
        else {
          const i = notes.findIndex((n) => n.id === p.item.id);
          if (i >= 0) { if (p.by !== A.state.user.id) { notes[i] = p.item; if (cur && cur.id === p.item.id) { const ta = A.$('#neText', el); if (ta && document.activeElement !== ta) select(cur.id); } } }
          else notes.push(p.item);
        }
        drawFolders(); drawList();
      });
      A.viewOn('notes:new', create);
      this.destroy = () => { if (pendingId) saveNow.flush(); };
    },
  });

  function printHtml(title, html) {
    const w = window.open('', '_blank');
    if (!w) return A.toast('Açılır pencere engellendi', 'err');
    w.document.write(`<html><head><title>${A.esc(title)}</title><style>body{font-family:Poppins,Arial,sans-serif;max-width:780px;margin:40px auto;line-height:1.7;color:#222}h1,h2{border-bottom:1px solid #eee;padding-bottom:4px}code{background:#f3f3f3;padding:2px 5px;border-radius:4px}pre{background:#f6f6f6;padding:12px;border-radius:8px}blockquote{border-left:4px solid #9b87f5;margin:0;padding:6px 14px;background:#f7f5ff}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px 10px}img{max-width:100%}</style></head><body><h1>${A.esc(title)}</h1>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }
  A.printHtml = printHtml;
})();
