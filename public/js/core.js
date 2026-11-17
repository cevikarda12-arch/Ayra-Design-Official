/* Ayra Design — çekirdek yardımcılar */
(function () {
  const A = (window.A = {
    state: {
      token: null, user: null, perms: [], roles: {}, permissions: {}, settings: {},
      users: new Map(), online: new Set(), projects: [], projectId: null, socket: null,
    },
    modules: {},
    order: [],
  });

  // ------------------------------------------------------------------ storage
  A.ls = {
    get(k, d = null) { try { const v = localStorage.getItem('ayra.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('ayra.' + k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem('ayra.' + k); } catch {} },
  };

  // ------------------------------------------------------------------ api
  A.api = async function (method, url, body) {
    const opt = { method, headers: {} };
    if (A.state.token) opt.headers.Authorization = 'Bearer ' + A.state.token;
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    let res;
    try { res = await fetch(url, opt); } catch (e) { throw new Error('Sunucuya ulaşılamıyor. Bağlantınızı kontrol edin.'); }
    let data = null;
    const txt = await res.text();
    try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    if (!res.ok) {
      if (res.status === 401 && A.state.token && !url.includes('/auth/')) { A.logout(true); }
      const err = new Error((data && data.error) || 'İstek başarısız (' + res.status + ')');
      err.status = res.status; err.code = data && data.code;
      throw err;
    }
    return data;
  };
  A.get = (u) => A.api('GET', u);
  A.post = (u, b) => A.api('POST', u, b || {});
  A.put = (u, b) => A.api('PUT', u, b || {});
  A.del = (u) => A.api('DELETE', u);

  // collection shortcuts
  A.col = {
    list: (c, q = {}) => A.get('/api/c/' + c + (Object.keys(q).length ? '?' + new URLSearchParams(q) : '')),
    get: (c, id) => A.get('/api/c/' + c + '/' + id),
    create: (c, b) => A.post('/api/c/' + c, b),
    update: (c, id, b) => A.put('/api/c/' + c + '/' + id, b),
    remove: (c, id) => A.del('/api/c/' + c + '/' + id),
    project: (c, extra = {}) => A.col.list(c, { projectId: A.state.projectId, ...extra }),
  };

  // ------------------------------------------------------------------ events
  const bus = new Map();
  A.on = (ev, fn) => { if (!bus.has(ev)) bus.set(ev, new Set()); bus.get(ev).add(fn); return () => bus.get(ev).delete(fn); };
  A.emit = (ev, data) => { (bus.get(ev) || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); };
  let viewSubs = [];
  A.viewOn = (ev, fn) => { viewSubs.push(A.on(ev, fn)); };
  A.clearViewSubs = () => { viewSubs.forEach((u) => u()); viewSubs = []; };
  let viewTimers = [];
  A.viewInterval = (fn, ms) => { const t = setInterval(fn, ms); viewTimers.push(t); return t; };
  A.clearViewTimers = () => { viewTimers.forEach(clearInterval); viewTimers = []; };

  // ------------------------------------------------------------------ permissions
  A.can = (p) => A.state.perms.includes(p);
  A.isAdmin = () => A.state.user && A.state.user.role === 'admin';
  A.canEdit = (item) => item && (item.createdBy === A.state.user.id ? A.can('create') || A.can('edit_all') : A.can('edit_all'));
  A.canDelete = (item) => item && (item.createdBy === A.state.user.id || A.can('delete_all'));

  // ------------------------------------------------------------------ html helpers
  A.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  A.h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  A.icon = (name, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
  A.icons = (root) => { try { lucide.createIcons({ attrs: {}, nameAttr: 'data-lucide', root: root || document }); } catch (e) { try { lucide.createIcons(); } catch {} } };
  A.$ = (sel, root = document) => root.querySelector(sel);
  A.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  A.uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  A.debounce = (fn, ms = 400) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; return d; };
  A.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ------------------------------------------------------------------ users
  A.user = (id) => A.state.users.get(id) || { id, displayName: 'Bilinmeyen', username: '?', avatarColor: '#555' };
  A.initials = (name) => String(name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('');
  A.avatar = (u, size = '', pres = false) => {
    if (typeof u === 'string') u = A.user(u);
    if (!u) u = { displayName: '?', avatarColor: '#555' };
    const bg = u.avatar ? `background-image:url('${A.esc(u.avatar)}')` : `background:${A.esc(u.avatarColor || '#9b87f5')}`;
    const p = pres ? `<i class="pres ${A.presenceOf(u)}"></i>` : '';
    return `<span class="avatar ${size}" style="${bg}" title="${A.esc(u.displayName)}">${u.avatar ? '' : A.esc(A.initials(u.displayName))}${p}</span>`;
  };
  A.presenceOf = (u) => (A.state.online.has(u.id) ? u.presence || 'online' : 'offline');
  A.PRESENCE = { online: 'Çevrimiçi', busy: 'Meşgul', away: 'Uzakta', focus: 'Odak modunda', offline: 'Çevrimdışı' };
  A.roleName = (r) => (A.state.roles[r] ? A.state.roles[r].name : r);
  A.roleBadge = (r) => { const ro = A.state.roles[r] || { name: r, color: '#888' }; return `<span class="badge" style="background:${ro.color}22;color:${ro.color}">${A.esc(ro.name)}</span>`; };
  A.activeUsers = () => [...A.state.users.values()].filter((u) => u.status === 'active');
  A.userOptions = (sel, empty = 'Atanmamış') => `<option value="">${empty}</option>` + A.activeUsers().map((u) => `<option value="${u.id}" ${u.id === sel ? 'selected' : ''}>${A.esc(u.displayName)}</option>`).join('');

  // ------------------------------------------------------------------ time
  A.timeAgo = (ts) => {
    if (!ts) return '';
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 45) return 'az önce';
    if (s < 3600) return Math.floor(s / 60) + ' dk önce';
    if (s < 86400) return Math.floor(s / 3600) + ' saat önce';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' gün önce';
    return A.fmtDate(ts);
  };
  A.fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => { if (!d) return ''; const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString('tr-TR', opts); };
  A.fmtTime = (d) => new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  A.today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  A.daysUntil = (dateStr) => { if (!dateStr) return null; const a = new Date(A.today()); const b = new Date(dateStr); return Math.round((b - a) / 86400000); };
  A.fmtSize = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB');

  // ------------------------------------------------------------------ toast
  A.toast = (msg, type = 'info', title = '') => {
    const ic = { ok: 'check-circle-2', err: 'alert-triangle', info: 'sparkles' }[type] || 'bell';
    const t = A.h(`<div class="toast ${type}"><div class="ti">${A.icon(ic)}</div><div>${title ? `<b>${A.esc(title)}</b>` : ''}<span>${A.esc(msg)}</span></div></div>`);
    A.$('#toasts').appendChild(t);
    A.icons(t);
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
    t.onclick = close;
    setTimeout(close, 4000);
    if (type !== 'err') A.sound('pop');
  };
  A.err = (e) => A.toast(e && e.message ? e.message : String(e), 'err', 'Hata');

  // ------------------------------------------------------------------ sounds (WebAudio, dosyasız)
  let actx = null;
  A.sound = (kind) => {
    const prefs = (A.state.user && A.state.user.prefs) || {};
    if (prefs.sounds === false) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(); const g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      const t = actx.currentTime;
      const map = { pop: [660, 990, 0.08], msg: [520, 780, 0.12], done: [523, 1046, 0.25], err: [300, 180, 0.2], whoosh: [200, 900, 0.5] };
      const [f1, f2, d] = map[kind] || map.pop;
      o.type = 'sine';
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05);
      o.start(t); o.stop(t + d + 0.08);
    } catch {}
  };

  // ------------------------------------------------------------------ modal
  A.modal = ({ title = '', icon = '', body = '', foot = null, size = '', onOpen, onClose, closable = true } = {}) => {
    const back = A.h(`<div class="modal-back"><div class="modal ${size}" role="dialog">
      <div class="modal-head">${icon ? A.icon(icon) : ''}<h3>${A.esc(title)}</h3>${closable ? `<button class="btn ghost icon sm x" data-close>${A.icon('x')}</button>` : ''}</div>
      <div class="modal-body"></div>
      ${foot !== false ? '<div class="modal-foot"></div>' : ''}
    </div></div>`);
    const bodyEl = A.$('.modal-body', back);
    if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.appendChild(body);
    const footEl = A.$('.modal-foot', back);
    if (footEl) {
      if (typeof foot === 'string') footEl.innerHTML = foot;
      else if (foot === null) footEl.innerHTML = '<button class="btn" data-close>Kapat</button>';
    }
    let closed = false;
    const close = (val) => {
      if (closed) return; closed = true;
      back.classList.add('closing');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => back.remove(), 190);
      onClose && onClose(val);
    };
    const onKey = (e) => { if (e.key === 'Escape' && closable && A.$('#modalRoot').lastElementChild === back) close(); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('mousedown', (e) => { if (e.target === back && closable) close(); });
    back.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    A.$('#modalRoot').appendChild(back);
    A.icons(back);
    const api = { el: back, body: bodyEl, foot: footEl, close };
    onOpen && onOpen(api);
    setTimeout(() => { const f = A.$('input:not([type=hidden]):not([type=checkbox]):not([type=color]), textarea', bodyEl); if (f && !f.dataset.nofocus) f.focus(); }, 60);
    return api;
  };

  A.confirm = (text, { title = 'Emin misiniz?', ok = 'Evet', danger = true } = {}) => new Promise((resolve) => {
    let result = false;
    A.modal({
      title, icon: danger ? 'alert-triangle' : 'help-circle', body: `<p style="margin:0">${A.esc(text)}</p>`,
      foot: `<button class="btn" data-close>Vazgeç</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${A.esc(ok)}</button>`,
      onOpen: (m) => { A.$('[data-ok]', m.el).onclick = () => { result = true; m.close(); }; },
      onClose: () => resolve(result),
    });
  });

  A.prompt = (title, { value = '', placeholder = '', label = '', ok = 'Kaydet', multiline = false, type = 'text' } = {}) => new Promise((resolve) => {
    let result = null;
    A.modal({
      title, icon: 'pencil',
      body: `<div class="field">${label ? `<label>${A.esc(label)}</label>` : ''}${multiline ? `<textarea class="textarea" placeholder="${A.esc(placeholder)}">${A.esc(value)}</textarea>` : `<input class="input" type="${type}" value="${A.esc(value)}" placeholder="${A.esc(placeholder)}">`}</div>`,
      foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" data-ok>${A.esc(ok)}</button>`,
      onOpen: (m) => {
        const inp = A.$('input,textarea', m.el);
        const done = () => { result = inp.value; m.close(); };
        A.$('[data-ok]', m.el).onclick = done;
        if (!multiline) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
        setTimeout(() => inp.select(), 80);
      },
      onClose: () => resolve(result),
    });
  });

  // form modal: fields = [{key,label,type,options,value,placeholder,full}]
  A.form = ({ title, icon = 'pencil', fields, ok = 'Kaydet', size = '', extra = '' }) => new Promise((resolve) => {
    let result = null;
    const fieldHtml = (f) => {
      const v = f.value == null ? '' : f.value;
      let input;
      if (f.type === 'textarea') input = `<textarea class="textarea" name="${f.key}" rows="${f.rows || 4}" placeholder="${A.esc(f.placeholder || '')}">${A.esc(v)}</textarea>`;
      else if (f.type === 'select') input = `<select class="select" name="${f.key}">${f.options.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${A.esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${A.esc(lab)}</option>`; }).join('')}</select>`;
      else if (f.type === 'html') input = f.html;
      else if (f.type === 'color') input = `<div class="row"><input type="color" name="${f.key}" value="${A.esc(v || '#9b87f5')}"><div class="color-dots">${['#9b87f5', '#20c997', '#f06595', '#4dabf7', '#ffa94d', '#ffd43b', '#ff6b6b', '#69db7c', '#868e96'].map((c) => `<button type="button" style="background:${c}" data-c="${c}"></button>`).join('')}</div></div>`;
      else if (f.type === 'checkbox') input = `<label class="row" style="cursor:pointer"><label class="switch"><input type="checkbox" name="${f.key}" ${v ? 'checked' : ''}><span></span></label> ${A.esc(f.hint || '')}</label>`;
      else input = `<input class="input" type="${f.type || 'text'}" name="${f.key}" value="${A.esc(v)}" placeholder="${A.esc(f.placeholder || '')}" ${f.required ? 'required' : ''}>`;
      return `<div class="field" style="${f.half ? 'flex:1' : ''}"><label>${A.esc(f.label || '')}</label>${input}</div>`;
    };
    // yan yana alanları grupla
    let html = '';
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (f.half && fields[i + 1] && fields[i + 1].half) { html += `<div class="row" style="align-items:flex-start">${fieldHtml(f)}${fieldHtml(fields[i + 1])}</div>`; i++; }
      else html += fieldHtml(f);
    }
    A.modal({
      title, icon, size, body: `<form class="aform">${html}${extra}<button type="submit" hidden></button></form>`,
      foot: `<button class="btn" data-close>Vazgeç</button><button class="btn primary" data-ok>${A.esc(ok)}</button>`,
      onOpen: (m) => {
        const form = A.$('form', m.el);
        A.$$('.color-dots button', form).forEach((b) => (b.onclick = () => { b.closest('.row').querySelector('input[type=color]').value = b.dataset.c; }));
        const submit = (e) => {
          e && e.preventDefault();
          const out = {};
          fields.forEach((f) => {
            const el = form.elements[f.key];
            if (!el) return;
            if (f.type === 'checkbox') out[f.key] = el.checked;
            else if (f.type === 'number') out[f.key] = el.value === '' ? null : Number(el.value);
            else out[f.key] = el.value;
            if (f.required && !String(out[f.key] || '').trim()) { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 500); out._invalid = true; }
          });
          if (out._invalid) return;
          result = out; m.close();
        };
        form.addEventListener('submit', submit);
        A.$('[data-ok]', m.el).onclick = submit;
      },
      onClose: () => resolve(result),
    });
  });

  // ------------------------------------------------------------------ dropdown menu
  A.menu = (anchor, items, { align = 'left' } = {}) => {
    A.closeMenu();
    const dd = A.h('<div class="dropdown"></div>');
    items.forEach((it) => {
      if (it === '-') return dd.appendChild(A.h('<div class="dd-sep"></div>'));
      if (it.head) return dd.appendChild(A.h(`<div class="dd-head">${A.esc(it.head)}</div>`));
      const b = A.h(`<button class="dd-item ${it.danger ? 'danger' : ''}">${it.icon ? A.icon(it.icon) : ''}${it.html || A.esc(it.label)}</button>`);
      b.onclick = (e) => { e.stopPropagation(); A.closeMenu(); it.action && it.action(); };
      dd.appendChild(b);
    });
    document.body.appendChild(dd);
    A.icons(dd);
    const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
    const w = dd.offsetWidth, h = dd.offsetHeight;
    let left = align === 'right' ? r.right - w : r.left;
    let top = r.bottom + 6;
    if (left + w > innerWidth - 8) left = innerWidth - w - 8;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 6);
    dd.style.left = Math.max(8, left) + 'px';
    dd.style.top = top + 'px';
    A._menu = dd;
    setTimeout(() => document.addEventListener('mousedown', A._menuOut = (e) => { if (!dd.contains(e.target)) A.closeMenu(); }), 0);
    return dd;
  };
  A.closeMenu = () => { if (A._menu) { A._menu.remove(); A._menu = null; document.removeEventListener('mousedown', A._menuOut); } };

  // ------------------------------------------------------------------ files
  A.readFile = (file, as = 'dataURL') => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error('Dosya okunamadı'));
    if (as === 'text') r.readAsText(file); else r.readAsDataURL(file);
  });
  A.upload = async (file, extra = {}) => {
    if (file.size > 20 * 1024 * 1024) throw new Error('Dosya 20 MB sınırını aşıyor.');
    const data = await A.readFile(file);
    return A.post('/api/upload', { name: file.name, type: file.type, data, ...extra });
  };
  A.pickFile = (accept = '*/*', multiple = false) => new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = accept; inp.multiple = multiple;
    inp.onchange = () => resolve(multiple ? [...inp.files] : inp.files[0] || null);
    inp.click();
  });
  A.download = (filename, content, type = 'application/json') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  A.resizeImage = (dataUrl, max = 256) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });

  // ------------------------------------------------------------------ markdown (güvenli)
  A.md = (src) => {
    const esc = A.esc;
    const blocks = [];
    let text = String(src || '').replace(/\r\n/g, '\n');
    // kod blokları
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => { blocks.push(`<pre><code class="lang-${esc(lang)}">${esc(code.replace(/\n$/, ''))}</code></pre>`); return `\u0000${blocks.length - 1}\u0000`; });
    const inline = (s) => {
      s = esc(s);
      const codes = [];
      s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(`<code>${c}</code>`); return `\u0001${codes.length - 1}\u0001`; });
      s = s.replace(/!\[([^\]]*)\]\(((?:https?:\/\/|\/uploads\/)[^\s)]+)\)/g, '<img src="$2" alt="$1">');
      s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|#|\/)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
      s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
      s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
      s = s.replace(/(^|\s)@([a-z0-9_.-]{3,24})/gi, '$1<span class="mention">@$2</span>');
      s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => codes[i]);
      return s;
    };
    const lines = text.split('\n');
    const out = [];
    let i = 0;
    let taskIdx = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^\u0000\d+\u0000$/.test(line.trim())) { out.push(blocks[Number(line.trim().slice(1, -1))]); i++; continue; }
      let m;
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); i++; continue; }
      if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
      if (/^>\s?/.test(line)) {
        const q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push(`<blockquote>${q.map(inline).join('<br>')}</blockquote>`); continue;
      }
      if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        const row = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const head = row(line); i += 2;
        const rows = [];
        while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) { rows.push(row(lines[i])); i++; }
        out.push(`<table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
        continue;
      }
      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
        const ordered = /^\s*\d+\./.test(line);
        const items = [];
        while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          const it = lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, '');
          const t = it.match(/^\[( |x|X)\]\s*(.*)$/);
          if (t) { const done = t[1] !== ' '; items.push(`<li class="task ${done ? 'done' : ''}"><input type="checkbox" data-task="${taskIdx++}" ${done ? 'checked' : ''}><span>${inline(t[2])}</span></li>`); }
          else items.push(`<li>${inline(it)}</li>`);
          i++;
        }
        out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
        continue;
      }
      if (!line.trim()) { i++; continue; }
      const para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|\s*([-*+]|\d+\.)\s+|\||```|\u0000)/.test(lines[i])) { para.push(inline(lines[i])); i++; }
      if (para.length) out.push(`<p>${para.join('<br>')}</p>`);
      else { out.push(`<p>${inline(line)}</p>`); i++; }
    }
    return out.join('\n');
  };
  // markdown içindeki n'inci görev kutusunu değiştir
  A.toggleMdTask = (src, n) => {
    let k = -1;
    return src.replace(/^(\s*(?:[-*+]|\d+\.)\s+)\[( |x|X)\]/gm, (all, pre, mark) => { k++; if (k !== n) return all; return pre + (mark === ' ' ? '[x]' : '[ ]'); });
  };

  // ------------------------------------------------------------------ confetti 🎉
  A.confetti = (n = 80) => {
    const colors = ['#9b87f5', '#20c997', '#f06595', '#ffd43b', '#4dabf7', '#ffa94d'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      document.body.appendChild(c);
      const x = (Math.random() - 0.5) * 300;
      const rot = Math.random() * 720;
      c.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${x}px, ${innerHeight + 40}px) rotate(${rot}deg)`, opacity: 0.8 }], { duration: 1800 + Math.random() * 1600, easing: 'cubic-bezier(.2,.6,.4,1)', delay: Math.random() * 300 }).onfinish = () => c.remove();
    }
  };

  // ------------------------------------------------------------------ module registry & router
  A.register = (id, mod) => { A.modules[id] = { id, ...mod }; A.order.push(id); };
  A.current = null;
  A.go = (path) => { if (location.hash !== '#/' + path) location.hash = '#/' + path; else A.route(); };
  A.route = () => {
    if (!A.state.user) return;
    const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [id, ...rest] = raw.split('/');
    const mod = A.modules[id] || A.modules.dashboard;
    if (mod.perm && !A.can(mod.perm)) { A.toast('Bu bölüme erişim yetkiniz yok.', 'err'); return A.go('dashboard'); }
    if (A.current && A.current.destroy) { try { A.current.destroy(); } catch (e) { console.error(e); } }
    A.clearViewSubs();
    A.clearViewTimers();
    A.closeMenu();
    A.current = mod;
    const view = A.$('#view');
    view.innerHTML = '';
    view.scrollTop = 0;
    const inner = A.h(`<div class="view-inner ${mod.full ? 'full' : ''}"></div>`);
    view.appendChild(inner);
    A.emit('route', { id: mod.id, params: rest });
    try {
      const r = mod.render(inner, rest.map(decodeURIComponent));
      if (r && r.catch) r.catch((e) => { console.error(e); inner.innerHTML = `<div class="empty"><div class="ico">${A.icon('alert-triangle')}</div><h3>Bir sorun oluştu</h3><p>${A.esc(e.message)}</p></div>`; A.icons(inner); });
    } catch (e) {
      console.error(e);
      inner.innerHTML = `<div class="empty"><div class="ico">${A.icon('alert-triangle')}</div><h3>Bir sorun oluştu</h3><p>${A.esc(e.message)}</p></div>`;
    }
    A.icons(inner);
  };

  A.emptyState = (icon, title, text = '', action = '') => `<div class="empty"><div class="ico">${A.icon(icon)}</div><h3>${A.esc(title)}</h3><p>${A.esc(text)}</p>${action}</div>`;
  A.needProject = (el) => {
    if (A.state.projectId && A.state.projects.find((p) => p.id === A.state.projectId)) return false;
    el.innerHTML = A.emptyState('folder-open', 'Henüz proje yok', 'Bu modülü kullanmak için önce bir oyun projesi oluşturun.', A.can('manage_projects') ? `<button class="btn primary" onclick="A.go('projects')">${A.icon('plus')} Proje oluştur</button>` : '');
    A.icons(el);
    return true;
  };
  A.project = () => A.state.projects.find((p) => p.id === A.state.projectId) || null;

  // drag helper (pointer events)
  A.drag = (el, { onStart, onMove, onEnd, handle } = {}) => {
    (handle || el).addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('input,textarea,select,button,[contenteditable=true]') && !e.target.closest('[data-draghandle]')) return;
      const sx = e.clientX, sy = e.clientY;
      const ctx = onStart ? onStart(e) : null;
      if (ctx === false) return;
      e.preventDefault();
      const move = (ev) => onMove && onMove(ev, ev.clientX - sx, ev.clientY - sy, ctx);
      const up = (ev) => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); onEnd && onEnd(ev, ev.clientX - sx, ev.clientY - sy, ctx); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  };
})();
