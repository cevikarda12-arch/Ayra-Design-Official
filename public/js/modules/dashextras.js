/* Pano eklentileri: görsel ve not kağıdı ekleme, "Hedef" ipi ile öğeleri bağlama, kırmızı "Önemli" kalemi */
(function () {
  const YARN = { red: ['Kırmızı', '#e03131'], blue: ['Mavi', '#1c7ed6'], yellow: ['Sarı', '#f59f00'], green: ['Yeşil', '#2f9e44'], purple: ['Mor', '#9b87f5'] };
  const PAPER = ['#fff9db', '#ebfbee', '#e7f5ff', '#fff0f6', '#fff4e6'];
  const WIDGETS = { '#dAnn': ['w:ann', 'Duyurular'], '#dMine': ['w:mine', 'Bana Atananlar'], '#dProg': ['w:prog', 'Proje İlerlemesi'], '#dEvents': ['w:events', 'Yaklaşanlar'], '#dAct': ['w:act', 'Son Aktiviteler'], '#dTeam': ['w:team', 'Ekip'], '#dStats': ['w:stats', 'İstatistikler'] };

  A.dashExtras = function (el) {
    if (!A.state.projectId) return;
    let items = [], tasks = [];
    let mode = null; // { type: 'target', from } | { type: 'pen' }
    const cleanups = [];
    const canEdit = A.can('create') || A.can('edit_all');
    el.classList.add('dx-host');

    // ---------------------------------------------------------------- araç düğmeleri
    const actions = A.$('.dh-actions', el);
    if (actions && canEdit) {
      actions.insertAdjacentHTML('beforeend', `<span class="dx-sep"></span>
        <button class="btn" id="dxImg" title="Panoya görsel ekle">${A.icon('image')} Görsel</button>
        <button class="btn" id="dxNote" title="Panoya not kağıdı ekle">${A.icon('sticky-note')} Not kağıdı</button>
        <button class="btn dx-pen-btn" id="dxPen" title="Önemli kalemi: bir yeri daire içine al">${A.icon('pen-line')} Önemli</button>`);
      A.icons(actions);
    }
    const grid = A.$('.dash-grid', el);
    const wall = A.h('<div class="dx-wall" id="dxWall"></div>');
    grid.after(wall);
    const svg = A.h(`<svg class="dx-overlay" xmlns="http://www.w3.org/2000/svg"></svg>`);
    el.appendChild(svg);
    const bar = A.h('<div class="dx-modebar hidden" id="dxMode"></div>');
    document.body.appendChild(bar);

    // ---------------------------------------------------------------- bağlantı noktaları (anchor)
    const tagAnchors = () => {
      Object.entries(WIDGETS).forEach(([sel, [key]]) => { const n = A.$(sel, el); if (n) n.dataset.anchor = key; });
      A.$$('[data-task]', el).forEach((r) => { if (r.classList.contains('mini-item')) r.dataset.anchor = 't:' + r.dataset.task; });
    };
    const anchorEl = (key) => A.$(`[data-anchor="${CSS.escape(key)}"]`, el);
    const visibleAnchor = (key) => { const n = anchorEl(key); return n && n.offsetParent !== null ? n : null; };
    const rel = (n) => { const r = n.getBoundingClientRect(), h = el.getBoundingClientRect(); return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height }; };
    const pinOf = (n) => { const r = rel(n); return [r.x + r.w / 2, r.y + 4]; };
    const labelOf = (key) => {
      if (key.startsWith('w:')) { const w = Object.values(WIDGETS).find(([k]) => k === key); return w ? w[1] : 'Pano'; }
      if (key.startsWith('t:')) { const t = tasks.find((x) => x.id === key.slice(2)); return t ? t.title : 'Görev'; }
      const it = items.find((i) => i.id === key.slice(2));
      return it ? (it.kind === 'image' ? (it.text || 'Görsel') : (it.text || 'Not').slice(0, 50)) : 'Öğe';
    };

    // ---------------------------------------------------------------- eklenen öğeler (görsel / not kağıdı)
    const drawWall = () => {
      const list = items.filter((i) => i.kind === 'image' || i.kind === 'note').sort((a, b) => a.createdAt - b.createdAt);
      wall.innerHTML = list.length ? `<div class="dx-wall-head">${A.icon('paperclip')} Panoya eklenenler</div><div class="dx-grid">${list.map((i) => i.kind === 'image'
        ? `<figure class="dx-item dx-photo" data-anchor="i:${i.id}" style="--rot:${i.rot || 0}deg"><img src="${A.esc(i.url)}" alt="" draggable="false"><figcaption>${A.esc(i.text || '')}</figcaption></figure>`
        : `<div class="dx-item dx-paper" data-anchor="i:${i.id}" style="--rot:${i.rot || 0}deg;--pc:${A.esc(i.color || PAPER[0])}"><i class="dx-tape"></i><div class="dx-ptext">${A.esc(i.text || '')}</div><div class="dx-pfoot">${A.avatar(i.createdBy, 'xs')}<span>${A.timeAgo(i.createdAt)}</span></div></div>`).join('')}</div>` : '';
      A.icons(wall);
      A.$$('.dx-photo img', wall).forEach((img) => (img.onload = redraw));
      A.$$('.dx-item', wall).forEach((n) => (n.ondblclick = () => openItem(items.find((i) => 'i:' + i.id === n.dataset.anchor))));
      redraw();
    };
    const openItem = (it) => {
      if (!it) return;
      if (it.kind === 'image') return A.modal({ title: it.text || 'Görsel', icon: 'image', size: 'wide', body: `<img src="${A.esc(it.url)}" style="max-width:100%;max-height:70vh;display:block;margin:0 auto;border-radius:10px">` });
      editItem(it);
    };
    const editItem = async (it) => {
      if (!canEdit) return;
      const v = await A.prompt(it.kind === 'image' ? 'Görsel açıklaması' : 'Not kağıdı', { value: it.text || '', multiline: it.kind === 'note' });
      if (v !== null) A.col.update('cork', it.id, { text: v.slice(0, 600) }).catch(A.err);
    };
    const addItem = async (data) => {
      try { await A.col.create('cork', { projectId: A.state.projectId, rot: Math.round((Math.random() - 0.5) * 5), ...data }); A.sound('pop'); } catch (e) { A.err(e); }
    };
    const addImage = async (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      try { const up = await A.upload(file, { hidden: true, projectId: A.state.projectId }); await addItem({ kind: 'image', url: up.url, text: file.name.replace(/\.[^.]+$/, '').slice(0, 60) }); } catch (e) { A.err(e); }
    };
    if (canEdit) {
      A.$('#dxImg', el).onclick = async () => { for (const f of (await A.pickFile('image/*', true)) || []) await addImage(f); };
      A.$('#dxNote', el).onclick = async () => {
        const v = await A.prompt('Not kağıdı', { multiline: true, placeholder: 'Bir fikir, hatırlatma veya soru yaz...' });
        if (v && v.trim()) addItem({ kind: 'note', text: v.trim().slice(0, 600), color: PAPER[Math.floor(Math.random() * PAPER.length)] });
      };
      A.$('#dxPen', el).onclick = () => (mode && mode.type === 'pen' ? stopMode() : startPen());
      const onPaste = (e) => {
        if (e.target.closest('input,textarea') || A.$('.modal-back')) return;
        const f = [...(e.clipboardData || {}).items || []].find((x) => x.type.startsWith('image/'));
        if (f) { e.preventDefault(); addImage(f.getAsFile()); }
      };
      document.addEventListener('paste', onPaste);
      el.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); el.classList.add('dx-drop'); } });
      el.addEventListener('dragleave', (e) => { if (!el.contains(e.relatedTarget)) el.classList.toggle('dx-drop', false); });
      el.addEventListener('drop', async (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); el.classList.toggle('dx-drop', false); for (const f of e.dataTransfer.files) await addImage(f); });
      cleanups.push(() => document.removeEventListener('paste', onPaste));
    }

    // ---------------------------------------------------------------- ipler ve önemli işaretleri
    const yarnPath = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const sag = Math.min(140, 24 + d * 0.16); return `M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2 + sag} ${b[0]},${b[1]}`; };
    const pinDot = (p, c) => `<circle cx="${p[0]}" cy="${p[1]}" r="6.5" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/><circle cx="${p[0] - 2}" cy="${p[1] - 2}" r="2" fill="rgba(255,255,255,.8)"/>`;
    let tempTo = null;
    function redraw() {
      tagAnchors();
      svg.setAttribute('width', el.scrollWidth); svg.setAttribute('height', el.scrollHeight);
      svg.style.width = el.scrollWidth + 'px'; svg.style.height = el.scrollHeight + 'px';
      A.$$('.dx-important', el).forEach((n) => n.classList.toggle('dx-important', false));
      let html = '<defs><filter id="dxSh"><feDropShadow dx="1" dy="4" stdDeviation="2.5" flood-opacity=".4"/></filter><filter id="dxMarker"><feTurbulence baseFrequency=".9" numOctaves="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter></defs>';
      // önemli işaretleri
      items.filter((i) => i.kind === 'mark').forEach((m) => {
        let pts;
        if (m.anchor) {
          const n = visibleAnchor(m.anchor);
          if (!n) return;
          n.classList.add('dx-important');
          const r = rel(n);
          pts = (m.points || []).map(([x, y]) => [r.x + x * r.w, r.y + y * r.h]);
        } else pts = m.points || [];
        if (pts.length < 2) return;
        const d = 'M' + pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L');
        const lx = Math.max(...pts.map((p) => p[0])), ly = Math.min(...pts.map((p) => p[1]));
        html += `<g class="dx-mark" data-id="${m.id}"><path d="${d}" class="dx-mark-glow"/><path d="${d}" class="dx-mark-line" filter="url(#dxMarker)"/>
          <g transform="translate(${lx - 18},${ly - 6})" class="dx-mark-tag"><rect x="-58" y="-14" width="76" height="22" rx="11"/><text x="-20" y="2" text-anchor="middle">❗ ÖNEMLİ</text></g></g>`;
      });
      // ipler
      items.filter((i) => i.kind === 'link' && i.from && i.to && i.from.includes(':')).forEach((l) => {
        const a = visibleAnchor(l.from), b = visibleAnchor(l.to);
        if (!a || !b) return;
        const pa = pinOf(a), pb = pinOf(b), c = (YARN[l.color] || YARN.red)[1];
        html += `<g class="dx-link" data-id="${l.id}"><path d="${yarnPath(pa, pb)}" class="dx-hit"/><path d="${yarnPath(pa, pb)}" stroke="${c}" class="dx-yarn" filter="url(#dxSh)"/><path d="${yarnPath(pa, pb)}" class="dx-yarn-tex"/>${pinDot(pa, c)}${pinDot(pb, c)}</g>`;
      });
      // hedef modunda elde tutulan ip
      if (mode && mode.type === 'target' && tempTo) {
        const a = visibleAnchor(mode.from);
        if (a) { const pa = pinOf(a); html += `<path d="${yarnPath(pa, tempTo)}" stroke="${YARN[mode.color][1]}" class="dx-yarn dx-temp"/>${pinDot(pa, YARN[mode.color][1])}<circle cx="${tempTo[0]}" cy="${tempTo[1]}" r="5" fill="${YARN[mode.color][1]}"/>`; }
      }
      // önemli kalemiyle çizilen anlık iz
      if (mode && mode.type === 'pen' && mode.pts && mode.pts.length > 1) html += `<path d="M${mode.pts.map((p) => p.join(',')).join(' L')}" class="dx-mark-line live"/>`;
      svg.innerHTML = html;
      A.$$('.dx-link', svg).forEach((g) => (g.onclick = (e) => linkMenu(items.find((i) => i.id === g.dataset.id), e)));
      A.$$('.dx-mark', svg).forEach((g) => (g.onclick = (e) => markMenu(items.find((i) => i.id === g.dataset.id), e)));
    }
    const linkMenu = (l, e) => {
      if (!l || !canEdit) return;
      A.menu({ x: e.clientX, y: e.clientY }, [{ head: `${labelOf(l.from)} ↔ ${labelOf(l.to)}` },
        ...Object.entries(YARN).map(([k, [n, c]]) => ({ html: `<i style="width:12px;height:12px;border-radius:50%;background:${c};display:inline-block"></i> ${n} ${l.color === k ? A.icon('check') : ''}`, action: () => A.col.update('cork', l.id, { color: k }).catch(A.err) })),
        '-', { icon: 'scissors', label: 'İpi kes', danger: true, action: () => A.col.remove('cork', l.id).catch(A.err) }]);
    };
    const markMenu = (m, e) => {
      if (!m) return;
      const t = tasks.find((x) => x.id === m.taskId);
      A.menu({ x: e.clientX, y: e.clientY }, [{ head: 'Önemli' },
        ...(t ? [{ icon: 'external-link', label: 'Görevi aç: ' + t.title.slice(0, 30), action: () => A.go('tasks/' + t.id) }] : []),
        ...(canEdit ? [{ icon: 'eraser', label: 'Önemli işaretini sil', danger: true, action: () => A.col.remove('cork', m.id).catch(A.err) }] : [])]);
    };

    // ---------------------------------------------------------------- sağ tık menüsü + "Hedef"
    el.addEventListener('contextmenu', (e) => {
      const n = e.target.closest('[data-anchor]');
      if (!n || !el.contains(n)) return;
      e.preventDefault();
      if (mode) return stopMode();
      const key = n.dataset.anchor, it = key.startsWith('i:') ? items.find((i) => i.id === key.slice(2)) : null;
      const marks = items.filter((i) => i.kind === 'mark' && i.anchor === key);
      A.menu({ x: e.clientX, y: e.clientY }, [
        { head: labelOf(key).slice(0, 40) },
        ...(canEdit ? [{ icon: 'target', label: 'Hedef — iple bağla', action: () => startTarget(key) }] : []),
        ...(canEdit && !marks.length ? [{ icon: 'pen-line', label: 'Önemli olarak işaretle', action: () => markAnchor(key, null) }] : []),
        ...marks.map((m) => ({ icon: 'eraser', label: 'Önemli işaretini kaldır', action: () => A.col.remove('cork', m.id).catch(A.err) })),
        ...(key.startsWith('t:') ? [{ icon: 'external-link', label: 'Görevi aç', action: () => A.go('tasks/' + key.slice(2)) }] : []),
        ...(it && canEdit ? ['-', { icon: 'pencil', label: it.kind === 'image' ? 'Açıklama yaz' : 'Notu düzenle', action: () => editItem(it) }] : []),
        ...(it && it.kind === 'image' ? [{ icon: 'maximize-2', label: 'Büyük göster', action: () => openItem(it) }] : []),
        ...(it && (canEdit && (A.canDelete(it))) ? [{ icon: 'trash-2', label: 'Panodan kaldır', danger: true, action: async () => {
          for (const x of items.filter((i) => (i.kind === 'link' && (i.from === key || i.to === key)) || (i.kind === 'mark' && i.anchor === key))) await A.col.remove('cork', x.id).catch(() => {});
          A.col.remove('cork', it.id).catch(A.err);
        } }] : []),
      ]);
    });

    const showBar = (html) => { bar.innerHTML = html; bar.classList.toggle('hidden', !html); A.icons(bar); const c = A.$('[data-cancel]', bar); if (c) c.onclick = stopMode; };
    function stopMode() {
      if (!mode) return;
      el.classList.toggle('dx-targeting', false); el.classList.toggle('dx-pen', false);
      A.$$('.dx-hover', el).forEach((n) => n.classList.toggle('dx-hover', false));
      const pb = A.$('#dxPen', el); if (pb) pb.classList.toggle('on', false);
      mode = null; tempTo = null; showBar(''); redraw();
    }
    function startTarget(from) {
      stopMode();
      mode = { type: 'target', from, color: A.ls.get('dxYarn', 'red') };
      el.classList.add('dx-targeting');
      showBar(`${A.icon('target')} <b>İp elinde</b> — bağlamak istediğin şeye tıkla <span class="dx-colors">${Object.entries(YARN).map(([k, [, c]]) => `<i data-yc="${k}" style="background:${c}" class="${mode.color === k ? 'on' : ''}"></i>`).join('')}</span><button class="btn xs" data-cancel>Vazgeç (Esc)</button>`);
      A.$$('[data-yc]', bar).forEach((d) => (d.onclick = () => { mode.color = d.dataset.yc; A.ls.set('dxYarn', mode.color); A.$$('[data-yc]', bar).forEach((x) => x.classList.toggle('on', x === d)); redraw(); }));
    }
    const onMove = (e) => {
      if (!mode || mode.type !== 'target') return;
      const h = el.getBoundingClientRect();
      tempTo = [e.clientX - h.left, e.clientY - h.top];
      const n = e.target.closest && e.target.closest('[data-anchor]');
      A.$$('.dx-hover', el).forEach((x) => x !== n && x.classList.toggle('dx-hover', false));
      if (n && el.contains(n) && n.dataset.anchor !== mode.from) n.classList.add('dx-hover');
      redraw();
    };
    const onClick = async (e) => {
      if (!mode || mode.type !== 'target') return;
      if (e.target.closest('.dx-modebar')) return;
      e.preventDefault(); e.stopPropagation();
      const n = e.target.closest('[data-anchor]');
      if (!n || !el.contains(n) || n.dataset.anchor === mode.from) return A.toast('İpi bağlamak için panodaki başka bir şeye tıkla', 'info');
      const from = mode.from, to = n.dataset.anchor, color = mode.color;
      stopMode();
      if (items.some((l) => l.kind === 'link' && ((l.from === from && l.to === to) || (l.from === to && l.to === from)))) return A.toast('Bu ikisi zaten bağlı', 'info');
      try { await A.col.create('cork', { projectId: A.state.projectId, kind: 'link', from, to, color }); A.sound('pop'); A.toast(`🧶 “${labelOf(from).slice(0, 24)}” ↔ “${labelOf(to).slice(0, 24)}” bağlandı`, 'ok'); } catch (er) { A.err(er); }
    };
    const onKey = (e) => { if (e.key === 'Escape' && mode) { e.stopPropagation(); stopMode(); } };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    cleanups.push(() => { document.removeEventListener('pointermove', onMove); document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKey, true); });

    // ---------------------------------------------------------------- kırmızı "Önemli" kalemi
    function startPen() {
      stopMode();
      mode = { type: 'pen', pts: null };
      el.classList.add('dx-pen');
      A.$('#dxPen', el).classList.add('on');
      showBar(`${A.icon('pen-line')} <b>Önemli kalemi</b> — önemli olan yeri daire içine al <button class="btn xs" data-cancel>Vazgeç (Esc)</button>`);
    }
    el.addEventListener('pointerdown', (e) => {
      if (!mode || mode.type !== 'pen' || e.button !== 0) return;
      e.preventDefault();
      const h = el.getBoundingClientRect();
      mode.pts = [[e.clientX - h.left, e.clientY - h.top]];
      const mv = (ev) => { const p = [ev.clientX - h.left, ev.clientY - h.top]; const l = mode.pts[mode.pts.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 3) { mode.pts.push(p); redraw(); } };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); finishPen(); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
    async function finishPen() {
      const pts = mode && mode.pts;
      if (!pts || pts.length < 6) { if (mode) mode.pts = null; redraw(); return; }
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const box = { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
      // daire içine alınan en uygun öğeyi bul: görev satırı > eklenen öğe > kart
      const cands = A.$$('[data-anchor]', el).filter((n) => n.offsetParent !== null).map((n) => {
        const r = rel(n), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        const ix = Math.max(0, Math.min(box.x2, r.x + r.w) - Math.max(box.x1, r.x)), iy = Math.max(0, Math.min(box.y2, r.y + r.h) - Math.max(box.y1, r.y));
        const cover = (ix * iy) / (r.w * r.h);
        const inside = cx >= box.x1 && cx <= box.x2 && cy >= box.y1 && cy <= box.y2;
        const rank = n.dataset.anchor.startsWith('t:') ? 0 : n.dataset.anchor.startsWith('i:') ? 1 : 2;
        const bx = (box.x1 + box.x2) / 2, by = (box.y1 + box.y2) / 2;
        const dist = Math.hypot(cx - bx, cy - by) / Math.max(1, Math.hypot(box.x2 - box.x1, box.y2 - box.y1));
        return { n, r, ok: inside || cover > 0.55, rank, dist };
      }).filter((c) => c.ok).sort((a, b) => a.rank - b.rank || a.dist - b.dist);
      const target = cands[0];
      const drawn = pts.slice();
      stopMode();
      if (target) {
        const r = target.r;
        const norm = simplify(drawn).map(([x, y]) => [+((x - r.x) / r.w).toFixed(4), +((y - r.y) / r.h).toFixed(4)]);
        await markAnchor(target.n.dataset.anchor, norm);
      } else {
        const title = await A.prompt('Önemli görev', { label: 'Daire içine aldığın yer için bir görev başlığı yaz', placeholder: 'Örn: Ana menü tasarımı acil' });
        if (!title) return;
        const t = await createImportantTask(title, 'Panoda önemli olarak işaretlendi.');
        if (t) A.col.create('cork', { projectId: A.state.projectId, kind: 'mark', anchor: null, points: simplify(drawn), taskId: t.id }).catch(A.err);
      }
    }
    const simplify = (pts) => { const out = []; const step = Math.max(1, Math.floor(pts.length / 120)); for (let i = 0; i < pts.length; i += step) out.push(pts[i]); out.push(pts[0]); return out; };
    const circlePts = () => Array.from({ length: 41 }, (_, i) => { const a = (i / 40) * Math.PI * 2 - 0.6; return [+(0.5 + Math.cos(a) * 0.55).toFixed(3), +(0.5 + Math.sin(a) * 0.62).toFixed(3)]; });
    async function createImportantTask(title, description) {
      try {
        const t = await A.col.create('tasks', { projectId: A.state.projectId, title: title.slice(0, 140), description, status: 'todo', priority: 'urgent', important: true, category: 'Tasarım', tags: ['önemli'], checklist: [], comments: [] });
        A.sound('done');
        A.toast(`❗ “${t.title}” önemli görev olarak Görev Panosu'na eklendi`, 'ok');
        return t;
      } catch (e) { A.err(e); return null; }
    }
    async function markAnchor(key, points) {
      if (items.some((i) => i.kind === 'mark' && i.anchor === key)) return A.toast('Bu zaten önemli olarak işaretli', 'info');
      let taskId = null;
      if (key.startsWith('t:')) {
        const t = tasks.find((x) => x.id === key.slice(2));
        if (t) {
          try { await A.col.update('tasks', t.id, { priority: 'urgent', important: true, tags: [...new Set([...(t.tags || []), 'önemli'])] }); taskId = t.id; A.sound('done'); A.toast(`❗ “${t.title}” önemli görev olarak işaretlendi`, 'ok'); } catch (e) { return A.err(e); }
        }
      } else {
        const base = labelOf(key);
        const title = await A.prompt('Önemli görev', { label: 'Görevler kısmına eklenecek önemli görevin başlığı', value: key.startsWith('w:') ? `${base} — kontrol et` : base.split('\n')[0].slice(0, 80) });
        if (!title) return;
        const t = await createImportantTask(title, `Panoda **${base.split('\n')[0].slice(0, 60)}** önemli olarak işaretlendi.`);
        if (!t) return;
        taskId = t.id;
      }
      A.col.create('cork', { projectId: A.state.projectId, kind: 'mark', anchor: key, points: points || circlePts(), taskId }).catch(A.err);
    }

    // ---------------------------------------------------------------- yaşam döngüsü
    const ro = new ResizeObserver(() => redraw());
    ro.observe(el);
    const mo = new MutationObserver(A.debounce(() => redraw(), 60));
    mo.observe(grid, { childList: true, subtree: true });
    const onScrollResize = A.debounce(redraw, 50);
    window.addEventListener('resize', onScrollResize);
    cleanups.push(() => { ro.disconnect(); mo.disconnect(); window.removeEventListener('resize', onScrollResize); bar.remove(); });

    const load = async () => { [items, tasks] = await Promise.all([A.col.project('cork'), A.col.project('tasks')]); drawWall(); };
    load();
    A.viewOn('db:cork', (p) => {
      if (p.item.projectId && p.item.projectId !== A.state.projectId) return;
      if (p.action === 'delete') items = items.filter((i) => i.id !== p.item.id);
      else { const k = items.findIndex((i) => i.id === p.item.id); if (k >= 0) items[k] = p.item; else items.push(p.item); }
      drawWall();
    });
    A.viewOn('db:tasks', (p) => {
      if (p.action === 'delete') tasks = tasks.filter((t) => t.id !== p.item.id);
      else { const k = tasks.findIndex((t) => t.id === p.item.id); if (k >= 0) tasks[k] = p.item; else tasks.push(p.item); }
    });
    return () => { stopMode(); cleanups.forEach((f) => f()); };
  };
})();
