/* Seviye Editörü — tile tabanlı harita editörü + oynanabilir test modu */
(function () {
  const GROUND = {
    grass: ['Çimen', '#4caf50', ''], dirt: ['Toprak', '#8d6e63', ''], sand: ['Kum', '#e6c88a', ''], stone: ['Taş zemin', '#90a4ae', ''],
    water: ['Su', '#2f80ed', '≈', 'block'], lava: ['Lav', '#ff5722', '♨', 'hurt'], ice: ['Buz', '#b3e5fc', '', 'slide'], wood: ['Tahta', '#a1724e', ''],
    wall: ['Duvar', '#37474f', '▦', 'block'], snow: ['Kar', '#eceff1', ''], swamp: ['Bataklık', '#556b2f', '~'], void: ['Boşluk', '#0b0c10', '', 'hurt'],
  };
  const OBJECTS = {
    spawn: ['Başlangıç', '🟢'], goal: ['Bitiş', '🏁'], enemy: ['Düşman', '👾'], coin: ['Altın', '🪙'], chest: ['Sandık', '🎁'], key: ['Anahtar', '🔑'],
    door: ['Kapı', '🚪', 'door'], trap: ['Tuzak', '⚠️', 'hurt'], npc: ['NPC', '🧙'], tree: ['Ağaç', '🌲', 'block'], rock: ['Kaya', '🪨', 'block'],
    heart: ['Can', '❤️'], torch: ['Meşale', '🔥'], sign: ['Tabela', '🪧'], boss: ['Boss', '🐉'], checkpoint: ['Kontrol Noktası', '🚩'],
  };
  const TOOLS = [['paint', 'brush', 'Fırça'], ['rect', 'square', 'Dikdörtgen'], ['fill', 'paint-bucket', 'Doldur'], ['erase', 'eraser', 'Sil'], ['pick', 'pipette', 'Damlalık']];

  A.register('levels', {
    title: 'Seviye Editörü', icon: 'map', group: 'tasarim', full: true,
    async render(el, [openId]) {
      if (A.needProject(el)) return;
      let levels = await A.col.project('levels');
      let lv = null;
      const st = { layer: 'ground', tile: 'grass', obj: 'spawn', tool: 'paint', zoom: 1, grid: true, play: null };
      el.innerHTML = `<div class="lvl">
        <aside class="lvl-side">
          <div class="row" style="padding:12px 12px 6px"><b>Seviyeler</b><span class="spacer"></span>${A.can('create') ? `<button class="btn xs primary" id="lNew">${A.icon('plus')}</button>` : ''}</div>
          <div class="lvl-list" id="lList"></div>
          <div class="lvl-pal">
            <div class="seg" style="width:100%;margin-bottom:8px"><button data-ly="ground" class="grow">Zemin</button><button data-ly="objects" class="grow">Nesneler</button></div>
            <div class="tiles" id="lTiles"></div>
          </div>
        </aside>
        <section class="lvl-main">
          <div class="draw-top">
            <b id="lName"></b><span class="small muted" id="lInfo"></span><span class="spacer"></span>
            <div class="seg" id="lTools">${TOOLS.map(([k, ic, t]) => `<button data-tool="${k}" title="${t}">${A.icon(ic)}</button>`).join('')}</div>
            <div class="seg"><button id="lZo">${A.icon('zoom-out')}</button><button id="lZi">${A.icon('zoom-in')}</button></div>
            <button class="btn icon sm active" id="lGrid" title="Izgara">${A.icon('grid-3x3')}</button>
            <button class="btn sm" id="lMore">${A.icon('more-horizontal')}</button>
            <button class="btn sm primary" id="lPlay">${A.icon('play')} Test Et</button>
          </div>
          <div class="lvl-stage" id="lStage"><canvas id="lCanvas"></canvas><div class="lvl-hud hidden" id="lHud"></div></div>
        </section></div>`;
      A.icons(el);
      const canvas = A.$('#lCanvas', el), ctx = canvas.getContext('2d'), stage = A.$('#lStage', el);
      const editable = () => lv && A.canEdit(lv);

      const drawList = () => {
        const box = A.$('#lList', el);
        box.innerHTML = levels.map((l) => `<div class="note-item ${lv && lv.id === l.id ? 'on' : ''}" data-id="${l.id}"><b class="ell">${A.esc(l.name)}</b><div class="small muted">${l.width}×${l.height} · ${A.timeAgo(l.updatedAt)}</div></div>`).join('') || '<p class="small muted" style="padding:0 12px">Henüz seviye yok.</p>';
        A.$$('[data-id]', box).forEach((d) => (d.onclick = () => open(d.dataset.id)));
      };
      const drawTiles = () => {
        const box = A.$('#lTiles', el);
        const set = st.layer === 'ground' ? GROUND : OBJECTS;
        const sel = st.layer === 'ground' ? st.tile : st.obj;
        box.innerHTML = Object.entries(set).map(([k, v]) => `<button class="tile-btn ${sel === k ? 'on' : ''}" data-k="${k}" title="${v[0]}"><span style="${st.layer === 'ground' ? `background:${v[1]}` : ''}">${st.layer === 'ground' ? (v[2] || '') : v[1]}</span><small>${v[0]}</small></button>`).join('');
        A.$$('[data-k]', box).forEach((b) => (b.onclick = () => { if (st.layer === 'ground') st.tile = b.dataset.k; else st.obj = b.dataset.k; if (st.tool === 'erase' || st.tool === 'pick') setTool('paint'); drawTiles(); }));
        A.$$('[data-ly]', el).forEach((b) => b.classList.toggle('on', b.dataset.ly === st.layer));
      };
      A.$$('[data-ly]', el).forEach((b) => (b.onclick = () => { st.layer = b.dataset.ly; drawTiles(); }));
      const setTool = (t) => { st.tool = t; A.$$('#lTools button', el).forEach((b) => b.classList.toggle('on', b.dataset.tool === t)); };
      A.$$('#lTools button', el).forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
      setTool('paint');

      const ts = () => Math.round((lv.tileSize || 32) * st.zoom);
      const draw = () => {
        if (!lv) return;
        const T = ts();
        canvas.width = lv.width * T; canvas.height = lv.height * T;
        ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const g = lv.layers.ground || {}, o = lv.layers.objects || {};
        for (let y = 0; y < lv.height; y++) for (let x = 0; x < lv.width; x++) {
          const t = GROUND[g[x + ',' + y]];
          if (t) {
            ctx.fillStyle = t[1]; ctx.fillRect(x * T, y * T, T, T);
            // basit doku
            ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x * T, y * T, T, 2);
            ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x * T, y * T + T - 2, T, 2);
            if (t[2]) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = `${T * 0.5}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t[2], x * T + T / 2, y * T + T / 2); }
          }
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `${T * 0.7}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
        for (const [k, id] of Object.entries(o)) {
          if (st.play && st.play.taken.has(k)) continue;
          const [x, y] = k.split(',').map(Number);
          const ob = OBJECTS[id];
          if (ob) ctx.fillText(ob[1], x * T + T / 2, y * T + T / 2 + 1);
        }
        if (st.grid && !st.play) {
          ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 0; x <= lv.width; x++) { ctx.moveTo(x * T + 0.5, 0); ctx.lineTo(x * T + 0.5, canvas.height); }
          for (let y = 0; y <= lv.height; y++) { ctx.moveTo(0, y * T + 0.5); ctx.lineTo(canvas.width, y * T + 0.5); }
          ctx.stroke();
        }
        if (st.preview) {
          const [x1, y1, x2, y2] = st.preview;
          ctx.fillStyle = 'rgba(155,135,245,.35)'; ctx.strokeStyle = '#9b87f5';
          ctx.fillRect(Math.min(x1, x2) * T, Math.min(y1, y2) * T, (Math.abs(x2 - x1) + 1) * T, (Math.abs(y2 - y1) + 1) * T);
        }
        if (st.hover && !st.play) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(st.hover[0] * T + 1, st.hover[1] * T + 1, T - 2, T - 2); }
        if (st.play) {
          const p = st.play;
          ctx.font = `${T * 0.8}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
          ctx.fillText('🧑', p.x * T + T / 2, p.y * T + T / 2 + 1);
          // sis efekti
          const grd = ctx.createRadialGradient(p.x * T + T / 2, p.y * T + T / 2, T * 2, p.x * T + T / 2, p.y * T + T / 2, T * 7);
          grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.55)');
          ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        const objs = Object.values(o);
        A.$('#lInfo', el).textContent = ` · ${lv.width}×${lv.height} · ${objs.filter((x) => x === 'enemy').length} düşman · ${objs.filter((x) => x === 'coin').length} altın`;
      };

      const cell = (e) => { const r = canvas.getBoundingClientRect(); const T = ts(); return [Math.floor((e.clientX - r.left) / T), Math.floor((e.clientY - r.top) / T)]; };
      const inB = (x, y) => x >= 0 && y >= 0 && x < lv.width && y < lv.height;
      const setCell = (x, y, erase = false) => {
        if (!inB(x, y)) return;
        const layer = lv.layers[st.layer] || (lv.layers[st.layer] = {});
        const k = x + ',' + y;
        if (erase) delete layer[k];
        else {
          const v = st.layer === 'ground' ? st.tile : st.obj;
          if (st.layer === 'objects' && (v === 'spawn' || v === 'goal')) for (const kk of Object.keys(layer)) if (layer[kk] === v) delete layer[kk];
          layer[k] = v;
        }
      };
      const fill = (x, y) => {
        const layer = lv.layers[st.layer] || (lv.layers[st.layer] = {});
        const target = layer[x + ',' + y];
        const v = st.layer === 'ground' ? st.tile : st.obj;
        if (target === v) return;
        const q = [[x, y]], seen = new Set();
        while (q.length) {
          const [cx, cy] = q.pop();
          const k = cx + ',' + cy;
          if (!inB(cx, cy) || seen.has(k) || layer[k] !== target) continue;
          seen.add(k); layer[k] = v;
          q.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
          if (seen.size > 20000) break;
        }
      };
      const history = [];
      const snapshot = () => { history.push(JSON.stringify(lv.layers)); if (history.length > 50) history.shift(); };
      let lvDirty = false;
      const markSave = () => { lvDirty = true; save(); };
      const save = A.debounce(async () => { if (!lv || !lvDirty) return; lvDirty = false; try { await A.col.update('levels', lv.id, { layers: lv.layers, width: lv.width, height: lv.height }); } catch (e) { A.err(e); } }, 800);

      let painting = null;
      canvas.addEventListener('pointerdown', (e) => {
        if (!lv || st.play || !editable()) return;
        const [x, y] = cell(e);
        if (!inB(x, y)) return;
        canvas.setPointerCapture(e.pointerId);
        if (st.tool === 'pick') {
          const layer = lv.layers[st.layer] || {};
          const v = layer[x + ',' + y];
          if (v) { if (st.layer === 'ground') st.tile = v; else st.obj = v; drawTiles(); setTool('paint'); }
          return;
        }
        snapshot();
        if (st.tool === 'fill') { fill(x, y); draw(); markSave(); return; }
        if (st.tool === 'rect') { painting = { rect: [x, y] }; st.preview = [x, y, x, y]; draw(); return; }
        painting = { erase: st.tool === 'erase' || e.button === 2 };
        setCell(x, y, painting.erase); draw();
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('pointermove', (e) => {
        if (!lv || st.play) return;
        const [x, y] = cell(e);
        st.hover = inB(x, y) ? [x, y] : null;
        if (painting && painting.rect) st.preview = [painting.rect[0], painting.rect[1], x, y];
        else if (painting) setCell(x, y, painting.erase);
        draw();
      });
      canvas.addEventListener('pointerleave', () => { st.hover = null; draw(); });
      canvas.addEventListener('pointerup', () => {
        if (!painting) return;
        if (painting.rect && st.preview) {
          const [x1, y1, x2, y2] = st.preview;
          for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) setCell(x, y, false);
          st.preview = null;
        }
        painting = null; draw(); markSave();
      });

      A.$('#lZi', el).onclick = () => { st.zoom = Math.min(3, st.zoom * 1.25); draw(); };
      A.$('#lZo', el).onclick = () => { st.zoom = Math.max(0.3, st.zoom / 1.25); draw(); };
      A.$('#lGrid', el).onclick = (e) => { st.grid = !st.grid; e.currentTarget.classList.toggle('active', st.grid); draw(); };
      A.$('#lMore', el).onclick = (e) => {
        if (!lv) return;
        A.menu(e.currentTarget, [
          { icon: 'undo-2', label: 'Geri al (Ctrl+Z)', action: undo },
          ...(editable() ? [
            { icon: 'pencil', label: 'Yeniden adlandır', action: async () => { const n = await A.prompt('Seviye adı', { value: lv.name }); if (n) { lv.name = n; await A.col.update('levels', lv.id, { name: n }); A.$('#lName', el).textContent = n; drawList(); } } },
            { icon: 'maximize-2', label: 'Boyutu değiştir', action: resize },
            { icon: 'trash-2', label: 'Tüm haritayı temizle', action: async () => { if (await A.confirm('Harita temizlensin mi?')) { snapshot(); lv.layers = { ground: {}, objects: {} }; draw(); markSave(); } } },
          ] : []),
          '-',
          { icon: 'image', label: 'PNG olarak indir', action: () => { const g = st.grid; st.grid = false; draw(); canvas.toBlob((b) => A.download(lv.name + '.png', b)); st.grid = g; draw(); } },
          { icon: 'download', label: 'JSON olarak indir (motor için)', action: () => A.download(lv.name + '.json', JSON.stringify(exportJson(), null, 2)) },
          ...(A.canDelete(lv) ? ['-', { icon: 'trash-2', label: 'Seviyeyi sil', danger: true, action: async () => { if (await A.confirm(`“${lv.name}” silinsin mi?`)) await A.col.remove('levels', lv.id).catch(A.err); } }] : []),
        ], { align: 'right' });
      };
      const exportJson = () => {
        const grid = [];
        for (let y = 0; y < lv.height; y++) { const row = []; for (let x = 0; x < lv.width; x++) row.push(lv.layers.ground[x + ',' + y] || null); grid.push(row); }
        return { name: lv.name, width: lv.width, height: lv.height, tileSize: lv.tileSize, tiles: grid, objects: Object.entries(lv.layers.objects || {}).map(([k, type]) => { const [x, y] = k.split(',').map(Number); return { type, x, y }; }) };
      };
      const undo = () => { const s = history.pop(); if (s && lv) { lv.layers = JSON.parse(s); draw(); markSave(); } };
      const resize = async () => {
        const r = await A.form({ title: 'Harita boyutu', icon: 'maximize-2', fields: [{ key: 'width', label: 'Genişlik (kare)', type: 'number', value: lv.width, half: true }, { key: 'height', label: 'Yükseklik (kare)', type: 'number', value: lv.height, half: true }] });
        if (!r) return;
        lv.width = A.clamp(r.width || 10, 4, 200); lv.height = A.clamp(r.height || 10, 4, 200);
        for (const layer of Object.values(lv.layers)) for (const k of Object.keys(layer)) { const [x, y] = k.split(',').map(Number); if (x >= lv.width || y >= lv.height) delete layer[k]; }
        draw(); markSave();
      };

      // ------------------------------------------------------------ play mode
      const playBtn = A.$('#lPlay', el);
      playBtn.onclick = () => (st.play ? stopPlay() : startPlay());
      const blocked = (x, y, p) => {
        if (!inB(x, y)) return true;
        const g = GROUND[lv.layers.ground[x + ',' + y]];
        const o = OBJECTS[(lv.layers.objects || {})[x + ',' + y]];
        if (g && g[3] === 'block') return true;
        if (o && o[2] === 'block') return true;
        if (o && o[2] === 'door' && !p.taken.has(x + ',' + y) && p.keys <= 0) { hud('🚪 Kapı kilitli! Bir anahtar bul.'); return true; }
        return false;
      };
      const hud = (msg) => { const h = A.$('#lHud', el); h.innerHTML = `<div class="row" style="gap:14px"><span>❤️ ${st.play.hp}</span><span>🪙 ${st.play.coins}/${st.play.totalCoins}</span><span>🔑 ${st.play.keys}</span><span>⏱️ ${((Date.now() - st.play.t0) / 1000).toFixed(1)} sn</span><span class="spacer"></span><span class="small muted">WASD / Ok tuşları · Esc çıkış</span></div>${msg ? `<div class="hud-msg">${msg}</div>` : ''}`; };
      const startPlay = () => {
        const o = lv.layers.objects || {};
        const sk = Object.keys(o).find((k) => o[k] === 'spawn');
        if (!sk) return A.toast('Önce Nesneler katmanından bir 🟢 Başlangıç noktası yerleştirin.', 'err');
        const [x, y] = sk.split(',').map(Number);
        st.play = { x, y, sx: x, sy: y, hp: 3, coins: 0, keys: 0, totalCoins: Object.values(o).filter((v) => v === 'coin').length, taken: new Set(), t0: Date.now() };
        A.$('#lHud', el).classList.remove('hidden');
        playBtn.innerHTML = `${A.icon('stop-circle')} Durdur`; A.icons(playBtn);
        stage.classList.add('playing');
        hud('Hedefe 🏁 ulaş!');
        draw();
      };
      const stopPlay = () => {
        st.play = null;
        A.$('#lHud', el).classList.add('hidden');
        playBtn.innerHTML = `${A.icon('play')} Test Et`; A.icons(playBtn);
        stage.classList.remove('playing');
        draw();
      };
      const step = (dx, dy) => {
        const p = st.play;
        let nx = p.x + dx, ny = p.y + dy;
        if (blocked(nx, ny, p)) return;
        p.x = nx; p.y = ny;
        // buzda kayma
        let guard = 0;
        while (GROUND[lv.layers.ground[p.x + ',' + p.y]] && GROUND[lv.layers.ground[p.x + ',' + p.y]][3] === 'slide' && !blocked(p.x + dx, p.y + dy, p) && guard++ < 50) { p.x += dx; p.y += dy; }
        const k = p.x + ',' + p.y;
        const g = GROUND[lv.layers.ground[k]];
        const oid = (lv.layers.objects || {})[k];
        let msg = '';
        if (oid && !p.taken.has(k)) {
          if (oid === 'coin') { p.coins++; p.taken.add(k); A.sound('pop'); msg = '🪙 +1 altın'; }
          if (oid === 'key') { p.keys++; p.taken.add(k); A.sound('pop'); msg = '🔑 Anahtar alındı!'; }
          if (oid === 'heart') { p.hp++; p.taken.add(k); msg = '❤️ +1 can'; }
          if (oid === 'chest') { p.taken.add(k); p.coins += 5; msg = '🎁 Sandıktan 5 altın çıktı!'; A.sound('done'); }
          if (oid === 'door') { p.keys--; p.taken.add(k); msg = '🚪 Kapı açıldı'; }
          if (oid === 'checkpoint') { p.sx = p.x; p.sy = p.y; msg = '🚩 Kontrol noktası kaydedildi'; }
          if (oid === 'sign') msg = '🪧 Bir tabela... (diyalog editöründe metin yazabilirsiniz)';
          if (oid === 'npc') msg = '🧙 “Merhaba gezgin!”';
          if (oid === 'enemy' || oid === 'boss' || oid === 'trap') hurt(oid === 'boss' ? 2 : 1, OBJECTS[oid][1] + ' hasar aldın!');
          if (oid === 'goal') { const t = ((Date.now() - p.t0) / 1000).toFixed(1); A.confetti(120); A.sound('done'); A.toast(`Seviye ${t} saniyede tamamlandı! 🪙 ${p.coins} altın`, 'ok', '🏁 Tebrikler!'); stopPlay(); return; }
        }
        if (g && g[3] === 'hurt') hurt(1, g[0] + ' üzerine bastın!');
        if (st.play) { hud(msg); draw(); }
      };
      const hurt = (n, msg) => {
        const p = st.play;
        p.hp -= n;
        A.sound('err');
        stage.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'none' }], { duration: 250 });
        if (p.hp <= 0) { A.toast('Canın bitti! Tekrar dene.', 'err', '💀 Oyun bitti'); stopPlay(); return; }
        p.x = p.sx; p.y = p.sy;
        hud(msg + ' Başlangıca döndün.');
      };
      const onKey = (e) => {
        if (e.target.closest('input,textarea,select') || A.$('.modal-back')) return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !st.play) { e.preventDefault(); undo(); return; }
        if (!st.play) return;
        const map = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
        const k = map[e.key] || map[e.key.toLowerCase()];
        if (k) { e.preventDefault(); step(...k); }
        if (e.key === 'Escape') stopPlay();
      };
      document.addEventListener('keydown', onKey);
      A.viewInterval(() => { if (st.play) hud(); }, 500);

      // ------------------------------------------------------------ level CRUD
      A.$('#lNew', el) && (A.$('#lNew', el).onclick = async () => {
        const r = await A.form({ title: 'Yeni Seviye', icon: 'map', fields: [
          { key: 'name', label: 'Seviye adı', required: true, value: 'Bölüm ' + (levels.length + 1) },
          { key: 'width', label: 'Genişlik', type: 'number', value: 24, half: true }, { key: 'height', label: 'Yükseklik', type: 'number', value: 16, half: true },
          { key: 'fillTile', label: 'Başlangıç zemini', type: 'select', options: Object.entries(GROUND).map(([k, v]) => [k, v[0]]), value: 'grass' },
        ] });
        if (!r) return;
        const w = A.clamp(r.width || 24, 4, 200), h = A.clamp(r.height || 16, 4, 200);
        const ground = {};
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ground[x + ',' + y] = (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? 'wall' : r.fillTile;
        try {
          const l = await A.col.create('levels', { projectId: A.state.projectId, name: r.name, width: w, height: h, tileSize: 32, layers: { ground, objects: {} } });
          if (!levels.find((x) => x.id === l.id)) levels.push(l);
          open(l.id);
        } catch (e) { A.err(e); }
      });
      const open = (id) => {
        if (st.play) stopPlay();
        if (lvDirty) save.flush();
        lv = levels.find((l) => l.id === id) || levels[0] || null;
        history.length = 0;
        drawList();
        if (!lv) { A.$('#lName', el).textContent = 'Seviye yok'; canvas.width = canvas.height = 0; return; }
        lv.layers = lv.layers || { ground: {}, objects: {} };
        A.$('#lName', el).textContent = lv.name;
        const maxW = stage.clientWidth - 40, maxH = stage.clientHeight - 40;
        st.zoom = A.clamp(Math.min(maxW / (lv.width * (lv.tileSize || 32)), maxH / (lv.height * (lv.tileSize || 32))), 0.3, 1.5);
        draw();
      };
      A.viewOn('db:levels', (p) => {
        if (p.item.projectId !== A.state.projectId) return;
        if (p.action === 'delete') { levels = levels.filter((l) => l.id !== p.item.id); if (lv && lv.id === p.item.id) open(levels[0] && levels[0].id); else drawList(); return; }
        const i = levels.findIndex((l) => l.id === p.item.id);
        if (i < 0) { levels.push(p.item); drawList(); return; }
        if (p.by === A.state.user.id) { levels[i].updatedAt = p.item.updatedAt; drawList(); return; }
        levels[i] = p.item;
        if (lv && lv.id === p.item.id && !painting && !st.play) { lv = p.item; draw(); }
        drawList();
      });
      drawTiles();
      open(openId || (levels[0] && levels[0].id));
      this.destroy = () => { document.removeEventListener('keydown', onKey); save.flush(); };
    },
  });
})();
