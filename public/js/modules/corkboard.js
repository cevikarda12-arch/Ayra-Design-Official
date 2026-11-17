/* Mantar Pano — görevler, fotoğraflar ve notlar raptiyeyle asılır; raptiyeler arasına ip gerilir */
(function () {
  const W = 3200, H = 2000;
  const PIN_COLORS = ['#e03131', '#1c7ed6', '#f59f00', '#2f9e44', '#ae3ec9', '#f8f9fa'];
  const YARN = { red: ['Kırmızı', '#d6336c'], blue: ['Mavi', '#1c7ed6'], yellow: ['Sarı', '#f59f00'], green: ['Yeşil', '#2f9e44'], white: ['Beyaz', '#f1f3f5'], black: ['Siyah', '#212529'] };
  const NOTE_COLORS = ['#ffe066', '#b2f2bb', '#a5d8ff', '#fcc2d7', '#ffc078', '#d0bfff'];
  const STATUS = { todo: ['Yapılacak', '#868e96'], progress: ['Devam ediyor', '#4dabf7'], review: ['İncelemede', '#ffa94d'], done: ['Tamamlandı', '#20c997'] };

  A.renderCork = async function (el) {
    let items = [], tasks = [];
    const view = A.ls.get('corkView', { x: 0, y: 0, z: 0.85 });
    let connecting = null; // { from: id }
    let yarn = A.ls.get('corkYarn', 'red');
    const canEdit = A.can('create') || A.can('edit_all');

    el.innerHTML = `<div class="ck">
      <div class="ck-bar">
        ${canEdit ? `<button class="btn sm primary" id="ckTask">${A.icon('check-square')} Görev as</button>
        <button class="btn sm" id="ckImg">${A.icon('image')} Görsel</button>
        <button class="btn sm" id="ckNote">${A.icon('sticky-note')} Not</button>
        <span class="ck-sep"></span>
        <button class="btn sm" id="ckYarn" title="İp rengi">${A.icon('spline')} İp <i class="ck-yarn-dot"></i></button>` : ''}
        <span class="ck-hint small muted" id="ckHint">${canEdit ? 'Raptiyeden sürükleyip başka bir kartın raptiyesine bırakarak ip bağla · görsel yapıştırmak için Ctrl+V' : 'Görüntüleme modu'}</span>
        <div class="seg"><button id="ckZo">${A.icon('zoom-out')}</button><button id="ckZr" style="min-width:52px"></button><button id="ckZi">${A.icon('zoom-in')}</button></div>
        <button class="btn sm icon" id="ckFit" title="Hepsini göster">${A.icon('scan')}</button>
      </div>
      <div class="ck-stage" id="ckStage">
        <div class="ck-world" id="ckWorld" style="width:${W}px;height:${H}px">
          <svg class="ck-strings" id="ckStrings" width="${W}" height="${H}"></svg>
          <div id="ckItems"></div>
          <svg class="ck-strings top" id="ckTemp" width="${W}" height="${H}"></svg>
        </div>
        <div class="ck-empty hidden" id="ckEmpty">${A.icon('pin')}<h3>Pano boş</h3><p>Görevleri as, konsept görselleri ve notlar ekle, sonra raptiyeler arasına ip gererek bağla.</p></div>
      </div></div>`;
    A.icons(el);
    const stage = A.$('#ckStage', el), world = A.$('#ckWorld', el), itemsEl = A.$('#ckItems', el), strings = A.$('#ckStrings', el), temp = A.$('#ckTemp', el);

    // ---------------------------------------------------------------- görünüm (kaydırma / yakınlaştırma)
    const apply = () => {
      world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.z})`;
      A.$('#ckZr', el).textContent = Math.round(view.z * 100) + '%';
      A.ls.set('corkView', view);
    };
    const zoomAt = (k, cx, cy) => {
      const nz = A.clamp(view.z * k, 0.3, 2);
      view.x = cx - ((cx - view.x) * nz) / view.z; view.y = cy - ((cy - view.y) * nz) / view.z; view.z = nz; apply();
    };
    stage.addEventListener('wheel', (e) => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    A.$('#ckZi', el).onclick = () => zoomAt(1.2, stage.clientWidth / 2, stage.clientHeight / 2);
    A.$('#ckZo', el).onclick = () => zoomAt(1 / 1.2, stage.clientWidth / 2, stage.clientHeight / 2);
    const fit = () => {
      const its = items.filter((i) => i.kind !== 'link');
      if (!its.length) { view.z = 0.85; view.x = 20; view.y = 20; return apply(); }
      const x1 = Math.min(...its.map((i) => i.x)), y1 = Math.min(...its.map((i) => i.y));
      const x2 = Math.max(...its.map((i) => i.x + (i.w || 220))), y2 = Math.max(...its.map((i) => i.y + 260));
      view.z = A.clamp(Math.min((stage.clientWidth - 80) / (x2 - x1), (stage.clientHeight - 80) / (y2 - y1)), 0.3, 1.1);
      view.x = (stage.clientWidth - (x2 - x1) * view.z) / 2 - x1 * view.z; view.y = 40 - y1 * view.z; apply();
    };
    A.$('#ckFit', el).onclick = fit;
    stage.addEventListener('pointerdown', (e) => {
      if (e.target !== stage && e.target !== world && e.target !== strings && e.target !== itemsEl) return;
      if (connecting) { connecting = null; drawTemp(); hint(); }
      const sx = e.clientX, sy = e.clientY, vx = view.x, vy = view.y;
      stage.classList.add('panning');
      const mv = (ev) => { view.x = vx + ev.clientX - sx; view.y = vy + ev.clientY - sy; apply(); };
      const up = () => { stage.classList.remove('panning'); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
    const toWorld = (cx, cy) => { const r = stage.getBoundingClientRect(); return [(cx - r.left - view.x) / view.z, (cy - r.top - view.y) / view.z]; };
    const hint = (t) => { A.$('#ckHint', el).textContent = t || (canEdit ? 'Raptiyeden sürükleyip başka bir kartın raptiyesine bırakarak ip bağla · görsel yapıştırmak için Ctrl+V' : 'Görüntüleme modu'); A.$('#ckHint', el).classList.toggle('on', !!t); };

    // ---------------------------------------------------------------- çizim
    const pinPos = (it) => [it.x + (it.w || 220) / 2, it.y + 10];
    const nodes = () => items.filter((i) => i.kind !== 'link');
    const links = () => items.filter((i) => i.kind === 'link');
    const yarnPath = (a, b) => {
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const sag = Math.min(160, 30 + d * 0.18);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag;
      return `M${a[0]},${a[1]} Q${mx},${my} ${b[0]},${b[1]}`;
    };
    const drawStrings = () => {
      const byId = new Map(nodes().map((n) => [n.id, n]));
      strings.innerHTML = `<defs><filter id="ckShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="5" stdDeviation="3" flood-opacity=".45"/></filter></defs>` + links().map((l) => {
        const a = byId.get(l.from), b = byId.get(l.to);
        if (!a || !b) return '';
        const pa = pinPos(a), pb = pinPos(b), c = (YARN[l.color] || YARN.red)[1];
        const d = yarnPath(pa, pb);
        const mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + Math.min(160, 30 + Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) * 0.18) / 2];
        return `<g class="ck-link" data-id="${l.id}"><path d="${d}" class="hit"/><path d="${d}" stroke="${c}" class="yarn" filter="url(#ckShadow)"/><path d="${d}" class="yarn-tex"/>
          ${l.label ? `<g transform="translate(${mid[0]},${mid[1]})"><rect x="${-l.label.length * 3.6 - 10}" y="-13" width="${l.label.length * 7.2 + 20}" height="24" rx="4" class="ck-tag"/><text text-anchor="middle" y="4">${A.esc(l.label)}</text></g>` : ''}</g>`;
      }).join('');
      A.$$('.ck-link', strings).forEach((g) => (g.onclick = (e) => linkMenu(items.find((i) => i.id === g.dataset.id), e)));
    };
    const drawTemp = (to) => {
      if (!connecting || !to) { temp.innerHTML = ''; A.$$('.ck-item.ck-from', el).forEach((x) => x.classList.toggle('ck-from', false)); if (connecting) { const n = A.$(`.ck-item[data-id="${connecting.from}"]`, el); if (n) n.classList.add('ck-from'); } return; }
      const a = items.find((i) => i.id === connecting.from);
      temp.innerHTML = `<path d="${yarnPath(pinPos(a), to)}" stroke="${YARN[yarn][1]}" class="yarn temp"/>`;
    };
    const itemHtml = (it) => {
      const pin = `<span class="ck-pin" data-pin style="--pc:${it.pin || PIN_COLORS[0]}" title="İp bağlamak için sürükle"></span>`;
      const style = `left:${it.x}px;top:${it.y}px;--rot:${it.rot || 0}deg;width:${it.w || 220}px`;
      if (it.kind === 'task') {
        const t = tasks.find((x) => x.id === it.taskId);
        if (!t) return `<div class="ck-item ck-card missing" data-id="${it.id}" style="${style}">${pin}<div class="ck-paper"><i>Görev silinmiş</i></div></div>`;
        const st = STATUS[t.status] || STATUS.todo, d = A.daysUntil(t.due);
        return `<div class="ck-item ck-card ${t.status === 'done' ? 'done' : ''}" data-id="${it.id}" style="${style}">${pin}
          <div class="ck-paper"><div class="ck-tape" style="background:${st[1]}"></div>
            <div class="ck-cat">${A.esc(t.category || 'Görev')}</div>
            <div class="ck-title">${A.esc(t.title)}</div>
            ${t.description ? `<div class="ck-desc">${A.esc(t.description.slice(0, 120))}</div>` : ''}
            <div class="ck-meta"><span class="ck-st" style="color:${st[1]}">● ${st[0]}</span><span class="spacer"></span>${t.due ? `<span class="${t.status !== 'done' && d < 0 ? 'late' : ''}">${A.fmtDate(t.due, { day: 'numeric', month: 'short' })}</span>` : ''}${t.assignee ? A.avatar(t.assignee, 'xs') : ''}</div>
            ${t.status === 'done' ? '<div class="ck-stamp">TAMAM</div>' : ''}</div></div>`;
      }
      if (it.kind === 'image') return `<div class="ck-item ck-photo" data-id="${it.id}" style="${style}">${pin}<div class="ck-polaroid"><img src="${A.esc(it.url)}" draggable="false" alt=""><div class="ck-cap">${A.esc(it.text || '')}</div></div>${canEdit ? '<span class="ck-resize" data-resize></span>' : ''}</div>`;
      return `<div class="ck-item ck-note" data-id="${it.id}" style="${style};background:${A.esc(it.color || NOTE_COLORS[0])}">${pin}<div class="ck-ntext">${A.esc(it.text || '')}</div></div>`;
    };
    const drawItems = () => {
      itemsEl.innerHTML = nodes().sort((a, b) => (a.z || 0) - (b.z || 0)).map(itemHtml).join('');
      A.icons(itemsEl);
      A.$('#ckEmpty', el).classList.toggle('hidden', nodes().length > 0);
      A.$$('.ck-item', itemsEl).forEach(bindItem);
      drawStrings();
      drawTemp();
    };

    // ---------------------------------------------------------------- etkileşim
    const bindItem = (n) => {
      const it = items.find((i) => i.id === n.dataset.id);
      const pin = A.$('[data-pin]', n);
      // raptiyeden ip çekme
      if (canEdit) pin.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault();
        if (connecting && connecting.from !== it.id) { link(connecting.from, it.id); connecting = null; drawTemp(); hint(); return; }
        connecting = { from: it.id };
        drawTemp();
        let moved = false;
        const mv = (ev) => { moved = true; drawTemp(toWorld(ev.clientX, ev.clientY)); };
        const up = (ev) => {
          window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
          if (!moved) { hint('İpin diğer ucu için başka bir raptiyeye dokun · iptal için boş alana dokun'); return; }
          const t = document.elementFromPoint(ev.clientX, ev.clientY);
          const target = t && t.closest('.ck-item');
          if (target && target.dataset.id !== it.id) link(it.id, target.dataset.id);
          connecting = null; drawTemp(); hint();
        };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
      // kartı taşıma
      if (canEdit) A.drag(n, {
        onStart: (e) => { if (e.target.closest('[data-pin],[data-resize]')) return false; n.classList.add('lifting'); return { x: it.x, y: it.y, moved: false }; },
        onMove: (e, dx, dy, s) => { s.moved = Math.abs(dx) + Math.abs(dy) > 3; it.x = Math.round(A.clamp(s.x + dx / view.z, 0, W - 120)); it.y = Math.round(A.clamp(s.y + dy / view.z, 0, H - 80)); n.style.left = it.x + 'px'; n.style.top = it.y + 'px'; drawStrings(); },
        onEnd: (e, dx, dy, s) => {
          n.classList.remove('lifting');
          if (!s.moved) return open(it);
          const z = Math.max(0, ...nodes().map((x) => x.z || 0)) + 1;
          it.z = z;
          A.col.update('cork', it.id, { x: it.x, y: it.y, z }).catch(A.err);
        },
      });
      else n.onclick = () => open(it);
      // fotoğraf boyutlandırma
      const rs = A.$('[data-resize]', n);
      if (rs) A.drag(rs, {
        handle: rs,
        onStart: (e) => { e.stopPropagation(); return { w: it.w || 240 }; },
        onMove: (e, dx, dy, s) => { it.w = Math.round(A.clamp(s.w + dx / view.z, 140, 700)); n.style.width = it.w + 'px'; drawStrings(); },
        onEnd: () => A.col.update('cork', it.id, { w: it.w }).catch(A.err),
      });
      n.oncontextmenu = (e) => { e.preventDefault(); itemMenu(it, e); };
    };
    const link = async (from, to) => {
      if (links().some((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from))) return A.toast('Bu ikisi zaten bağlı', 'info');
      try { await A.col.create('cork', { kind: 'link', from, to, color: yarn, label: '', projectId: A.state.projectId }); A.sound('pop'); } catch (e) { A.err(e); }
    };
    const linkMenu = (l, e) => {
      if (!canEdit || !l) return;
      A.menu({ x: e.clientX, y: e.clientY }, [
        { head: 'İp' },
        ...Object.entries(YARN).map(([k, [n, c]]) => ({ html: `<i style="width:12px;height:12px;border-radius:50%;background:${c};display:inline-block"></i> ${n} ${l.color === k ? A.icon('check') : ''}`, action: () => A.col.update('cork', l.id, { color: k }).catch(A.err) })),
        '-',
        { icon: 'tag', label: l.label ? 'Etiketi değiştir' : 'Etiket ekle', action: async () => { const v = await A.prompt('İp etiketi', { value: l.label || '', placeholder: 'Örn: önce bu bitmeli, ilham, aynı sahne' }); if (v !== null) A.col.update('cork', l.id, { label: v.slice(0, 40) }).catch(A.err); } },
        { icon: 'scissors', label: 'İpi kes', danger: true, action: () => A.col.remove('cork', l.id).catch(A.err) },
      ]);
    };
    const itemMenu = (it, e) => {
      if (!canEdit) return;
      A.menu({ x: e.clientX, y: e.clientY }, [
        ...(it.kind === 'task' ? [{ icon: 'external-link', label: 'Görevi aç', action: () => A.go('tasks/' + it.taskId) }] : []),
        ...(it.kind !== 'task' ? [{ icon: 'pencil', label: it.kind === 'image' ? 'Açıklama yaz' : 'Notu düzenle', action: () => editText(it) }] : []),
        { head: 'Raptiye rengi' },
        { html: `<span class="row" style="gap:6px">${PIN_COLORS.map((c) => `<i data-pc="${c}" style="width:18px;height:18px;border-radius:50%;background:${c};display:inline-block;border:2px solid ${it.pin === c ? 'var(--text)' : 'transparent'}"></i>`).join('')}</span>`, action: () => {} },
        { icon: 'rotate-cw', label: 'Hafif eğ', action: () => A.col.update('cork', it.id, { rot: Math.round((Math.random() - 0.5) * 8) }).catch(A.err) },
        '-',
        { icon: 'trash-2', label: 'Panodan kaldır', danger: true, action: async () => { for (const l of links().filter((l) => l.from === it.id || l.to === it.id)) await A.col.remove('cork', l.id).catch(() => {}); A.col.remove('cork', it.id).catch(A.err); } },
      ]);
      setTimeout(() => A.$$('.dropdown [data-pc]').forEach((d) => (d.onclick = (ev) => { ev.stopPropagation(); A.closeMenu(); A.col.update('cork', it.id, { pin: d.dataset.pc }).catch(A.err); })), 0);
    };
    const editText = async (it) => {
      const v = await A.prompt(it.kind === 'image' ? 'Görsel açıklaması' : 'Not', { value: it.text || '', multiline: it.kind === 'note' });
      if (v !== null) A.col.update('cork', it.id, { text: v.slice(0, 500) }).catch(A.err);
    };
    const open = (it) => {
      if (it.kind === 'task') return taskPopover(it);
      if (it.kind === 'image') {
        A.modal({ title: it.text || 'Görsel', icon: 'image', size: 'wide', body: `<img src="${A.esc(it.url)}" style="max-width:100%;max-height:70vh;display:block;margin:0 auto;border-radius:10px">`, foot: canEdit ? `<button class="btn" data-close>Kapat</button><button class="btn primary" id="ckCap">${A.icon('pencil')} Açıklama</button>` : null, onOpen: (m) => { const b = A.$('#ckCap', m.el); if (b) b.onclick = () => { m.close(); editText(it); }; } });
        return;
      }
      if (canEdit) editText(it);
    };
    const taskPopover = (it) => {
      const t = tasks.find((x) => x.id === it.taskId);
      if (!t) return;
      const connected = links().filter((l) => l.from === it.id || l.to === it.id).map((l) => nodes().find((n) => n.id === (l.from === it.id ? l.to : l.from))).filter(Boolean);
      const m = A.modal({
        title: t.title, icon: 'check-square',
        body: `${t.description ? `<div class="md small">${A.md(t.description)}</div>` : ''}
          <div class="field" style="margin-top:12px"><label>Durum</label><div class="seg" id="ckSt">${Object.entries(STATUS).map(([k, [l]]) => `<button data-s="${k}" class="${t.status === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          <div class="small muted">${t.assignee ? `Atanan: ${A.esc(A.user(t.assignee).displayName)} · ` : ''}${t.due ? 'Teslim: ' + A.fmtDate(t.due) : ''}</div>
          ${connected.length ? `<div class="label" style="margin:14px 0 6px">İple bağlı (${connected.length})</div>${connected.map((c) => `<div class="small">🧶 ${A.esc(c.kind === 'task' ? (tasks.find((x) => x.id === c.taskId) || {}).title || '?' : c.kind === 'image' ? '🖼️ ' + (c.text || 'Görsel') : '📝 ' + (c.text || '').slice(0, 40))}</div>`).join('')}` : ''}`,
        foot: `<button class="btn" data-close>Kapat</button><button class="btn primary" id="ckOpenT">${A.icon('external-link')} Görevi aç</button>`,
      });
      A.$('#ckOpenT', m.el).onclick = () => { m.close(); A.go('tasks/' + t.id); };
      A.$$('#ckSt button', m.el).forEach((b) => (b.onclick = async () => {
        if (!A.canEdit(t)) return A.toast('Bu görevi düzenleme yetkiniz yok', 'err');
        A.$$('#ckSt button', m.el).forEach((x) => x.classList.toggle('on', x === b));
        await A.col.update('tasks', t.id, { status: b.dataset.s }).catch(A.err);
        if (b.dataset.s === 'done' && t.status !== 'done') { A.confetti(40); A.sound('done'); }
      }));
    };

    // ---------------------------------------------------------------- ekleme
    const freeSpot = () => { const [x, y] = toWorld(stage.getBoundingClientRect().left + stage.clientWidth / 2, stage.getBoundingClientRect().top + stage.clientHeight / 2); return [Math.round(x - 110 + (Math.random() - 0.5) * 160), Math.round(y - 100 + (Math.random() - 0.5) * 120)]; };
    const add = async (data, at) => {
      const [x, y] = at || freeSpot();
      const z = Math.max(0, ...nodes().map((i) => i.z || 0)) + 1;
      try { await A.col.create('cork', { projectId: A.state.projectId, x: A.clamp(x, 0, W - 240), y: A.clamp(y, 0, H - 200), z, rot: Math.round((Math.random() - 0.5) * 6), pin: PIN_COLORS[Math.floor(Math.random() * 4)], ...data }); A.sound('pop'); } catch (e) { A.err(e); }
    };
    const addImage = async (file, at) => {
      if (!file || !file.type.startsWith('image/')) return;
      try { const up = await A.upload(file, { hidden: true, projectId: A.state.projectId }); await add({ kind: 'image', url: up.url, text: file.name.replace(/\.[^.]+$/, '').slice(0, 60), w: 240 }, at); } catch (e) { A.err(e); }
    };
    if (canEdit) {
      A.$('#ckTask', el).onclick = async () => {
        const onBoard = new Set(nodes().filter((i) => i.kind === 'task').map((i) => i.taskId));
        const free = tasks.filter((t) => !onBoard.has(t.id));
        const m = A.modal({
          title: 'Görev as', icon: 'pin',
          body: `<div class="input-icon" style="margin-bottom:10px">${A.icon('search')}<input class="input" id="ckQ" placeholder="Görev ara..."></div>
            <div class="ck-pick" id="ckList"></div>
            <div class="row" style="margin-top:12px"><input class="input" id="ckNewT" placeholder="…veya yeni görev yaz ve Enter'a bas"></div>`,
        });
        const draw = (q = '') => {
          const list = free.filter((t) => t.title.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
          A.$('#ckList', m.el).innerHTML = list.map((t) => `<button data-t="${t.id}"><span class="sdot" style="background:${(STATUS[t.status] || STATUS.todo)[1]}"></span><span class="grow">${A.esc(t.title)}</span><span class="small muted">${A.esc(t.category || '')}</span></button>`).join('') || '<p class="muted small">Asılmamış görev kalmadı.</p>';
          A.$$('[data-t]', m.el).forEach((b) => (b.onclick = () => { m.close(); add({ kind: 'task', taskId: b.dataset.t, w: 220 }); }));
        };
        draw();
        A.$('#ckQ', m.el).oninput = (e) => draw(e.target.value);
        A.$('#ckNewT', m.el).onkeydown = async (e) => {
          if (e.key !== 'Enter' || !e.target.value.trim()) return;
          try { const t = await A.col.create('tasks', { projectId: A.state.projectId, title: e.target.value.trim(), status: 'todo', priority: 'medium', category: 'Tasarım', tags: [], checklist: [], comments: [] }); tasks.push(t); m.close(); add({ kind: 'task', taskId: t.id, w: 220 }); } catch (er) { A.err(er); }
        };
      };
      A.$('#ckImg', el).onclick = async () => { const files = await A.pickFile('image/*', true); for (const f of files || []) await addImage(f); };
      A.$('#ckNote', el).onclick = async () => { const v = await A.prompt('Yapışkan not', { multiline: true, placeholder: 'Fikir, soru, hatırlatma...' }); if (v && v.trim()) add({ kind: 'note', text: v.trim().slice(0, 500), color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)], w: 190 }); };
      const yb = A.$('#ckYarn', el);
      const paintYarn = () => { A.$('.ck-yarn-dot', el).style.background = YARN[yarn][1]; };
      paintYarn();
      yb.onclick = (e) => A.menu(e.currentTarget, Object.entries(YARN).map(([k, [n, c]]) => ({ html: `<i style="width:12px;height:12px;border-radius:50%;background:${c};display:inline-block"></i> ${n} ip ${yarn === k ? A.icon('check') : ''}`, action: () => { yarn = k; A.ls.set('corkYarn', k); paintYarn(); } })));
      // sürükle-bırak ve yapıştırma ile görsel ekleme
      stage.addEventListener('dragover', (e) => { e.preventDefault(); stage.classList.add('drop'); });
      stage.addEventListener('dragleave', (e) => { if (!stage.contains(e.relatedTarget)) stage.classList.toggle('drop', false); });
      stage.addEventListener('drop', async (e) => {
        e.preventDefault(); stage.classList.toggle('drop', false);
        const [x, y] = toWorld(e.clientX, e.clientY);
        let i = 0;
        for (const f of [...e.dataTransfer.files]) await addImage(f, [x - 120 + i * 30, y - 100 + (i++) * 30]);
      });
      const onPaste = (e) => {
        if (e.target.closest('input,textarea') || A.$('.modal-back')) return;
        const f = [...(e.clipboardData || {}).items || []].find((x) => x.type.startsWith('image/'));
        if (f) { e.preventDefault(); addImage(f.getAsFile()); }
      };
      document.addEventListener('paste', onPaste);
      el._ckCleanup = () => document.removeEventListener('paste', onPaste);
    }

    // ---------------------------------------------------------------- veri
    const load = async () => { [items, tasks] = await Promise.all([A.col.project('cork'), A.col.project('tasks')]); drawItems(); };
    await load();
    apply();
    if (!A.ls.get('corkView')) fit();
    A.viewOn('db:cork', (p) => {
      if (p.item.projectId && p.item.projectId !== A.state.projectId) return;
      if (p.action === 'delete') items = items.filter((i) => i.id !== p.item.id);
      else { const k = items.findIndex((i) => i.id === p.item.id); if (k >= 0) items[k] = p.item; else items.push(p.item); }
      if (!A.$('.ck-item.lifting', el)) drawItems();
    });
    A.viewOn('db:tasks', (p) => {
      if (p.action === 'delete') tasks = tasks.filter((t) => t.id !== p.item.id);
      else { const k = tasks.findIndex((t) => t.id === p.item.id); if (k >= 0) tasks[k] = p.item; else tasks.push(p.item); }
      if (!A.$('.ck-item.lifting', el)) drawItems();
    });
  };
})();
