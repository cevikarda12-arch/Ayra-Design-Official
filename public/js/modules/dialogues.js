/* Diyalog Ağacı Editörü — düğüm tabanlı, sürükle-bağla, oynatma modu */
(function () {
  const NODE_W = 260;
  A.register('dialogues', {
    title: 'Diyalog Editörü', icon: 'git-branch', group: 'tasarim', full: true,
    async render(el, [openId]) {
      if (A.needProject(el)) return;
      let dlgs = await A.col.project('dialogues');
      const chars = (await A.col.project('entities')).filter((e) => ['character', 'npc', 'enemy'].includes(e.type)).map((e) => e.name);
      let dg = null;
      const view = { x: 40, y: 40, z: 1 };
      el.innerHTML = `<div class="lvl">
        <aside class="lvl-side">
          <div class="row" style="padding:12px 12px 6px"><b>Diyaloglar</b><span class="spacer"></span>${A.can('create') ? `<button class="btn xs primary" id="gNew">${A.icon('plus')}</button>` : ''}</div>
          <div class="lvl-list" id="gList"></div>
          <div style="padding:12px" class="small muted">💡 Bir seçeneğin sağındaki <b>●</b> noktasını başka bir düğüme sürükleyerek bağlayın. Boş alana bırakırsanız yeni düğüm oluşur.</div>
        </aside>
        <section class="lvl-main">
          <div class="draw-top"><b id="gName"></b><span class="small muted" id="gInfo"></span><span class="spacer"></span>
            <button class="btn sm" id="gAdd">${A.icon('plus')} Düğüm</button>
            <button class="btn sm" id="gFit">${A.icon('scan')} Ortala</button>
            <button class="btn sm" id="gMore">${A.icon('more-horizontal')}</button>
            <button class="btn sm primary" id="gPlay">${A.icon('play')} Oynat</button></div>
          <div class="dg-stage" id="gStage"><div class="dg-world" id="gWorld"><svg class="dg-links" id="gLinks"></svg><div id="gNodes"></div></div></div>
        </section></div>`;
      A.icons(el);
      const stage = A.$('#gStage', el), world = A.$('#gWorld', el), svg = A.$('#gLinks', el), nodesEl = A.$('#gNodes', el);
      const editable = () => dg && A.canEdit(dg);
      const save = A.debounce(async () => { if (!dg || !editable()) return; try { await A.col.update('dialogues', dg.id, { nodes: dg.nodes, start: dg.start }); } catch (e) { A.err(e); } }, 700);
      const applyView = () => { world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`; stage.style.backgroundPosition = `${view.x}px ${view.y}px`; stage.style.backgroundSize = `${24 * view.z}px ${24 * view.z}px`; };

      const drawList = () => {
        const box = A.$('#gList', el);
        box.innerHTML = dlgs.map((d) => `<div class="note-item ${dg && dg.id === d.id ? 'on' : ''}" data-id="${d.id}"><b class="ell">${A.esc(d.name)}</b><div class="small muted">${(d.nodes || []).length} düğüm · ${A.timeAgo(d.updatedAt)}</div></div>`).join('') || '<p class="small muted" style="padding:0 12px">Henüz diyalog yok.</p>';
        A.$$('[data-id]', box).forEach((d) => (d.onclick = () => open(d.dataset.id)));
      };

      const nodeById = (id) => dg.nodes.find((n) => n.id === id);
      const drawNodes = () => {
        if (!dg) { nodesEl.innerHTML = ''; svg.innerHTML = ''; return; }
        const ed = editable();
        nodesEl.innerHTML = dg.nodes.map((n) => `<div class="dnode ${dg.start === n.id ? 'start' : ''} ${n.type === 'end' ? 'end' : ''}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${NODE_W}px">
          <div class="dn-head" data-draghandle>${dg.start === n.id ? `<span class="badge green">BAŞLANGIÇ</span>` : ''}
            <input class="dn-speaker" list="gChars" value="${A.esc(n.speaker || '')}" placeholder="Konuşan" ${ed ? '' : 'readonly'}>
            ${ed ? `<button class="btn xs ghost" data-menu>${A.icon('more-vertical')}</button>` : ''}</div>
          <textarea class="dn-text" rows="3" placeholder="Diyalog metni..." ${ed ? '' : 'readonly'}>${A.esc(n.text || '')}</textarea>
          <div class="dn-choices">${(n.choices || []).map((c, i) => `<div class="dn-choice"><span class="small muted">${i + 1}.</span><input value="${A.esc(c.text)}" data-ci="${i}" placeholder="Seçenek metni" ${ed ? '' : 'readonly'}>${ed ? `<button class="btn xs ghost" data-rmc="${i}">${A.icon('x')}</button>` : ''}<span class="port ${c.target ? 'on' : ''}" data-port="${i}" title="Bağlamak için sürükle"></span></div>`).join('')}
            ${!(n.choices || []).length && n.type !== 'end' ? `<div class="dn-choice next"><span class="small muted grow">Devam →</span><span class="port ${n.next ? 'on' : ''}" data-port="next"></span></div>` : ''}
          </div>
          ${ed && n.type !== 'end' ? `<button class="btn xs ghost block" data-addc>${A.icon('plus')} Seçenek ekle</button>` : ''}
        </div>`).join('') + `<datalist id="gChars">${chars.map((c) => `<option value="${A.esc(c)}">`).join('')}</datalist>`;
        A.icons(nodesEl);
        A.$$('.dnode', nodesEl).forEach((ne) => {
          const n = nodeById(ne.dataset.id);
          if (ed) {
            A.drag(ne, {
              handle: A.$('.dn-head', ne),
              onStart: (e) => { if (e.target.closest('input,button')) return false; return { x: n.x, y: n.y }; },
              onMove: (e, dx, dy, s) => { n.x = Math.round(s.x + dx / view.z); n.y = Math.round(s.y + dy / view.z); ne.style.left = n.x + 'px'; ne.style.top = n.y + 'px'; drawLinks(); },
              onEnd: () => save(),
            });
          }
          A.$('.dn-speaker', ne).oninput = (e) => { n.speaker = e.target.value; save(); };
          A.$('.dn-text', ne).oninput = (e) => { n.text = e.target.value; save(); drawLinks(); };
          A.$$('[data-ci]', ne).forEach((inp) => (inp.oninput = () => { n.choices[inp.dataset.ci].text = inp.value; save(); }));
          A.$$('[data-rmc]', ne).forEach((b) => (b.onclick = () => { n.choices.splice(+b.dataset.rmc, 1); drawNodes(); save(); }));
          const ac = A.$('[data-addc]', ne);
          if (ac) ac.onclick = () => { n.choices = n.choices || []; n.choices.push({ text: '', target: n.choices.length ? null : n.next || null }); n.next = null; drawNodes(); save(); };
          const mb = A.$('[data-menu]', ne);
          if (mb) mb.onclick = (e) => A.menu(e.currentTarget, [
            { icon: 'flag', label: 'Başlangıç düğümü yap', action: () => { dg.start = n.id; drawNodes(); save(); } },
            { icon: n.type === 'end' ? 'circle-dot' : 'circle-x', label: n.type === 'end' ? 'Normal düğüm yap' : 'Bitiş düğümü yap', action: () => { n.type = n.type === 'end' ? 'line' : 'end'; if (n.type === 'end') { n.choices = []; n.next = null; } drawNodes(); save(); } },
            { icon: 'copy', label: 'Çoğalt', action: () => { const c = { ...JSON.parse(JSON.stringify(n)), id: A.uid(), x: n.x + 30, y: n.y + 30 }; dg.nodes.push(c); drawNodes(); save(); } },
            { icon: 'unlink', label: 'Bağlantıları kaldır', action: () => { n.next = null; (n.choices || []).forEach((c) => (c.target = null)); drawNodes(); save(); } },
            '-',
            { icon: 'trash-2', label: 'Düğümü sil', danger: true, action: () => removeNode(n.id) },
          ]);
          if (ed) A.$$('[data-port]', ne).forEach((p) => p.addEventListener('pointerdown', (e) => startConnect(e, n, p.dataset.port)));
        });
        drawLinks();
        A.$('#gInfo', el).textContent = ` · ${dg.nodes.length} düğüm`;
      };
      const removeNode = (id) => {
        dg.nodes = dg.nodes.filter((x) => x.id !== id);
        dg.nodes.forEach((x) => { if (x.next === id) x.next = null; (x.choices || []).forEach((c) => { if (c.target === id) c.target = null; }); });
        if (dg.start === id) dg.start = dg.nodes[0] ? dg.nodes[0].id : null;
        drawNodes(); save();
      };
      const portPos = (nodeId, port) => {
        const ne = A.$(`.dnode[data-id="${nodeId}"]`, nodesEl);
        const p = ne && A.$(`[data-port="${port}"]`, ne);
        if (!p) return null;
        const n = nodeById(nodeId);
        const nr = ne.getBoundingClientRect(), pr = p.getBoundingClientRect();
        return [n.x + (pr.left + pr.width / 2 - nr.left) / view.z, n.y + (pr.top + pr.height / 2 - nr.top) / view.z];
      };
      const inPos = (nodeId) => { const n = nodeById(nodeId); return n ? [n.x, n.y + 22] : null; };
      const curve = (a, b, cls = '') => { const dx = Math.max(60, Math.abs(b[0] - a[0]) / 2); return `<path class="${cls}" d="M${a[0]},${a[1]} C${a[0] + dx},${a[1]} ${b[0] - dx},${b[1]} ${b[0]},${b[1]}"/>`; };
      let tempLink = null;
      const drawLinks = () => {
        if (!dg) return;
        let html = '<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#9b87f5"/></marker></defs>';
        dg.nodes.forEach((n) => {
          (n.choices || []).forEach((c, i) => { if (c.target && nodeById(c.target)) { const a = portPos(n.id, i), b = inPos(c.target); if (a && b) html += curve(a, b); } });
          if (n.next && nodeById(n.next) && !(n.choices || []).length) { const a = portPos(n.id, 'next'), b = inPos(n.next); if (a && b) html += curve(a, b); }
        });
        if (tempLink) html += curve(tempLink[0], tempLink[1], 'temp');
        svg.innerHTML = html;
      };
      const toWorld = (cx, cy) => { const r = stage.getBoundingClientRect(); return [(cx - r.left - view.x) / view.z, (cy - r.top - view.y) / view.z]; };
      const startConnect = (e, n, port) => {
        e.preventDefault(); e.stopPropagation();
        const a = portPos(n.id, port);
        const move = (ev) => { tempLink = [a, toWorld(ev.clientX, ev.clientY)]; drawLinks(); };
        const up = (ev) => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
          tempLink = null;
          const targetEl = document.elementFromPoint(ev.clientX, ev.clientY);
          const tn = targetEl && targetEl.closest('.dnode');
          let targetId = tn ? tn.dataset.id : null;
          if (targetId === n.id) targetId = null;
          if (!tn && stage.contains(targetEl)) {
            const [x, y] = toWorld(ev.clientX, ev.clientY);
            const nn = { id: A.uid(), speaker: n.speaker || '', text: '', x: Math.round(x), y: Math.round(y - 20), choices: [] };
            dg.nodes.push(nn); targetId = nn.id;
          }
          if (targetId) { if (port === 'next') n.next = targetId; else n.choices[+port].target = targetId; save(); }
          drawNodes();
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      };

      // pan & zoom
      stage.addEventListener('pointerdown', (e) => {
        if (e.target !== stage && e.target !== world && e.target !== svg && e.target.tagName !== 'path') return;
        const sx = e.clientX, sy = e.clientY, vx = view.x, vy = view.y;
        stage.classList.add('panning');
        const move = (ev) => { view.x = vx + ev.clientX - sx; view.y = vy + ev.clientY - sy; applyView(); };
        const up = () => { stage.classList.remove('panning'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      });
      stage.addEventListener('wheel', (e) => {
        if (e.target.closest('textarea')) return;
        e.preventDefault();
        const r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        const nz = A.clamp(view.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 0.25, 2);
        view.x = mx - ((mx - view.x) * nz) / view.z; view.y = my - ((my - view.y) * nz) / view.z; view.z = nz;
        applyView();
      }, { passive: false });
      const fit = () => {
        if (!dg || !dg.nodes.length) { view.x = 40; view.y = 40; view.z = 1; return applyView(); }
        const xs = dg.nodes.map((n) => n.x), ys = dg.nodes.map((n) => n.y);
        const x1 = Math.min(...xs), y1 = Math.min(...ys), x2 = Math.max(...xs) + NODE_W, y2 = Math.max(...ys) + 200;
        view.z = A.clamp(Math.min((stage.clientWidth - 80) / (x2 - x1), (stage.clientHeight - 80) / (y2 - y1)), 0.3, 1);
        view.x = (stage.clientWidth - (x2 - x1) * view.z) / 2 - x1 * view.z; view.y = 40 - y1 * view.z;
        applyView();
      };
      A.$('#gFit', el).onclick = fit;
      A.$('#gAdd', el).onclick = () => {
        if (!dg || !editable()) return;
        const [x, y] = toWorld(stage.getBoundingClientRect().left + stage.clientWidth / 2 - 130, stage.getBoundingClientRect().top + 80);
        dg.nodes.push({ id: A.uid(), speaker: '', text: '', x: Math.round(x), y: Math.round(y), choices: [] });
        if (!dg.start) dg.start = dg.nodes[0].id;
        drawNodes(); save();
      };
      A.$('#gMore', el).onclick = (e) => {
        if (!dg) return;
        A.menu(e.currentTarget, [
          ...(editable() ? [{ icon: 'pencil', label: 'Yeniden adlandır', action: async () => { const n = await A.prompt('Diyalog adı', { value: dg.name }); if (n) { dg.name = n; await A.col.update('dialogues', dg.id, { name: n }); A.$('#gName', el).textContent = n; drawList(); } } }] : []),
          { icon: 'download', label: 'JSON olarak indir', action: () => A.download(dg.name + '.json', JSON.stringify({ name: dg.name, start: dg.start, nodes: dg.nodes.map(({ id, speaker, text, choices, next, type }) => ({ id, speaker, text, choices, next, type })) }, null, 2)) },
          { icon: 'file-text', label: 'Senaryo metni olarak indir', action: () => A.download(dg.name + '.txt', script()) },
          ...(A.canDelete(dg) ? ['-', { icon: 'trash-2', label: 'Diyaloğu sil', danger: true, action: async () => { if (await A.confirm(`“${dg.name}” silinsin mi?`)) A.col.remove('dialogues', dg.id).catch(A.err); } }] : []),
        ], { align: 'right' });
      };
      const script = () => {
        const seen = new Set(); let out = `${dg.name}\n${'='.repeat(dg.name.length)}\n\n`;
        const walk = (id, depth) => {
          const n = nodeById(id); if (!n || seen.has(id)) { if (n) out += '  '.repeat(depth) + `(→ ${n.speaker}: "${(n.text || '').slice(0, 30)}...")\n`; return; }
          seen.add(id);
          out += '  '.repeat(depth) + `${n.speaker || '???'}: ${n.text}\n`;
          if ((n.choices || []).length) n.choices.forEach((c, i) => { out += '  '.repeat(depth + 1) + `[${i + 1}] ${c.text}\n`; if (c.target) walk(c.target, depth + 2); });
          else if (n.next) walk(n.next, depth);
        };
        if (dg.start) walk(dg.start, 0);
        return out;
      };

      // play mode
      A.$('#gPlay', el).onclick = () => {
        if (!dg || !dg.start) return A.toast('Önce bir başlangıç düğümü oluşturun', 'err');
        const m = A.modal({ title: 'Diyalog Önizleme', icon: 'play', size: 'wide', foot: false, body: '<div class="dplay" id="dpBox"></div>' });
        const box = A.$('#dpBox', m.el);
        let timer;
        const show = (id) => {
          clearInterval(timer);
          const n = nodeById(id);
          if (!n) { box.innerHTML = `<div class="dp-end">— Diyalog sona erdi —</div><button class="btn primary" id="dpRe">${A.icon('refresh-cw')} Baştan oynat</button>`; A.icons(box); A.$('#dpRe', box).onclick = () => show(dg.start); return; }
          box.innerHTML = `<div class="dp-scene"><div class="dp-portrait">${A.esc(A.initials(n.speaker || '?'))}</div><div class="dp-bubble"><b>${A.esc(n.speaker || '???')}</b><p id="dpText"></p></div></div><div class="dp-choices" id="dpCh"></div>`;
          const t = A.$('#dpText', box), full = n.text || '...';
          let i = 0;
          const showChoices = () => {
            const ch = A.$('#dpCh', box);
            if ((n.choices || []).length) ch.innerHTML = n.choices.map((c, k) => `<button class="btn" data-k="${k}">${k + 1}. ${A.esc(c.text || '...')}</button>`).join('');
            else ch.innerHTML = `<button class="btn primary" data-next>${n.type === 'end' || !n.next ? 'Bitir' : 'Devam ▸'}</button>`;
            A.$$('[data-k]', ch).forEach((b) => (b.onclick = () => show(n.choices[+b.dataset.k].target)));
            const nx = A.$('[data-next]', ch); if (nx) nx.onclick = () => show(n.type === 'end' ? null : n.next);
          };
          timer = setInterval(() => { i++; t.textContent = full.slice(0, i); if (i >= full.length) { clearInterval(timer); showChoices(); } }, 22);
          box.onclick = (e) => { if (!e.target.closest('button') && i < full.length) { i = full.length; t.textContent = full; clearInterval(timer); showChoices(); } };
        };
        show(dg.start);
      };

      const nb = A.$('#gNew', el);
      if (nb) nb.onclick = async () => {
        const name = await A.prompt('Yeni diyalog adı', { value: 'Yeni diyalog' });
        if (!name) return;
        const first = { id: A.uid(), speaker: chars[0] || 'Karakter', text: 'Merhaba!', x: 60, y: 80, choices: [] };
        try { const d = await A.col.create('dialogues', { projectId: A.state.projectId, name, nodes: [first], start: first.id }); if (!dlgs.find((x) => x.id === d.id)) dlgs.push(d); open(d.id); } catch (e) { A.err(e); }
      };
      const open = (id) => {
        save.flush();
        dg = dlgs.find((d) => d.id === id) || dlgs[0] || null;
        if (dg) dg.nodes = dg.nodes || [];
        A.$('#gName', el).textContent = dg ? dg.name : 'Diyalog yok';
        drawList(); drawNodes(); fit();
      };
      A.viewOn('db:dialogues', (p) => {
        if (p.item.projectId !== A.state.projectId) return;
        if (p.action === 'delete') { dlgs = dlgs.filter((d) => d.id !== p.item.id); if (dg && dg.id === p.item.id) open(dlgs[0] && dlgs[0].id); else drawList(); return; }
        const i = dlgs.findIndex((d) => d.id === p.item.id);
        if (i < 0) { dlgs.push(p.item); drawList(); return; }
        if (p.by === A.state.user.id) return;
        dlgs[i] = p.item;
        if (dg && dg.id === p.item.id && !el.contains(document.activeElement)) { dg = p.item; drawNodes(); }
        drawList();
      });
      applyView();
      open(openId || (dlgs[0] && dlgs[0].id));
      this.destroy = () => save.flush();
    },
  });
})();
