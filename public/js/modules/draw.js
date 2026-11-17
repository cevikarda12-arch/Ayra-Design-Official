/* Ortak Çizim Panosu — sonsuz tuval, gerçek zamanlı çok kullanıcılı */
(function () {
  const TOOLS = [
    ['select', 'mouse-pointer-2', 'Seç / Taşı (V)', 'v'],
    ['hand', 'hand', 'Kaydır (H / Boşluk)', 'h'],
    ['pen', 'pen-line', 'Kalem (B)', 'b'],
    ['marker', 'highlighter', 'Fosforlu kalem (M)', 'm'],
    ['eraser', 'eraser', 'Silgi (E)', 'e'],
    ['line', 'minus', 'Çizgi (L)', 'l'],
    ['arrow', 'arrow-up-right', 'Ok (A)', 'a'],
    ['rect', 'square', 'Dikdörtgen (R)', 'r'],
    ['ellipse', 'circle', 'Elips (O)', 'o'],
    ['text', 'type', 'Yazı (T)', 't'],
    ['sticky', 'sticky-note', 'Yapışkan not (N)', 'n'],
    ['image', 'image', 'Görsel ekle (I)', 'i'],
  ];
  const SWATCHES = ['#ffffff', '#1d1b2c', '#9b87f5', '#20c997', '#f06595', '#4dabf7', '#ffa94d', '#ffd43b', '#ff6b6b', '#69db7c', '#868e96', '#e599f7'];
  const STICKY = ['#ffd43b', '#69db7c', '#74c0fc', '#f783ac', '#ffa94d', '#b197fc'];

  A.register('draw', {
    title: 'Çizim Panosu', icon: 'pen-tool', group: 'yaratici', full: true,
    async render(el, [openId]) {
      if (A.needProject(el)) return;
      let boards = await A.col.project('drawings');
      if (!boards.length && A.can('create')) {
        boards = [await A.col.create('drawings', { projectId: A.state.projectId, name: 'Yeni Pano', strokes: [] })];
      }
      if (!boards.length) { el.innerHTML = A.emptyState('pen-tool', 'Pano yok', 'Henüz çizim panosu oluşturulmamış.'); A.icons(el); return; }
      let board = boards.find((b) => b.id === openId) || boards.find((b) => b.id === A.ls.get('board')) || boards[0];

      const st = {
        tool: 'pen', color: A.state.user.prefs && A.state.user.prefs.theme === 'light' ? '#1d1b2c' : '#ffffff', size: 4, opacity: 1, fill: false,
        zoom: 1, panX: 0, panY: 0, grid: A.ls.get('drawGrid', true), strokes: [], selected: null,
      };
      const canDraw = A.can('create') || A.can('edit_all');
      el.innerHTML = `<div class="draw">
        <div class="draw-top">
          <button class="btn sm" id="dBoard">${A.icon('layers')}<span id="dBoardName"></span>${A.icon('chevron-down')}</button>
          <span class="small muted" id="dInfo"></span>
          <span class="spacer"></span>
          <div class="draw-cursors-list" id="dPeople"></div>
          <button class="btn icon sm" id="dUndo" title="Geri al (Ctrl+Z)">${A.icon('undo-2')}</button>
          <button class="btn icon sm" id="dRedo" title="Yinele (Ctrl+Y)">${A.icon('redo-2')}</button>
          <div class="seg"><button id="dZo">${A.icon('zoom-out')}</button><button id="dZr" style="min-width:56px">100%</button><button id="dZi">${A.icon('zoom-in')}</button></div>
          <button class="btn icon sm ${st.grid ? 'active' : ''}" id="dGrid" title="Izgara">${A.icon('grid-3x3')}</button>
          <button class="btn sm" id="dExport">${A.icon('download')} PNG</button>
          ${canDraw ? `<button class="btn sm danger" id="dClear" title="Panoyu temizle">${A.icon('trash-2')}</button>` : ''}
        </div>
        <div class="draw-stage" id="dStage">
          <canvas id="dCanvas"></canvas>
          <div class="draw-overlay" id="dOverlay"></div>
          <div class="draw-tools">${TOOLS.map(([k, ic, t]) => `<button data-t="${k}" title="${t}" ${!canDraw && !['select', 'hand'].includes(k) ? 'disabled' : ''}>${A.icon(ic)}</button>`).join('')}</div>
          <div class="draw-props">
            <div class="swatches">${SWATCHES.map((c) => `<button data-c="${c}" style="background:${c}"></button>`).join('')}<input type="color" id="dColor"></div>
            <div class="row" style="gap:8px"><span class="small muted">Kalınlık</span><input type="range" min="1" max="60" id="dSize" value="${st.size}"><b id="dSizeV" class="small">${st.size}</b></div>
            <div class="row" style="gap:8px"><span class="small muted">Opaklık</span><input type="range" min="10" max="100" id="dOp" value="100"></div>
            <label class="row small" style="gap:8px;cursor:pointer"><input type="checkbox" id="dFill"> Şekilleri doldur</label>
          </div>
          <div class="draw-hint" id="dHint"></div>
        </div></div>`;
      A.icons(el);

      const stage = A.$('#dStage', el), canvas = A.$('#dCanvas', el), ctx = canvas.getContext('2d'), overlay = A.$('#dOverlay', el);
      const sock = A.state.socket;
      let dpr = 1, W = 0, H = 0, dirty = true, raf, temp = null;
      const undoStack = [], redoStack = [];
      const imgCache = new Map();

      const resize = () => {
        dpr = Math.min(devicePixelRatio || 1, 2);
        W = stage.clientWidth; H = stage.clientHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        dirty = true;
      };
      const ro = new ResizeObserver(resize);
      ro.observe(stage);
      resize();

      const toWorld = (cx, cy) => { const r = canvas.getBoundingClientRect(); return [(cx - r.left - st.panX) / st.zoom, (cy - r.top - st.panY) / st.zoom]; };
      const updateGrid = () => {
        const g = 32 * st.zoom;
        stage.style.backgroundSize = st.grid ? `${g}px ${g}px` : '';
        stage.style.backgroundPosition = `${st.panX}px ${st.panY}px`;
        stage.classList.toggle('grid-on', st.grid);
        A.$('#dZr', el).textContent = Math.round(st.zoom * 100) + '%';
      };

      // ------------------------------------------------------------- rendering
      const getImg = (src) => {
        if (imgCache.has(src)) return imgCache.get(src);
        const img = new Image();
        img.onload = () => { dirty = true; };
        img.src = src;
        imgCache.set(src, img);
        return img;
      };
      const wrapText = (c, text, maxW) => {
        const out = [];
        String(text || '').split('\n').forEach((para) => {
          let line = '';
          para.split(' ').forEach((w) => { const test = line ? line + ' ' + w : w; if (c.measureText(test).width > maxW && line) { out.push(line); line = w; } else line = test; });
          out.push(line);
        });
        return out;
      };
      const drawStroke = (c, s) => {
        c.save();
        c.globalAlpha = s.opacity == null ? 1 : s.opacity;
        c.strokeStyle = s.color; c.fillStyle = s.color;
        c.lineWidth = s.size; c.lineCap = 'round'; c.lineJoin = 'round';
        if (s.type === 'pen' || s.type === 'marker') {
          if (s.type === 'marker') { c.globalAlpha = 0.35; c.lineCap = 'square'; }
          const p = s.points;
          if (!p || !p.length) { c.restore(); return; }
          c.beginPath();
          c.moveTo(p[0][0], p[0][1]);
          if (p.length === 1) { c.lineTo(p[0][0] + 0.01, p[0][1]); }
          for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; c.quadraticCurveTo(p[i][0], p[i][1], mx, my); }
          if (p.length > 1) c.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
          c.stroke();
        } else if (s.type === 'line' || s.type === 'arrow') {
          c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
          if (s.type === 'arrow') {
            const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1), L = Math.max(12, s.size * 3.5);
            c.beginPath(); c.moveTo(s.x2, s.y2);
            c.lineTo(s.x2 - L * Math.cos(a - 0.45), s.y2 - L * Math.sin(a - 0.45));
            c.lineTo(s.x2 - L * Math.cos(a + 0.45), s.y2 - L * Math.sin(a + 0.45));
            c.closePath(); c.fill();
          }
        } else if (s.type === 'rect') {
          const x = Math.min(s.x1, s.x2), y = Math.min(s.y1, s.y2), w = Math.abs(s.x2 - s.x1), h = Math.abs(s.y2 - s.y1);
          c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, Math.min(8, w / 2, h / 2)); else c.rect(x, y, w, h);
          if (s.fill) { c.globalAlpha *= 0.85; c.fill(); } else c.stroke();
        } else if (s.type === 'ellipse') {
          c.beginPath();
          c.ellipse((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, Math.abs(s.x2 - s.x1) / 2, Math.abs(s.y2 - s.y1) / 2, 0, 0, Math.PI * 2);
          if (s.fill) { c.globalAlpha *= 0.85; c.fill(); } else c.stroke();
        } else if (s.type === 'text') {
          const fs = Math.max(12, s.size * 4);
          c.font = `600 ${fs}px Poppins, sans-serif`;
          c.textBaseline = 'top';
          String(s.text || '').split('\n').forEach((ln, i) => c.fillText(ln, s.x, s.y + i * fs * 1.25));
        } else if (s.type === 'sticky') {
          c.globalAlpha = 1;
          c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
          c.fillStyle = s.color; c.fillRect(s.x, s.y, s.w, s.h);
          c.shadowColor = 'transparent';
          c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(s.x, s.y, s.w, 18);
          c.fillStyle = '#1d1b2c'; c.font = '20px Kalam, cursive'; c.textBaseline = 'top';
          wrapText(c, s.text, s.w - 24).slice(0, Math.floor((s.h - 30) / 24)).forEach((ln, i) => c.fillText(ln, s.x + 12, s.y + 26 + i * 24));
        } else if (s.type === 'image') {
          const img = getImg(s.src);
          if (img.complete && img.naturalWidth) c.drawImage(img, s.x, s.y, s.w, s.h);
          else { c.strokeStyle = '#888'; c.setLineDash([6, 6]); c.lineWidth = 2; c.strokeRect(s.x, s.y, s.w, s.h); }
        }
        c.restore();
      };
      const bbox = (s) => {
        if (s.points) { let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity; s.points.forEach(([x, y]) => { x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y); }); const p = s.size / 2; return [x1 - p, y1 - p, x2 + p, y2 + p]; }
        if (s.x1 !== undefined) return [Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.max(s.x1, s.x2), Math.max(s.y1, s.y2)];
        if (s.type === 'text') { ctx.font = `600 ${Math.max(12, s.size * 4)}px Poppins`; const lines = String(s.text || '').split('\n'); const w = Math.max(...lines.map((l) => ctx.measureText(l).width)); return [s.x, s.y, s.x + w, s.y + lines.length * Math.max(12, s.size * 4) * 1.25]; }
        return [s.x, s.y, s.x + (s.w || 0), s.y + (s.h || 0)];
      };
      const render = () => {
        if (dirty) {
          dirty = false;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.setTransform(dpr * st.zoom, 0, 0, dpr * st.zoom, dpr * st.panX, dpr * st.panY);
          st.strokes.forEach((s) => drawStroke(ctx, s));
          if (temp) drawStroke(ctx, temp);
          if (st.selected) {
            const s = st.strokes.find((x) => x.id === st.selected);
            if (s) { const [x1, y1, x2, y2] = bbox(s); ctx.save(); ctx.strokeStyle = '#9b87f5'; ctx.lineWidth = 1.5 / st.zoom; ctx.setLineDash([6 / st.zoom, 4 / st.zoom]); ctx.strokeRect(x1 - 6, y1 - 6, x2 - x1 + 12, y2 - y1 + 12); ctx.restore(); }
          }
          A.$('#dInfo', el).textContent = `${st.strokes.length} öğe`;
        }
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);

      // ------------------------------------------------------------- hit test
      const distSeg = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; const l = dx * dx + dy * dy; let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); };
      const hit = (s, x, y, tol) => {
        if (s.points) { for (let i = 0; i < s.points.length; i++) { const a = s.points[i], b = s.points[i + 1] || a; if (distSeg(x, y, a[0], a[1], b[0], b[1]) < tol + s.size / 2) return true; } return false; }
        if (s.type === 'line' || s.type === 'arrow') return distSeg(x, y, s.x1, s.y1, s.x2, s.y2) < tol + s.size / 2;
        const [x1, y1, x2, y2] = bbox(s);
        if ((s.type === 'rect' || s.type === 'ellipse') && !s.fill) {
          const inside = x >= x1 - tol && x <= x2 + tol && y >= y1 - tol && y <= y2 + tol;
          const deep = x > x1 + tol && x < x2 - tol && y > y1 + tol && y < y2 - tol;
          return inside && !deep;
        }
        return x >= x1 - tol && x <= x2 + tol && y >= y1 - tol && y <= y2 + tol;
      };
      const topHit = (x, y) => { for (let i = st.strokes.length - 1; i >= 0; i--) if (hit(st.strokes[i], x, y, 6 / st.zoom)) return st.strokes[i]; return null; };

      // ------------------------------------------------------------- actions
      const addStroke = (s, record = true) => {
        st.strokes.push(s); dirty = true;
        sock.emit('draw:stroke', { boardId: board.id, stroke: s });
        if (record) { undoStack.push({ t: 'add', s }); redoStack.length = 0; }
      };
      const removeStrokes = (list, record = true) => {
        if (!list.length) return;
        const ids = new Set(list.map((s) => s.id));
        st.strokes = st.strokes.filter((s) => !ids.has(s.id));
        if (ids.has(st.selected)) st.selected = null;
        dirty = true;
        sock.emit('draw:remove', { boardId: board.id, ids: [...ids] });
        if (record) { undoStack.push({ t: 'remove', list }); redoStack.length = 0; }
      };
      const updateStroke = (s, patch, record = true, before = null) => {
        const prev = before || JSON.parse(JSON.stringify(s));
        Object.assign(s, patch); dirty = true;
        sock.emit('draw:update', { boardId: board.id, stroke: s });
        if (record) { undoStack.push({ t: 'update', id: s.id, before: prev, after: JSON.parse(JSON.stringify(s)) }); redoStack.length = 0; }
      };
      const undo = () => {
        const a = undoStack.pop(); if (!a) return;
        if (a.t === 'add') removeStrokes([a.s], false);
        else if (a.t === 'remove') a.list.forEach((s) => addStroke(s, false));
        else if (a.t === 'update') { const s = st.strokes.find((x) => x.id === a.id); if (s) { Object.keys(s).forEach((k) => delete s[k]); Object.assign(s, JSON.parse(JSON.stringify(a.before))); dirty = true; sock.emit('draw:update', { boardId: board.id, stroke: s }); } }
        redoStack.push(a);
      };
      const redo = () => {
        const a = redoStack.pop(); if (!a) return;
        if (a.t === 'add') addStroke(a.s, false);
        else if (a.t === 'remove') removeStrokes(a.list, false);
        else if (a.t === 'update') { const s = st.strokes.find((x) => x.id === a.id); if (s) { Object.assign(s, JSON.parse(JSON.stringify(a.after))); dirty = true; sock.emit('draw:update', { boardId: board.id, stroke: s }); } }
        undoStack.push(a);
      };

      // ------------------------------------------------------------- pointer
      let action = null, spaceDown = false;
      const setTool = (t) => {
        st.tool = t;
        A.$$('.draw-tools button', el).forEach((b) => b.classList.toggle('on', b.dataset.t === t));
        stage.dataset.tool = t;
        if (t !== 'select') { st.selected = null; dirty = true; }
        const hints = { select: 'Nesneye tıklayıp sürükleyin · Delete ile silin · çift tıkla yazıyı düzenle', hand: 'Sürükleyerek tuvali kaydırın · tekerlek ile yakınlaştırın', eraser: 'Silmek istediğiniz çizimlerin üzerinden geçin', text: 'Yazı eklemek için tuvale tıklayın', sticky: 'Yapışkan not eklemek için tıklayın', image: 'Görsel yüklemek için tuvale tıklayın' };
        A.$('#dHint', el).textContent = hints[t] || '';
        A.$('#dHint', el).classList.toggle('show', !!hints[t]);
      };
      A.$$('.draw-tools button', el).forEach((b) => (b.onclick = () => setTool(b.dataset.t)));

      const editText = (s) => {
        A.prompt(s.type === 'sticky' ? 'Notu düzenle' : 'Yazıyı düzenle', { value: s.text, multiline: true }).then((v) => { if (v !== null) { if (!v.trim()) removeStrokes([s]); else updateStroke(s, { text: v }); } });
      };

      canvas.addEventListener('pointerdown', async (e) => {
        canvas.setPointerCapture(e.pointerId);
        const [x, y] = toWorld(e.clientX, e.clientY);
        if (e.button === 1 || st.tool === 'hand' || spaceDown) { action = { t: 'pan', sx: e.clientX, sy: e.clientY, px: st.panX, py: st.panY }; stage.classList.add('panning'); return; }
        if (e.button !== 0) return;
        const base = { id: A.uid(), color: st.color, size: st.size, opacity: st.opacity, userId: A.state.user.id };
        switch (st.tool) {
          case 'select': {
            const s = topHit(x, y);
            st.selected = s ? s.id : null; dirty = true;
            if (s && canDraw) action = { t: 'move', s, sx: x, sy: y, before: JSON.parse(JSON.stringify(s)), moved: false };
            break;
          }
          case 'pen': case 'marker':
            temp = { ...base, type: st.tool, points: [[x, y]], size: st.tool === 'marker' ? st.size * 3 : st.size };
            action = { t: 'draw' }; break;
          case 'eraser': action = { t: 'erase', removed: [] }; eraseAt(x, y); break;
          case 'line': case 'arrow': case 'rect': case 'ellipse':
            temp = { ...base, type: st.tool, x1: x, y1: y, x2: x, y2: y, fill: st.fill };
            action = { t: 'shape', shift: e.shiftKey }; break;
          case 'text': {
            const v = await A.prompt('Yazı ekle', { multiline: true, placeholder: 'Metninizi yazın...' });
            if (v && v.trim()) addStroke({ ...base, type: 'text', x, y, text: v });
            break;
          }
          case 'sticky': {
            const v = await A.prompt('Yapışkan not', { multiline: true, placeholder: 'Fikrinizi yazın...' });
            if (v && v.trim()) addStroke({ ...base, type: 'sticky', x: x - 90, y: y - 70, w: 200, h: 170, text: v, color: STICKY[Math.floor(Math.random() * STICKY.length)], opacity: 1 });
            break;
          }
          case 'image': {
            const file = await A.pickFile('image/*');
            if (!file) break;
            try {
              const up = await A.upload(file, { hidden: true, projectId: A.state.projectId });
              const img = getImg(up.url);
              const place = () => { const k = Math.min(1, 480 / Math.max(img.naturalWidth || 400, img.naturalHeight || 300)); const w = (img.naturalWidth || 400) * k, h = (img.naturalHeight || 300) * k; addStroke({ ...base, type: 'image', src: up.url, x: x - w / 2, y: y - h / 2, w, h, opacity: 1 }); setTool('select'); };
              if (img.complete && img.naturalWidth) place(); else img.onload = () => { dirty = true; place(); };
            } catch (er) { A.err(er); }
            break;
          }
        }
      });
      canvas.addEventListener('dblclick', (e) => {
        const [x, y] = toWorld(e.clientX, e.clientY);
        const s = topHit(x, y);
        if (s && (s.type === 'text' || s.type === 'sticky') && canDraw) editText(s);
      });
      const eraseAt = (x, y) => {
        const tol = Math.max(6, st.size) / st.zoom;
        const hits = st.strokes.filter((s) => hit(s, x, y, tol));
        if (hits.length) { removeStrokes(hits, false); action.removed.push(...hits); }
      };
      let lastCursor = 0;
      canvas.addEventListener('pointermove', (e) => {
        const [x, y] = toWorld(e.clientX, e.clientY);
        const now = Date.now();
        if (now - lastCursor > 60) { lastCursor = now; sock.emit('draw:cursor', { x, y }); }
        if (!action) return;
        if (action.t === 'pan') { st.panX = action.px + e.clientX - action.sx; st.panY = action.py + e.clientY - action.sy; updateGrid(); updateCursors(); dirty = true; }
        else if (action.t === 'draw') { const pts = temp.points; const l = pts[pts.length - 1]; if (Math.hypot(l[0] - x, l[1] - y) > 1.5 / st.zoom) { pts.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]); dirty = true; } }
        else if (action.t === 'shape') {
          let x2 = x, y2 = y;
          if (e.shiftKey) {
            if (temp.type === 'rect' || temp.type === 'ellipse') { const d = Math.max(Math.abs(x - temp.x1), Math.abs(y - temp.y1)); x2 = temp.x1 + Math.sign(x - temp.x1) * d; y2 = temp.y1 + Math.sign(y - temp.y1) * d; }
            else { const a = Math.round(Math.atan2(y - temp.y1, x - temp.x1) / (Math.PI / 4)) * (Math.PI / 4); const L = Math.hypot(x - temp.x1, y - temp.y1); x2 = temp.x1 + Math.cos(a) * L; y2 = temp.y1 + Math.sin(a) * L; }
          }
          temp.x2 = x2; temp.y2 = y2; dirty = true;
        }
        else if (action.t === 'erase') eraseAt(x, y);
        else if (action.t === 'move') {
          const dx = x - action.sx, dy = y - action.sy;
          const s = action.s, b = action.before;
          if (b.points) s.points = b.points.map(([px, py]) => [px + dx, py + dy]);
          else if (b.x1 !== undefined) { s.x1 = b.x1 + dx; s.x2 = b.x2 + dx; s.y1 = b.y1 + dy; s.y2 = b.y2 + dy; }
          else { s.x = b.x + dx; s.y = b.y + dy; }
          action.moved = true; dirty = true;
        }
      });
      const endAction = () => {
        if (!action) return;
        if (action.t === 'draw' && temp) { addStroke(temp); temp = null; }
        else if (action.t === 'shape' && temp) { if (Math.hypot(temp.x2 - temp.x1, temp.y2 - temp.y1) > 3) addStroke(temp); temp = null; }
        else if (action.t === 'erase' && action.removed.length) { undoStack.push({ t: 'remove', list: action.removed }); redoStack.length = 0; }
        else if (action.t === 'move' && action.moved) updateStroke(action.s, {}, true, action.before);
        stage.classList.remove('panning');
        action = null; dirty = true;
      };
      canvas.addEventListener('pointerup', endAction);
      canvas.addEventListener('pointercancel', endAction);
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey || !e.shiftKey) {
          const r = canvas.getBoundingClientRect();
          const mx = e.clientX - r.left, my = e.clientY - r.top;
          const nz = A.clamp(st.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 0.1, 6);
          st.panX = mx - ((mx - st.panX) * nz) / st.zoom;
          st.panY = my - ((my - st.panY) * nz) / st.zoom;
          st.zoom = nz;
        } else { st.panX -= e.deltaY; }
        updateGrid(); updateCursors(); dirty = true;
      }, { passive: false });

      const zoomBy = (k) => { const mx = W / 2, my = H / 2, nz = A.clamp(st.zoom * k, 0.1, 6); st.panX = mx - ((mx - st.panX) * nz) / st.zoom; st.panY = my - ((my - st.panY) * nz) / st.zoom; st.zoom = nz; updateGrid(); updateCursors(); dirty = true; };
      const fit = () => {
        if (!st.strokes.length) { st.zoom = 1; st.panX = W / 2; st.panY = H / 2; }
        else {
          let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
          st.strokes.forEach((s) => { const b = bbox(s); x1 = Math.min(x1, b[0]); y1 = Math.min(y1, b[1]); x2 = Math.max(x2, b[2]); y2 = Math.max(y2, b[3]); });
          st.zoom = A.clamp(Math.min((W - 160) / (x2 - x1 || 1), (H - 160) / (y2 - y1 || 1)), 0.1, 2);
          st.panX = W / 2 - ((x1 + x2) / 2) * st.zoom; st.panY = H / 2 - ((y1 + y2) / 2) * st.zoom;
        }
        updateGrid(); updateCursors(); dirty = true;
      };
      A.$('#dZi', el).onclick = () => zoomBy(1.2);
      A.$('#dZo', el).onclick = () => zoomBy(1 / 1.2);
      A.$('#dZr', el).onclick = fit;
      A.$('#dUndo', el).onclick = undo;
      A.$('#dRedo', el).onclick = redo;
      A.$('#dGrid', el).onclick = (e) => { st.grid = !st.grid; A.ls.set('drawGrid', st.grid); e.currentTarget.classList.toggle('active', st.grid); updateGrid(); };
      A.$('#dExport', el).onclick = () => {
        if (!st.strokes.length) return A.toast('Pano boş', 'err');
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        st.strokes.forEach((s) => { const b = bbox(s); x1 = Math.min(x1, b[0]); y1 = Math.min(y1, b[1]); x2 = Math.max(x2, b[2]); y2 = Math.max(y2, b[3]); });
        const pad = 40, scale = 2;
        const c = document.createElement('canvas');
        c.width = (x2 - x1 + pad * 2) * scale; c.height = (y2 - y1 + pad * 2) * scale;
        const cx = c.getContext('2d');
        cx.fillStyle = getComputedStyle(stage).backgroundColor || '#151821';
        cx.fillRect(0, 0, c.width, c.height);
        cx.setTransform(scale, 0, 0, scale, (pad - x1) * scale, (pad - y1) * scale);
        st.strokes.forEach((s) => drawStroke(cx, s));
        c.toBlob((b) => A.download(board.name + '.png', b));
      };
      const clr = A.$('#dClear', el);
      if (clr) clr.onclick = async () => { if (await A.confirm('Panodaki tüm çizimler herkes için silinecek.', { ok: 'Temizle' })) sock.emit('draw:clear', { boardId: board.id }); };

      // props
      const setColor = (c) => {
        st.color = c; A.$('#dColor', el).value = c;
        A.$$('.swatches button', el).forEach((b) => b.classList.toggle('on', b.dataset.c === c));
        if (st.selected) { const s = st.strokes.find((x) => x.id === st.selected); if (s && s.type !== 'image') updateStroke(s, { color: c }); }
      };
      A.$$('.swatches button', el).forEach((b) => (b.onclick = () => setColor(b.dataset.c)));
      A.$('#dColor', el).oninput = (e) => setColor(e.target.value);
      A.$('#dSize', el).oninput = (e) => { st.size = +e.target.value; A.$('#dSizeV', el).textContent = st.size; };
      A.$('#dOp', el).oninput = (e) => { st.opacity = e.target.value / 100; };
      A.$('#dFill', el).onchange = (e) => { st.fill = e.target.checked; };
      setColor(st.color);
      setTool(canDraw ? 'pen' : 'hand');

      const onKey = (e) => {
        if (e.target.closest('input,textarea,select') || A.$('.modal-back')) return;
        if (e.code === 'Space') { spaceDown = true; stage.classList.add('space'); e.preventDefault(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
        if ((e.key === 'Delete' || e.key === 'Backspace') && st.selected) { const s = st.strokes.find((x) => x.id === st.selected); if (s) removeStrokes([s]); return; }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const t = TOOLS.find((x) => x[3] === e.key.toLowerCase());
        if (t && (canDraw || ['select', 'hand'].includes(t[0]))) setTool(t[0]);
      };
      const onKeyUp = (e) => { if (e.code === 'Space') { spaceDown = false; stage.classList.remove('space'); } };
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKeyUp);

      // ------------------------------------------------------------- cursors of others
      const cursors = new Map();
      const updateCursors = () => {
        cursors.forEach((c) => { c.el.style.transform = `translate(${c.x * st.zoom + st.panX}px, ${c.y * st.zoom + st.panY}px)`; });
      };
      const drawPeople = () => {
        const box = A.$('#dPeople', el);
        if (box) { box.innerHTML = [...cursors.values()].map((c) => A.avatar(c.userId, 'xs')).join(''); }
      };
      A.viewOn('draw:cursor', (d) => {
        let c = cursors.get(d.userId);
        if (!c) {
          const ce = A.h(`<div class="rcursor" style="--c:${A.esc(d.color || '#9b87f5')}"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 2l7 19 2.5-8.5L21 10z" fill="var(--c)" stroke="#fff" stroke-width="1.5"/></svg><span>${A.esc(d.name)}</span></div>`);
          overlay.appendChild(ce);
          c = { el: ce, userId: d.userId };
          cursors.set(d.userId, c);
          drawPeople();
        }
        c.x = d.x; c.y = d.y; c.t = Date.now();
        updateCursors();
      });
      A.viewInterval(() => { const now = Date.now(); cursors.forEach((c, k) => { if (now - c.t > 8000) { c.el.remove(); cursors.delete(k); drawPeople(); } }); }, 3000);

      A.viewOn('draw:stroke', (d) => { if (d.boardId === board.id) { st.strokes.push(d.stroke); dirty = true; } });
      A.viewOn('draw:update', (d) => { if (d.boardId !== board.id) return; const i = st.strokes.findIndex((s) => s.id === d.stroke.id); if (i >= 0) st.strokes[i] = d.stroke; dirty = true; });
      A.viewOn('draw:remove', (d) => { if (d.boardId !== board.id) return; const ids = new Set(d.ids); st.strokes = st.strokes.filter((s) => !ids.has(s.id)); dirty = true; });
      A.viewOn('draw:clear', (d) => { if (d.boardId !== board.id) return; st.strokes = []; undoStack.length = 0; redoStack.length = 0; dirty = true; A.toast('Pano temizlendi', 'info'); });
      A.viewOn('reconnect', () => loadBoard(board.id));

      // ------------------------------------------------------------- board selection
      const loadBoard = async (id) => {
        const b = await A.col.get('drawings', id);
        board = b;
        A.ls.set('board', b.id);
        st.strokes = b.strokes || [];
        st.selected = null; undoStack.length = 0; redoStack.length = 0;
        A.$('#dBoardName', el).textContent = b.name;
        sock.emit('draw:join', { boardId: b.id });
        fit();
      };
      A.$('#dBoard', el).onclick = (e) => {
        const items = [{ head: 'Panolar' }, ...boards.map((b) => ({ html: `${A.icon('layers')} ${A.esc(b.name)} ${b.id === board.id ? A.icon('check') : ''}`, action: () => loadBoard(b.id) }))];
        if (A.can('create')) items.push('-', { icon: 'plus', label: 'Yeni pano', action: async () => { const n = await A.prompt('Yeni pano adı', { value: 'Yeni Pano' }); if (n) { const b = await A.col.create('drawings', { projectId: A.state.projectId, name: n, strokes: [] }); boards.push(b); loadBoard(b.id); } } });
        if (A.canEdit(board)) items.push({ icon: 'pencil', label: 'Yeniden adlandır', action: async () => { const n = await A.prompt('Pano adı', { value: board.name }); if (n) { await A.col.update('drawings', board.id, { name: n }); board.name = n; boards.find((b) => b.id === board.id).name = n; A.$('#dBoardName', el).textContent = n; } } });
        if (A.canDelete(board) && boards.length > 1) items.push({ icon: 'trash-2', label: 'Panoyu sil', danger: true, action: async () => { if (await A.confirm(`“${board.name}” silinsin mi?`)) { await A.col.remove('drawings', board.id); boards = boards.filter((b) => b.id !== board.id); loadBoard(boards[0].id); } } });
        A.menu(e.currentTarget, items);
      };
      A.viewOn('db:drawings', (p) => {
        if (p.item.projectId !== A.state.projectId) return;
        if (p.action === 'create' && !boards.find((b) => b.id === p.item.id)) boards.push(p.item);
        if (p.action === 'delete') boards = boards.filter((b) => b.id !== p.item.id);
      });

      await loadBoard(board.id);
      updateGrid();
      this.destroy = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('keyup', onKeyUp);
        sock.emit('draw:join', { boardId: null });
      };
    },
  });
})();
