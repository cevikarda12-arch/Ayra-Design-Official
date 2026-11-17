/* Piksel Sanat Stüdyosu — sprite & animasyon kareleri */
(function () {
  const PALETTE = ['#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8', '#ffccaa', '#9b87f5', '#20c997', '#2b2b3a', '#ffffff'];
  const TOOLS = [['pen', 'pencil', 'Kalem (P)', 'p'], ['eraser', 'eraser', 'Silgi (E)', 'e'], ['fill', 'paint-bucket', 'Doldur (F)', 'f'], ['pick', 'pipette', 'Damlalık (I)', 'i'], ['line', 'minus', 'Çizgi (L)', 'l'], ['rect', 'square', 'Dikdörtgen (R)', 'r'], ['move', 'move', 'Kaydır (M)', 'm']];

  A.register('pixel', {
    title: 'Piksel Stüdyosu', icon: 'grid-3x3', group: 'yaratici', full: true,
    async render(el, [openId]) {
      if (A.needProject(el)) return;
      let sprites = await A.col.project('pixelart');
      let sp = null, frame = 0, playing = null;
      const st = { tool: 'pen', color: '#9b87f5', mirror: false, onion: true, grid: true, recent: [] };
      const undo = [], redo = [];
      el.innerHTML = `<div class="lvl">
        <aside class="lvl-side">
          <div class="row" style="padding:12px 12px 6px"><b>Spritelar</b><span class="spacer"></span>${A.can('create') ? `<button class="btn xs primary" id="pNew">${A.icon('plus')}</button>` : ''}</div>
          <div class="lvl-list" id="pList"></div>
          <div class="px-preview"><div class="label">Animasyon önizleme</div><canvas id="pPrev" width="128" height="128"></canvas>
            <div class="row" style="gap:6px"><button class="btn xs" id="pPlay">${A.icon('play')}</button><input type="range" min="1" max="24" id="pFps" class="grow"><b class="small" id="pFpsV"></b></div></div>
        </aside>
        <section class="lvl-main">
          <div class="draw-top"><b id="pName"></b><span class="small muted" id="pInfo"></span><span class="spacer"></span>
            <button class="btn icon sm" id="pUndo" title="Geri al">${A.icon('undo-2')}</button><button class="btn icon sm" id="pRedo" title="Yinele">${A.icon('redo-2')}</button>
            <button class="btn icon sm" id="pMirror" title="Ayna (simetrik çizim)">${A.icon('flip-horizontal')}</button>
            <button class="btn icon sm active" id="pOnion" title="Soğan kabuğu (önceki kare)">${A.icon('layers')}</button>
            <button class="btn icon sm active" id="pGridB" title="Izgara">${A.icon('grid-3x3')}</button>
            <button class="btn sm" id="pMore">${A.icon('more-horizontal')}</button>
            <button class="btn sm primary" id="pExport">${A.icon('download')} Dışa aktar</button></div>
          <div class="px-wrap">
            <div class="draw-tools static">${TOOLS.map(([k, ic, t]) => `<button data-t="${k}" title="${t}">${A.icon(ic)}</button>`).join('')}</div>
            <div class="px-stage" id="pStage"><canvas id="pCanvas"></canvas></div>
            <div class="px-pal"><div class="label">Renk</div><input type="color" id="pColor" style="width:100%;height:40px"><div class="px-swatches" id="pSw"></div><div class="label" style="margin-top:10px">Son kullanılan</div><div class="px-swatches" id="pRecent"></div></div>
          </div>
          <div class="px-frames" id="pFrames"></div>
        </section></div>`;
      A.icons(el);
      const canvas = A.$('#pCanvas', el), ctx = canvas.getContext('2d'), stage = A.$('#pStage', el);
      const prev = A.$('#pPrev', el), pctx = prev.getContext('2d');
      const editable = () => sp && A.canEdit(sp);
      let dirty = false;
      const save = A.debounce(async () => { if (!sp || !dirty || !editable()) return; dirty = false; try { await A.col.update('pixelart', sp.id, { frames: sp.frames, fps: sp.fps, w: sp.w, h: sp.h }); } catch (e) { A.err(e); } }, 900);
      const markSave = () => { dirty = true; save(); drawFrames(); drawList(); };

      const drawList = () => {
        const box = A.$('#pList', el);
        box.innerHTML = sprites.map((s) => `<div class="note-item ${sp && sp.id === s.id ? 'on' : ''} row" data-id="${s.id}" style="gap:10px"><canvas class="px-thumb" width="${s.w}" height="${s.h}" data-th="${s.id}"></canvas><div class="grow"><b class="ell">${A.esc(s.name)}</b><div class="small muted">${s.w}×${s.h} · ${(s.frames || []).length} kare</div></div></div>`).join('') || '<p class="small muted" style="padding:0 12px">Henüz sprite yok.</p>';
        A.$$('[data-th]', box).forEach((c) => { const s = sprites.find((x) => x.id === c.dataset.th); paintFrame(c.getContext('2d'), s, (s.frames || [])[0], 1); });
        A.$$('[data-id]', box).forEach((d) => (d.onclick = () => open(d.dataset.id)));
      };
      const paintFrame = (c, s, f, scale) => {
        c.clearRect(0, 0, s.w * scale, s.h * scale);
        if (!f) return;
        for (let i = 0; i < f.length; i++) if (f[i]) { c.fillStyle = f[i]; c.fillRect((i % s.w) * scale, Math.floor(i / s.w) * scale, scale, scale); }
      };
      const scale = () => Math.max(2, Math.floor(Math.min((stage.clientWidth - 40) / sp.w, (stage.clientHeight - 40) / sp.h)));
      let tempPixels = null;
      const draw = () => {
        if (!sp) { canvas.width = 0; return; }
        const S = scale();
        canvas.width = sp.w * S; canvas.height = sp.h * S;
        // dama tahtası arka plan
        for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { ctx.fillStyle = (x + y) % 2 ? '#2a2d38' : '#22252e'; ctx.fillRect(x * S, y * S, S, S); }
        if (st.onion && frame > 0) { ctx.globalAlpha = 0.25; paintFrameAt(sp.frames[frame - 1], S); ctx.globalAlpha = 1; }
        paintFrameAt(sp.frames[frame], S);
        if (tempPixels) { ctx.globalAlpha = 0.8; tempPixels.forEach(([x, y, c]) => { ctx.fillStyle = c || '#22252e'; ctx.fillRect(x * S, y * S, S, S); }); ctx.globalAlpha = 1; }
        if (st.grid && S >= 6) {
          ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.beginPath();
          for (let x = 0; x <= sp.w; x++) { ctx.moveTo(x * S + 0.5, 0); ctx.lineTo(x * S + 0.5, canvas.height); }
          for (let y = 0; y <= sp.h; y++) { ctx.moveTo(0, y * S + 0.5); ctx.lineTo(canvas.width, y * S + 0.5); }
          ctx.stroke();
          if (st.mirror) { ctx.strokeStyle = 'rgba(155,135,245,.7)'; ctx.beginPath(); ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height); ctx.stroke(); }
        }
      };
      const paintFrameAt = (f, S) => { if (!f) return; for (let i = 0; i < f.length; i++) if (f[i]) { ctx.fillStyle = f[i]; ctx.fillRect((i % sp.w) * S, Math.floor(i / sp.w) * S, S, S); } };

      const drawFrames = () => {
        const box = A.$('#pFrames', el);
        if (!sp) { box.innerHTML = ''; return; }
        box.innerHTML = sp.frames.map((f, i) => `<div class="pxf ${i === frame ? 'on' : ''}" data-i="${i}"><canvas width="${sp.w}" height="${sp.h}"></canvas><span>${i + 1}</span></div>`).join('') + (editable() ? `<button class="btn sm" id="pfAdd" title="Yeni kare">${A.icon('plus')}</button><button class="btn sm" id="pfDup" title="Kareyi çoğalt">${A.icon('copy')}</button><button class="btn sm" id="pfDel" title="Kareyi sil">${A.icon('trash-2')}</button><button class="btn sm" id="pfL" title="Sola taşı">${A.icon('chevron-left')}</button><button class="btn sm" id="pfR" title="Sağa taşı">${A.icon('chevron-right')}</button>` : '');
        A.icons(box);
        A.$$('.pxf', box).forEach((d) => { paintFrame(A.$('canvas', d).getContext('2d'), sp, sp.frames[+d.dataset.i], 1); d.onclick = () => { frame = +d.dataset.i; draw(); drawFrames(); }; });
        const on = (id, fn) => { const b = A.$(id, box); if (b) b.onclick = fn; };
        on('#pfAdd', () => { pushUndo(); sp.frames.splice(frame + 1, 0, blank()); frame++; draw(); markSave(); });
        on('#pfDup', () => { pushUndo(); sp.frames.splice(frame + 1, 0, [...sp.frames[frame]]); frame++; draw(); markSave(); });
        on('#pfDel', () => { if (sp.frames.length < 2) return; pushUndo(); sp.frames.splice(frame, 1); frame = Math.max(0, frame - 1); draw(); markSave(); });
        on('#pfL', () => { if (frame < 1) return; pushUndo(); [sp.frames[frame - 1], sp.frames[frame]] = [sp.frames[frame], sp.frames[frame - 1]]; frame--; draw(); markSave(); });
        on('#pfR', () => { if (frame >= sp.frames.length - 1) return; pushUndo(); [sp.frames[frame + 1], sp.frames[frame]] = [sp.frames[frame], sp.frames[frame + 1]]; frame++; draw(); markSave(); });
        A.$('#pInfo', el).textContent = ` · ${sp.w}×${sp.h} · kare ${frame + 1}/${sp.frames.length}`;
      };
      const blank = () => new Array(sp.w * sp.h).fill('');
      const pushUndo = () => { undo.push(JSON.stringify(sp.frames)); if (undo.length > 60) undo.shift(); redo.length = 0; };
      A.$('#pUndo', el).onclick = () => { const s = undo.pop(); if (s) { redo.push(JSON.stringify(sp.frames)); sp.frames = JSON.parse(s); frame = Math.min(frame, sp.frames.length - 1); draw(); markSave(); } };
      A.$('#pRedo', el).onclick = () => { const s = redo.pop(); if (s) { undo.push(JSON.stringify(sp.frames)); sp.frames = JSON.parse(s); frame = Math.min(frame, sp.frames.length - 1); draw(); markSave(); } };

      // palette
      const setColor = (c) => {
        st.color = c; A.$('#pColor', el).value = c;
        A.$$('#pSw button', el).forEach((b) => b.classList.toggle('on', b.dataset.c === c));
        if (st.tool === 'eraser' || st.tool === 'pick') setTool('pen');
      };
      A.$('#pSw', el).innerHTML = PALETTE.map((c) => `<button data-c="${c}" style="background:${c}"></button>`).join('');
      A.$$('#pSw button', el).forEach((b) => (b.onclick = () => setColor(b.dataset.c)));
      A.$('#pColor', el).oninput = (e) => setColor(e.target.value);
      const addRecent = (c) => { if (!c) return; st.recent = [c, ...st.recent.filter((x) => x !== c)].slice(0, 10); A.$('#pRecent', el).innerHTML = st.recent.map((x) => `<button data-c="${x}" style="background:${x}"></button>`).join(''); A.$$('#pRecent button', el).forEach((b) => (b.onclick = () => setColor(b.dataset.c))); };
      const setTool = (t) => { st.tool = t; A.$$('.draw-tools button', el).forEach((b) => b.classList.toggle('on', b.dataset.t === t)); };
      A.$$('.draw-tools button', el).forEach((b) => (b.onclick = () => setTool(b.dataset.t)));
      setTool('pen'); setColor(st.color);
      A.$('#pMirror', el).onclick = (e) => { st.mirror = !st.mirror; e.currentTarget.classList.toggle('active', st.mirror); draw(); };
      A.$('#pOnion', el).onclick = (e) => { st.onion = !st.onion; e.currentTarget.classList.toggle('active', st.onion); draw(); };
      A.$('#pGridB', el).onclick = (e) => { st.grid = !st.grid; e.currentTarget.classList.toggle('active', st.grid); draw(); };

      // drawing
      const cellOf = (e) => { const r = canvas.getBoundingClientRect(); const S = r.width / sp.w; return [Math.floor((e.clientX - r.left) / S), Math.floor((e.clientY - r.top) / S)]; };
      const inB = (x, y) => x >= 0 && y >= 0 && x < sp.w && y < sp.h;
      const put = (f, x, y, c) => { if (!inB(x, y)) return; f[y * sp.w + x] = c; if (st.mirror) { const mx = sp.w - 1 - x; f[y * sp.w + mx] = c; } };
      const linePts = (x0, y0, x1, y1) => { const pts = []; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy; for (;;) { pts.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } } return pts; };
      let act = null;
      canvas.addEventListener('pointerdown', (e) => {
        if (!sp || !editable()) return;
        canvas.setPointerCapture(e.pointerId);
        const [x, y] = cellOf(e);
        const f = sp.frames[frame];
        const c = st.tool === 'eraser' || e.button === 2 ? '' : st.color;
        if (st.tool === 'pick') { const v = f[y * sp.w + x]; if (v) setColor(v); return; }
        pushUndo();
        if (st.tool === 'fill') {
          const target = f[y * sp.w + x];
          if (target === c) return;
          const q = [[x, y]];
          while (q.length) { const [cx, cy] = q.pop(); if (!inB(cx, cy) || f[cy * sp.w + cx] !== target) continue; f[cy * sp.w + cx] = c; q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); }
          addRecent(c); draw(); markSave(); return;
        }
        if (st.tool === 'line' || st.tool === 'rect') { act = { t: st.tool, x0: x, y0: y, c }; return; }
        if (st.tool === 'move') { act = { t: 'move', x0: x, y0: y, orig: [...f] }; return; }
        act = { t: 'pen', lx: x, ly: y, c };
        put(f, x, y, c); addRecent(c); draw();
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('pointermove', (e) => {
        if (!act) return;
        const [x, y] = cellOf(e);
        const f = sp.frames[frame];
        if (act.t === 'pen') { linePts(act.lx, act.ly, x, y).forEach(([px, py]) => put(f, px, py, act.c)); act.lx = x; act.ly = y; draw(); }
        else if (act.t === 'line') { tempPixels = linePts(act.x0, act.y0, x, y).map(([px, py]) => [px, py, act.c]); draw(); }
        else if (act.t === 'rect') { const pts = []; const x1 = Math.min(act.x0, x), x2 = Math.max(act.x0, x), y1 = Math.min(act.y0, y), y2 = Math.max(act.y0, y); for (let i = x1; i <= x2; i++) { pts.push([i, y1, act.c], [i, y2, act.c]); } for (let j = y1; j <= y2; j++) { pts.push([x1, j, act.c], [x2, j, act.c]); } tempPixels = pts; draw(); }
        else if (act.t === 'move') { const dx = x - act.x0, dy = y - act.y0; for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) { const sx = (i - dx + sp.w * 10) % sp.w, sy = (j - dy + sp.h * 10) % sp.h; f[j * sp.w + i] = act.orig[sy * sp.w + sx]; } draw(); }
      });
      canvas.addEventListener('pointerup', () => {
        if (!act) return;
        if (tempPixels) { const f = sp.frames[frame]; tempPixels.forEach(([x, y, c]) => put(f, x, y, c)); tempPixels = null; addRecent(act.c); }
        act = null; draw(); markSave();
      });

      // preview animation
      const fpsIn = A.$('#pFps', el);
      fpsIn.oninput = () => { sp.fps = +fpsIn.value; A.$('#pFpsV', el).textContent = sp.fps + ' fps'; markSave(); if (playing) { stopAnim(); playAnim(); } };
      let pf = 0;
      const drawPrev = (f) => { pctx.imageSmoothingEnabled = false; const S = Math.floor(128 / Math.max(sp.w, sp.h)); pctx.clearRect(0, 0, 128, 128); pctx.save(); pctx.translate((128 - sp.w * S) / 2, (128 - sp.h * S) / 2); paintFrame(pctx, sp, f, S); pctx.restore(); };
      const playAnim = () => { playing = setInterval(() => { pf = (pf + 1) % sp.frames.length; drawPrev(sp.frames[pf]); }, 1000 / (sp.fps || 8)); A.$('#pPlay', el).innerHTML = A.icon('pause'); A.icons(A.$('#pPlay', el)); };
      const stopAnim = () => { clearInterval(playing); playing = null; A.$('#pPlay', el).innerHTML = A.icon('play'); A.icons(A.$('#pPlay', el)); };
      A.$('#pPlay', el).onclick = () => (playing ? stopAnim() : playAnim());

      // export
      const exportPng = (frames, S, name) => {
        const c = document.createElement('canvas');
        c.width = sp.w * S * frames.length; c.height = sp.h * S;
        const cx = c.getContext('2d');
        frames.forEach((f, k) => { cx.save(); cx.translate(k * sp.w * S, 0); paintFrame(cx, sp, f, S); cx.restore(); });
        c.toBlob((b) => A.download(name, b));
      };
      A.$('#pExport', el).onclick = (e) => {
        if (!sp) return;
        A.menu(e.currentTarget, [
          { icon: 'image', label: 'Bu kare (PNG, 1x)', action: () => exportPng([sp.frames[frame]], 1, `${sp.name}_${frame + 1}.png`) },
          { icon: 'image', label: 'Bu kare (PNG, 8x büyük)', action: () => exportPng([sp.frames[frame]], 8, `${sp.name}_${frame + 1}@8x.png`) },
          { icon: 'film', label: 'Sprite sheet (tüm kareler, 1x)', action: () => exportPng(sp.frames, 1, `${sp.name}_sheet.png`) },
          { icon: 'film', label: 'Sprite sheet (4x)', action: () => exportPng(sp.frames, 4, `${sp.name}_sheet@4x.png`) },
          { icon: 'download', label: 'JSON (veri)', action: () => A.download(sp.name + '.json', JSON.stringify({ name: sp.name, w: sp.w, h: sp.h, fps: sp.fps, frames: sp.frames })) },
        ], { align: 'right' });
      };
      A.$('#pMore', el).onclick = (e) => {
        if (!sp) return;
        A.menu(e.currentTarget, [
          ...(editable() ? [
            { icon: 'pencil', label: 'Yeniden adlandır', action: async () => { const n = await A.prompt('Sprite adı', { value: sp.name }); if (n) { sp.name = n; await A.col.update('pixelart', sp.id, { name: n }); A.$('#pName', el).textContent = n; drawList(); } } },
            { icon: 'flip-horizontal', label: 'Kareyi yatay çevir', action: () => { pushUndo(); const f = sp.frames[frame]; const n = [...f]; for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) n[y * sp.w + x] = f[y * sp.w + (sp.w - 1 - x)]; sp.frames[frame] = n; draw(); markSave(); } },
            { icon: 'trash-2', label: 'Kareyi temizle', action: () => { pushUndo(); sp.frames[frame] = blank(); draw(); markSave(); } },
            { icon: 'image', label: 'Görselden içe aktar', action: importImg },
          ] : []),
          ...(A.canDelete(sp) ? ['-', { icon: 'trash-2', label: 'Spriteı sil', danger: true, action: async () => { if (await A.confirm(`“${sp.name}” silinsin mi?`)) A.col.remove('pixelart', sp.id).catch(A.err); } }] : []),
        ], { align: 'right' });
      };
      const importImg = async () => {
        const f = await A.pickFile('image/*'); if (!f) return;
        const url = await A.readFile(f);
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h;
          const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(img, 0, 0, sp.w, sp.h);
          const d = cx.getImageData(0, 0, sp.w, sp.h).data;
          pushUndo();
          sp.frames[frame] = Array.from({ length: sp.w * sp.h }, (_, i) => (d[i * 4 + 3] < 128 ? '' : '#' + [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')));
          draw(); markSave();
        };
        img.src = url;
      };

      const nb = A.$('#pNew', el);
      if (nb) nb.onclick = async () => {
        const r = await A.form({ title: 'Yeni Sprite', icon: 'grid-3x3', fields: [{ key: 'name', label: 'Ad', required: true, value: 'Yeni sprite' }, { key: 'size', label: 'Boyut', type: 'select', options: [['8', '8×8'], ['16', '16×16'], ['24', '24×24'], ['32', '32×32'], ['48', '48×48'], ['64', '64×64']], value: '16' }] });
        if (!r) return;
        const s = +r.size;
        try { const n = await A.col.create('pixelart', { projectId: A.state.projectId, name: r.name, w: s, h: s, fps: 8, frames: [new Array(s * s).fill('')] }); if (!sprites.find((x) => x.id === n.id)) sprites.push(n); open(n.id); } catch (e) { A.err(e); }
      };
      const open = (id) => {
        save.flush();
        if (playing) stopAnim();
        sp = sprites.find((s) => s.id === id) || sprites[0] || null;
        frame = 0; undo.length = 0; redo.length = 0;
        A.$('#pName', el).textContent = sp ? sp.name : 'Sprite yok';
        if (sp) { sp.frames = sp.frames && sp.frames.length ? sp.frames : [new Array(sp.w * sp.h).fill('')]; fpsIn.value = sp.fps || 8; A.$('#pFpsV', el).textContent = (sp.fps || 8) + ' fps'; drawPrev(sp.frames[0]); }
        drawList(); draw(); drawFrames();
        if (!sp && A.can('create')) A.$('#pStage', el).insertAdjacentHTML('beforeend', '');
      };
      const onKey = (e) => {
        if (e.target.closest('input,textarea,select') || A.$('.modal-back') || !sp) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); A.$('#pUndo', el).click(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); A.$('#pRedo', el).click(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const t = TOOLS.find((x) => x[3] === e.key.toLowerCase());
        if (t) setTool(t[0]);
        if (e.key === 'ArrowRight' && frame < sp.frames.length - 1) { frame++; draw(); drawFrames(); }
        if (e.key === 'ArrowLeft' && frame > 0) { frame--; draw(); drawFrames(); }
      };
      document.addEventListener('keydown', onKey);
      const ro = new ResizeObserver(() => draw());
      ro.observe(stage);
      A.viewOn('db:pixelart', (p) => {
        if (p.item.projectId !== A.state.projectId) return;
        if (p.action === 'delete') { sprites = sprites.filter((s) => s.id !== p.item.id); if (sp && sp.id === p.item.id) open(sprites[0] && sprites[0].id); else drawList(); return; }
        const i = sprites.findIndex((s) => s.id === p.item.id);
        if (i < 0) { sprites.push(p.item); drawList(); return; }
        if (p.by === A.state.user.id) return;
        sprites[i] = p.item;
        if (sp && sp.id === p.item.id && !act) { sp = p.item; frame = Math.min(frame, sp.frames.length - 1); draw(); drawFrames(); }
        drawList();
      });
      open(openId || (sprites[0] && sprites[0].id));
      this.destroy = () => { save.flush(); clearInterval(playing); document.removeEventListener('keydown', onKey); ro.disconnect(); };
    },
  });
})();
