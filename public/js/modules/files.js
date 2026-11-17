/* Dosyalar & Varlık Kütüphanesi */
(function () {
  const KINDS = { image: ['Görseller', 'file-image'], audio: ['Ses', 'file-audio'], video: ['Video', 'file-video'], doc: ['Dokümanlar', 'file-text'], other: ['Diğer', 'file-archive'] };
  const kindOf = (f) => { const t = f.type || ''; if (t.startsWith('image/')) return 'image'; if (t.startsWith('audio/')) return 'audio'; if (t.startsWith('video/')) return 'video'; if (/pdf|text|json|word|document|sheet|presentation/.test(t) || /\.(md|txt|pdf|docx?|xlsx?|csv)$/i.test(f.name)) return 'doc'; return 'other'; };

  A.register('files', {
    title: 'Dosyalar & Varlıklar', icon: 'folder-open', group: 'kaynak', scoped: false,
    async render(el) {
      let files = (await A.col.list('files')).filter((f) => !f.hidden);
      const f = { kind: '', folder: '', q: '', view: A.ls.get('fileView', 'grid') };
      el.innerHTML = `<div class="page-head"><div><h1>Dosyalar & Varlıklar</h1><p>Konsept çizimler, sprite'lar, sesler, referanslar ve dokümanlar — tüm ekip için ortak kütüphane.</p></div>
        <div class="actions">
          <div class="input-icon" style="width:200px">${A.icon('search')}<input class="input sm" id="fQ" placeholder="Dosya ara..."></div>
          <div class="seg"><button data-v="grid">${A.icon('grid-2x2')}</button><button data-v="list">${A.icon('list')}</button></div>
          ${A.can('create') ? `<button class="btn primary" id="fUp">${A.icon('upload')} Yükle</button>` : ''}
        </div></div>
        <div class="files-layout">
          <div class="card files-side" id="fSide"></div>
          <div class="files-drop" id="fDrop"><div id="fBody"></div><div class="drop-hint">${A.icon('upload')}<b>Dosyaları buraya bırakın</b></div></div>
        </div>`;
      A.icons(el);
      A.$('#fQ', el).oninput = (e) => { f.q = e.target.value.toLocaleLowerCase('tr'); draw(); };
      A.$$('.seg button', el).forEach((b) => (b.onclick = () => { f.view = b.dataset.v; A.ls.set('fileView', f.view); draw(); }));
      const upB = A.$('#fUp', el);
      if (upB) upB.onclick = async () => { const list = await A.pickFile('*/*', true); if (list && list.length) uploadAll(list); };
      const drop = A.$('#fDrop', el);
      if (A.can('create')) {
        drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
        drop.ondragleave = (e) => { if (!drop.contains(e.relatedTarget)) drop.classList.remove('over'); };
        drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); uploadAll([...e.dataTransfer.files]); };
      }
      const uploadAll = async (list) => {
        const folder = f.folder || 'Genel';
        let ok = 0;
        for (const file of list) {
          try { await A.upload(file, { folder, projectId: A.state.projectId }); ok++; } catch (e) { A.err(e); }
        }
        if (ok) A.toast(`${ok} dosya yüklendi`, 'ok');
      };

      const drawSide = () => {
        const folders = [...new Set(files.map((x) => x.folder || 'Genel'))].sort();
        const size = files.reduce((s, x) => s + (x.size || 0), 0);
        const side = A.$('#fSide', el);
        side.innerHTML = `<div class="label" style="margin-bottom:6px">Tür</div>
          <div class="note-folders" style="padding:0"><button data-k="" class="${!f.kind ? 'on' : ''}">${A.icon('layers')} Tümü <span>${files.length}</span></button>${Object.entries(KINDS).map(([k, [l, ic]]) => `<button data-k="${k}" class="${f.kind === k ? 'on' : ''}">${A.icon(ic)} ${l} <span>${files.filter((x) => kindOf(x) === k).length}</span></button>`).join('')}</div>
          <div class="label" style="margin:14px 0 6px">Klasörler</div>
          <div class="note-folders" style="padding:0"><button data-fo="" class="${!f.folder ? 'on' : ''}">${A.icon('folder')} Tümü</button>${folders.map((x) => `<button data-fo="${A.esc(x)}" class="${f.folder === x ? 'on' : ''}">${A.icon('folder')} ${A.esc(x)} <span>${files.filter((y) => (y.folder || 'Genel') === x).length}</span></button>`).join('')}</div>
          ${A.can('create') ? `<button class="btn xs ghost" id="fNewF" style="margin-top:6px">${A.icon('folder-plus')} Yeni klasör</button>` : ''}
          <div class="small muted" style="margin-top:16px">${A.icon('hard-drive')} Toplam: ${A.fmtSize(size)}</div>`;
        A.icons(side);
        A.$$('[data-k]', side).forEach((b) => (b.onclick = () => { f.kind = b.dataset.k; drawSide(); draw(); }));
        A.$$('[data-fo]', side).forEach((b) => (b.onclick = () => { f.folder = b.dataset.fo; drawSide(); draw(); }));
        const nf = A.$('#fNewF', side);
        if (nf) nf.onclick = async () => { const n = await A.prompt('Klasör adı', { placeholder: 'Örn: Konsept Sanat' }); if (n) { f.folder = n.trim(); drawSide(); draw(); A.toast(`“${n}” klasörü seçildi — yüklediğiniz dosyalar buraya gidecek`, 'info'); } };
      };
      const draw = () => {
        A.$$('.page-head .seg button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === f.view));
        const list = files.filter((x) => (!f.kind || kindOf(x) === f.kind) && (!f.folder || (x.folder || 'Genel') === f.folder) && (!f.q || (x.name + ' ' + (x.tags || []).join(' ')).toLocaleLowerCase('tr').includes(f.q))).sort((a, b) => b.createdAt - a.createdAt);
        const body = A.$('#fBody', el);
        if (!list.length) { body.innerHTML = A.emptyState('folder-open', f.folder ? `“${f.folder}” klasörü boş` : 'Henüz dosya yok', 'Dosyaları sürükleyip bırakın veya “Yükle” butonunu kullanın.'); A.icons(body); return; }
        if (f.view === 'list') {
          body.innerHTML = `<div class="card" style="padding:0"><table class="table"><thead><tr><th>Ad</th><th>Klasör</th><th>Boyut</th><th>Yükleyen</th><th>Tarih</th><th></th></tr></thead><tbody>${list.map((x) => `<tr class="click" data-id="${x.id}"><td>${A.icon(KINDS[kindOf(x)][1])} ${A.esc(x.name)}</td><td>${A.esc(x.folder || 'Genel')}</td><td>${A.fmtSize(x.size || 0)}</td><td>${A.avatar(x.createdBy, 'xs')}</td><td class="small muted">${A.timeAgo(x.createdAt)}</td><td><a class="btn xs ghost" href="${A.esc(x.url)}" download="${A.esc(x.name)}" onclick="event.stopPropagation()">${A.icon('download')}</a></td></tr>`).join('')}</tbody></table></div>`;
        } else {
          body.innerHTML = `<div class="file-grid stagger">${list.map((x) => { const k = kindOf(x); return `<div class="fcard" data-id="${x.id}"><div class="fthumb">${k === 'image' ? `<img src="${A.esc(x.url)}" loading="lazy">` : A.icon(KINDS[k][1])}</div><div class="fname ell" title="${A.esc(x.name)}">${A.esc(x.name)}</div><div class="small muted">${A.fmtSize(x.size || 0)} · ${A.timeAgo(x.createdAt)}</div></div>`; }).join('')}</div>`;
        }
        A.icons(body);
        A.$$('[data-id]', body).forEach((d) => (d.onclick = () => preview(files.find((x) => x.id === d.dataset.id))));
      };

      const preview = async (x) => {
        const k = kindOf(x);
        let content = '';
        if (k === 'image') content = `<img src="${A.esc(x.url)}" class="fprev-img">`;
        else if (k === 'audio') content = `<div class="center" style="padding:30px">${A.icon('headphones')}<audio controls src="${A.esc(x.url)}" style="width:100%;margin-top:14px"></audio></div>`;
        else if (k === 'video') content = `<video controls src="${A.esc(x.url)}" style="width:100%;border-radius:10px"></video>`;
        else if (/text|json/.test(x.type) || /\.(md|txt|json|csv)$/i.test(x.name)) { try { const t = await (await fetch(x.url)).text(); content = `<pre class="fprev-txt">${A.esc(t.slice(0, 20000))}</pre>`; } catch {} }
        else content = `<div class="empty"><div class="ico">${A.icon(KINDS[k][1])}</div><p>Bu dosya türü için önizleme yok.</p></div>`;
        const m = A.modal({
          title: x.name, icon: KINDS[k][1], size: 'wide',
          body: `${content}<div class="row wrap small muted" style="margin-top:12px;gap:14px"><span>${A.icon('folder')} ${A.esc(x.folder || 'Genel')}</span><span>${A.fmtSize(x.size || 0)}</span><span>${A.esc(x.type)}</span><span>${A.esc(A.user(x.createdBy).displayName)} · ${A.fmtDate(x.createdAt)}</span></div>`,
          foot: `${A.canDelete(x) ? `<button class="btn danger" data-del>${A.icon('trash-2')} Sil</button>` : ''}<span class="spacer"></span>${A.canEdit(x) ? `<button class="btn" data-mv>${A.icon('folder')} Taşı / Yeniden adlandır</button>` : ''}<button class="btn" data-copy>${A.icon('link')} Bağlantıyı kopyala</button><a class="btn primary" href="${A.esc(x.url)}" download="${A.esc(x.name)}">${A.icon('download')} İndir</a>`,
        });
        A.icons(m.el);
        const on = (s, fn) => { const b = A.$(s, m.el); if (b) b.onclick = fn; };
        on('[data-del]', async () => { if (await A.confirm(`“${x.name}” kalıcı olarak silinsin mi?`)) { await A.col.remove('files', x.id).catch(A.err); m.close(); } });
        on('[data-copy]', () => { navigator.clipboard.writeText(location.origin + x.url).then(() => A.toast('Bağlantı kopyalandı', 'ok')); });
        on('[data-mv]', async () => { const r = await A.form({ title: 'Dosyayı düzenle', icon: 'folder', fields: [{ key: 'name', label: 'Dosya adı', value: x.name, required: true }, { key: 'folder', label: 'Klasör', value: x.folder || 'Genel' }, { key: 'tags', label: 'Etiketler', value: (x.tags || []).join(', ') }] }); if (r) { await A.col.update('files', x.id, { name: r.name, folder: r.folder || 'Genel', tags: A.splitTags(r.tags) }).catch(A.err); m.close(); } });
      };

      drawSide(); draw();
      A.viewOn('db:files', (p) => {
        if (p.action === 'delete') files = files.filter((x) => x.id !== p.item.id);
        else if (!p.item.hidden) { const i = files.findIndex((x) => x.id === p.item.id); if (i >= 0) files[i] = p.item; else files.push(p.item); }
        drawSide(); draw();
      });
    },
  });
})();
