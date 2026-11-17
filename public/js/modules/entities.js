/* Karakter, Düşman, Eşya ve Yetenek veritabanı */
(function () {
  const TYPES = {
    character: ['Karakter', 'user', '#9b87f5', ['Can', 'Saldırı', 'Savunma', 'Hız']],
    enemy: ['Düşman', 'skull', '#ff6b6b', ['Can', 'Saldırı', 'Savunma', 'Hız', 'XP Ödülü']],
    npc: ['NPC', 'users-round', '#4dabf7', []],
    item: ['Eşya', 'gem', '#ffd43b', ['Fiyat', 'Ağırlık']],
    weapon: ['Silah', 'sword', '#ffa94d', ['Hasar', 'Saldırı Hızı', 'Menzil', 'Fiyat']],
    ability: ['Yetenek', 'zap', '#20c997', ['Hasar', 'Bekleme (sn)', 'Mana']],
    quest: ['Görev / Quest', 'scroll', '#e599f7', ['XP', 'Altın']],
  };
  const RARITY = { common: ['Sıradan', '#adb5bd'], uncommon: ['Nadir Olmayan', '#69db7c'], rare: ['Nadir', '#4dabf7'], epic: ['Destansı', '#b197fc'], legendary: ['Efsanevi', '#ffa94d'] };

  A.register('entities', {
    title: 'Karakter & Eşya', icon: 'swords', group: 'tasarim',
    async render(el, [openId]) {
      if (A.needProject(el)) return;
      let items = await A.col.project('entities');
      let type = A.ls.get('entType', '');
      let q = '';
      el.innerHTML = `<div class="page-head"><div><h1>Karakter & Eşya Veritabanı</h1><p>Oyundaki tüm karakterler, düşmanlar, eşyalar ve yetenekler — istatistikleriyle birlikte.</p></div>
        <div class="actions">
          <div class="input-icon" style="width:200px">${A.icon('search')}<input class="input sm" id="eQ" placeholder="Ara..."></div>
          <button class="btn sm" id="eExp">${A.icon('download')} Dışa aktar</button>
          <button class="btn sm" id="eCmp">${A.icon('columns-2')} Karşılaştır</button>
          ${A.can('create') ? `<button class="btn primary" id="eNew">${A.icon('plus')} Yeni</button>` : ''}
        </div></div>
        <div class="tabs" id="eTabs"></div>
        <div class="grid auto stagger" id="eGrid"></div>`;
      A.icons(el);
      A.$('#eQ', el).oninput = (e) => { q = e.target.value.toLocaleLowerCase('tr'); draw(); };
      const nb = A.$('#eNew', el);
      if (nb) nb.onclick = () => edit({ type: type || 'character', rarity: 'common', stats: (TYPES[type || 'character'][3]).map((k) => ({ k, v: 10 })) });
      A.$('#eExp', el).onclick = (e) => A.menu(e.currentTarget, [
        { icon: 'file-text', label: 'JSON (oyun motoru için)', action: () => A.download('varliklar.json', JSON.stringify(items.map(({ name, type, rarity, description, stats, tags, lore }) => ({ name, type, rarity, description, stats: Object.fromEntries((stats || []).map((s) => [s.k, s.v])), tags, lore })), null, 2)) },
        { icon: 'table', label: 'CSV (Excel)', action: () => {
          const keys = [...new Set(items.flatMap((i) => (i.stats || []).map((s) => s.k)))];
          const rows = [['Ad', 'Tür', 'Nadirlik', ...keys, 'Açıklama'], ...items.map((i) => [i.name, TYPES[i.type] ? TYPES[i.type][0] : i.type, RARITY[i.rarity] ? RARITY[i.rarity][0] : '', ...keys.map((k) => ((i.stats || []).find((s) => s.k === k) || {}).v ?? ''), (i.description || '').replace(/\n/g, ' ')])];
          A.download('varliklar.csv', '﻿' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n'), 'text/csv');
        } },
      ]);
      A.$('#eCmp', el).onclick = compare;

      const drawTabs = () => {
        const tabs = A.$('#eTabs', el);
        tabs.innerHTML = `<button data-t="" class="${!type ? 'on' : ''}">${A.icon('layers')} Tümü <span class="badge">${items.length}</span></button>` + Object.entries(TYPES).map(([k, [l, ic]]) => `<button data-t="${k}" class="${type === k ? 'on' : ''}">${A.icon(ic)} ${l} <span class="badge">${items.filter((i) => i.type === k).length}</span></button>`).join('');
        A.icons(tabs);
        A.$$('button', tabs).forEach((b) => (b.onclick = () => { type = b.dataset.t; A.ls.set('entType', type); drawTabs(); draw(); }));
      };
      const draw = () => {
        const grid = A.$('#eGrid', el);
        const list = items.filter((i) => (!type || i.type === type) && (!q || (i.name + ' ' + (i.description || '') + ' ' + (i.tags || []).join(' ')).toLocaleLowerCase('tr').includes(q)));
        grid.innerHTML = list.length ? list.map((i) => {
          const t = TYPES[i.type] || TYPES.item;
          const r = RARITY[i.rarity] || RARITY.common;
          const max = Math.max(1, ...(i.stats || []).map((s) => Number(s.v) || 0));
          return `<div class="card hover ent" data-id="${i.id}" style="--rc:${r[1]}">
            <div class="ent-img" style="${i.image ? `background-image:url('${A.esc(i.image)}')` : `background:linear-gradient(135deg, ${t[2]}33, ${r[1]}22)`}">${i.image ? '' : A.icon(t[1])}<span class="ent-rar">${r[0]}</span></div>
            <div class="row" style="gap:8px;margin-top:10px"><b class="grow ell">${A.esc(i.name)}</b><span class="badge" style="background:${t[2]}22;color:${t[2]}">${t[0]}</span></div>
            <p class="small muted ent-desc">${A.esc(i.description || '')}</p>
            <div class="ent-stats">${(i.stats || []).slice(0, 4).map((s) => `<div class="es"><span>${A.esc(s.k)}</span><div class="progress"><i style="width:${Math.min(100, ((Number(s.v) || 0) / max) * 100)}%;background:${t[2]}"></i></div><b>${A.esc(s.v)}</b></div>`).join('')}</div>
          </div>`;
        }).join('') : A.emptyState('swords', 'Henüz kayıt yok', 'Oyununuzun karakterlerini, düşmanlarını ve eşyalarını buraya ekleyin.');
        A.icons(grid);
        A.$$('.ent', grid).forEach((c) => (c.onclick = () => view(items.find((i) => i.id === c.dataset.id))));
      };

      const radar = (stats, color, size = 220) => {
        const s = (stats || []).filter((x) => !isNaN(Number(x.v))).slice(0, 8);
        if (s.length < 3) return '';
        const max = Math.max(...s.map((x) => Number(x.v)), 1);
        const c = size / 2, R = size / 2 - 34;
        const pt = (i, v) => { const a = (Math.PI * 2 * i) / s.length - Math.PI / 2; return [c + Math.cos(a) * R * v, c + Math.sin(a) * R * v]; };
        const rings = [0.25, 0.5, 0.75, 1].map((k) => `<polygon points="${s.map((_, i) => pt(i, k).join(',')).join(' ')}" fill="none" stroke="var(--line-2)"/>`).join('');
        const poly = s.map((x, i) => pt(i, Number(x.v) / max).join(',')).join(' ');
        const labels = s.map((x, i) => { const [lx, ly] = pt(i, 1.18); return `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="var(--muted)" font-size="10">${A.esc(x.k)}</text>`; }).join('');
        return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="radar">${rings}<polygon points="${poly}" fill="${color}44" stroke="${color}" stroke-width="2" class="radar-poly"/>${labels}</svg>`;
      };

      const view = (i) => {
        if (!i) return;
        const t = TYPES[i.type] || TYPES.item, r = RARITY[i.rarity] || RARITY.common;
        const m = A.modal({
          title: i.name, icon: t[1], size: 'wide',
          body: `<div class="ent-view">
            <div><div class="ent-img big" style="${i.image ? `background-image:url('${A.esc(i.image)}')` : `background:linear-gradient(135deg, ${t[2]}44, ${r[1]}33)`}">${i.image ? '' : A.icon(t[1])}</div>
              <div class="center" style="margin-top:10px">${radar(i.stats, t[2])}</div></div>
            <div>
              <div class="row wrap" style="gap:6px;margin-bottom:10px"><span class="badge" style="background:${t[2]}22;color:${t[2]}">${t[0]}</span><span class="badge" style="background:${r[1]}22;color:${r[1]}">${r[0]}</span>${(i.tags || []).map((x) => `<span class="tag">#${A.esc(x)}</span>`).join('')}</div>
              <div class="md">${A.md(i.description || '')}</div>
              <table class="table" style="margin:12px 0">${(i.stats || []).map((s) => `<tr><td class="muted">${A.esc(s.k)}</td><td><b>${A.esc(s.v)}</b></td></tr>`).join('')}</table>
              ${i.lore ? `<div class="label" style="margin-bottom:6px">Hikaye / Lore</div><div class="md small">${A.md(i.lore)}</div>` : ''}
              <div class="small muted" style="margin-top:12px">${A.esc(A.user(i.createdBy).displayName)} tarafından oluşturuldu · ${A.timeAgo(i.updatedAt)} güncellendi</div>
            </div></div>`,
          foot: `${A.canDelete(i) ? `<button class="btn danger" data-del>${A.icon('trash-2')} Sil</button>` : ''}<span class="spacer"></span>${A.can('create') ? `<button class="btn" data-dup>${A.icon('copy')} Kopyala</button>` : ''}${A.canEdit(i) ? `<button class="btn primary" data-edit>${A.icon('pencil')} Düzenle</button>` : ''}`,
        });
        const on = (s, fn) => { const b = A.$(s, m.el); if (b) b.onclick = fn; };
        on('[data-edit]', () => { m.close(); edit(i); });
        on('[data-dup]', async () => { m.close(); const { id, createdAt, updatedAt, createdBy, updatedBy, ...rest } = i; await A.col.create('entities', { ...rest, name: i.name + ' (kopya)' }).catch(A.err); });
        on('[data-del]', async () => { if (await A.confirm(`“${i.name}” silinsin mi?`)) { await A.col.remove('entities', i.id).catch(A.err); m.close(); } });
      };

      const edit = (i) => {
        let stats = JSON.parse(JSON.stringify(i.stats || []));
        let image = i.image || null;
        const m = A.modal({
          title: i.id ? 'Düzenle: ' + i.name : 'Yeni kayıt', icon: 'pencil', size: 'wide',
          body: `<div class="ent-edit">
            <div><div class="ent-img big pick" id="eiImg" title="Görsel yüklemek için tıklayın"></div><button class="btn xs ghost block" id="eiImgRm" style="margin-top:6px">Görseli kaldır</button></div>
            <div>
              <div class="field"><label>Ad</label><input class="input" id="eiName" value="${A.esc(i.name || '')}"></div>
              <div class="row"><div class="field"><label>Tür</label><select class="select" id="eiType">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${i.type === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
              <div class="field"><label>Nadirlik</label><select class="select" id="eiRar">${Object.entries(RARITY).map(([k, v]) => `<option value="${k}" ${i.rarity === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div></div>
              <div class="field"><label>Açıklama</label><textarea class="textarea" id="eiDesc" rows="3">${A.esc(i.description || '')}</textarea></div>
              <div class="field"><label>İstatistikler</label><div id="eiStats"></div><button class="btn xs" id="eiAdd" style="margin-top:6px">${A.icon('plus')} İstatistik ekle</button></div>
              <div class="field"><label>Etiketler (virgülle)</label><input class="input" id="eiTags" value="${A.esc((i.tags || []).join(', '))}"></div>
              <div class="field"><label>Hikaye / Lore</label><textarea class="textarea" id="eiLore" rows="3">${A.esc(i.lore || '')}</textarea></div>
            </div></div>`,
          foot: '<button class="btn" data-close>Vazgeç</button><button class="btn primary" data-save>Kaydet</button>',
        });
        const root = m.el;
        const drawImg = () => { const b = A.$('#eiImg', root); b.style.backgroundImage = image ? `url('${image}')` : ''; b.innerHTML = image ? '' : `${A.icon('image')}<span class="small">Görsel yükle</span>`; A.icons(b); };
        drawImg();
        A.$('#eiImg', root).onclick = async () => { const f = await A.pickFile('image/*'); if (!f) return; try { const up = await A.upload(f, { hidden: true, projectId: A.state.projectId }); image = up.url; drawImg(); } catch (e) { A.err(e); } };
        A.$('#eiImgRm', root).onclick = () => { image = null; drawImg(); };
        const drawStats = () => {
          const box = A.$('#eiStats', root);
          box.innerHTML = stats.map((s, k) => `<div class="row" style="gap:6px;margin-bottom:6px"><input class="input sm" data-k="${k}" value="${A.esc(s.k)}" placeholder="Özellik"><input class="input sm" data-v="${k}" value="${A.esc(s.v)}" placeholder="Değer" style="width:110px"><button class="btn xs ghost" data-rm="${k}">${A.icon('x')}</button></div>`).join('');
          A.icons(box);
          A.$$('[data-k]', box).forEach((x) => (x.oninput = () => (stats[x.dataset.k].k = x.value)));
          A.$$('[data-v]', box).forEach((x) => (x.oninput = () => { const n = Number(x.value); stats[x.dataset.v].v = x.value !== '' && !isNaN(n) ? n : x.value; }));
          A.$$('[data-rm]', box).forEach((x) => (x.onclick = () => { stats.splice(+x.dataset.rm, 1); drawStats(); }));
        };
        drawStats();
        A.$('#eiAdd', root).onclick = () => { stats.push({ k: '', v: 0 }); drawStats(); };
        A.$('#eiType', root).onchange = (e) => { if (!stats.length) { stats = TYPES[e.target.value][3].map((k) => ({ k, v: 10 })); drawStats(); } };
        A.$('[data-save]', root).onclick = async () => {
          const body = {
            name: A.$('#eiName', root).value.trim() || 'Adsız', type: A.$('#eiType', root).value, rarity: A.$('#eiRar', root).value,
            description: A.$('#eiDesc', root).value, stats: stats.filter((s) => String(s.k).trim()), tags: A.splitTags(A.$('#eiTags', root).value),
            lore: A.$('#eiLore', root).value, image, projectId: A.state.projectId,
          };
          try { if (i.id) await A.col.update('entities', i.id, body); else await A.col.create('entities', body); m.close(); A.toast('Kaydedildi', 'ok'); } catch (e) { A.err(e); }
        };
      };

      function compare() {
        if (items.length < 2) return A.toast('Karşılaştırmak için en az 2 kayıt gerekli', 'err');
        const opts = items.map((i) => `<option value="${i.id}">${A.esc(i.name)}</option>`).join('');
        const m = A.modal({ title: 'Karşılaştır', icon: 'columns-2', size: 'wide', body: `<div class="row"><select class="select" id="c1">${opts}</select><span>vs</span><select class="select" id="c2">${opts}</select></div><div id="cOut" style="margin-top:16px"></div>` });
        const c1 = A.$('#c1', m.el), c2 = A.$('#c2', m.el);
        c2.selectedIndex = 1;
        const out = () => {
          const a = items.find((i) => i.id === c1.value), b = items.find((i) => i.id === c2.value);
          const keys = [...new Set([...(a.stats || []), ...(b.stats || [])].map((s) => s.k))];
          const val = (x, k) => ((x.stats || []).find((s) => s.k === k) || {}).v;
          A.$('#cOut', m.el).innerHTML = `<table class="table"><thead><tr><th>Özellik</th><th>${A.esc(a.name)}</th><th>${A.esc(b.name)}</th><th>Fark</th></tr></thead><tbody>${keys.map((k) => { const va = val(a, k), vb = val(b, k); const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : null; return `<tr><td>${A.esc(k)}</td><td><b>${A.esc(va ?? '—')}</b></td><td><b>${A.esc(vb ?? '—')}</b></td><td>${d === null ? '' : `<span class="badge ${d > 0 ? 'green' : d < 0 ? 'red' : ''}">${d > 0 ? '+' : ''}${d}</span>`}</td></tr>`; }).join('')}</tbody></table>`;
        };
        c1.onchange = c2.onchange = out; out();
      }

      drawTabs(); draw();
      if (openId) view(items.find((i) => i.id === openId));
      A.viewOn('db:entities', (p) => {
        if (p.item.projectId && p.item.projectId !== A.state.projectId) return;
        if (p.action === 'delete') items = items.filter((i) => i.id !== p.item.id);
        else { const k = items.findIndex((i) => i.id === p.item.id); if (k >= 0) items[k] = p.item; else items.push(p.item); }
        drawTabs(); draw();
      });
    },
  });
})();
