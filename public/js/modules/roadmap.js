/* Yol Haritası — kilometre taşları zaman çizelgesi + build / sürüm notları */
(function () {
  const MS_STATUS = { planned: ['Planlandı', '#868e96'], active: ['Devam ediyor', '#4dabf7'], done: ['Tamamlandı', '#20c997'], late: ['Gecikti', '#ff6b6b'] };
  const BUILD_TYPES = { internal: ['Dahili', '#868e96'], playtest: ['Oyun testi', '#20c997'], alpha: ['Alfa', '#ffa94d'], beta: ['Beta', '#4dabf7'], release: ['Yayın', '#f06595'], patch: ['Yama', '#9b87f5'] };
  const DEFAULT_MS = [['Konsept', 14, '#b197fc', 'Oyun fikri, çekirdek döngü ve hedef kitle netleşir. GDD Genel Bakış tamamlanır.'], ['Prototip', 28, '#9b87f5', 'Çekirdek mekanik oynanabilir. "Eğlenceli mi?" sorusunun cevabı aranır.'], ['Dikey Dilim', 42, '#4dabf7', 'Tek bir bölüm son kalitesine yakın: sanat, ses, UI bir arada.'], ['Alfa', 56, '#ffa94d', 'Tüm özellikler oyunda; içerik eksik olabilir.'], ['Beta', 42, '#20c997', 'İçerik tamam; hata ayıklama ve denge.'], ['Yayın', 14, '#f06595', 'Son kontroller, mağaza sayfası, çıkış!']];
  const day = 86400000;
  const iso = (d) => new Date(d).toISOString().slice(0, 10);

  A.register('roadmap', {
    title: 'Yol Haritası', icon: 'route', group: 'uretim',
    async render(el, [tab]) {
      if (A.needProject(el)) return;
      let ms = [], tasks = [], builds = [];
      tab = tab === 'builds' ? 'builds' : 'timeline';
      el.innerHTML = `<div class="page-head"><div><h1>Yol Haritası</h1><p>Kilometre taşları, ilerleme ve yayınlanan sürümler — projenin büyük resmi.</p></div>
        <div class="actions" id="rmAct"></div></div>
        <div class="tabs"><button data-t="timeline">${A.icon('route')} Zaman çizelgesi</button><button data-t="builds">${A.icon('package')} Sürümler & değişiklik notları</button></div>
        <div id="rmBody"></div>`;
      A.icons(el);
      A.$$('.tabs button', el).forEach((b) => (b.onclick = () => { tab = b.dataset.t; history.replaceState(null, '', '#/roadmap/' + tab); draw(); }));

      const progress = (m) => { const t = tasks.filter((x) => x.milestoneId === m.id); return { total: t.length, done: t.filter((x) => x.status === 'done').length }; };
      const statusOf = (m) => { if (m.status === 'done') return 'done'; if (m.end && A.daysUntil(m.end) < 0) return 'late'; if (m.start && A.daysUntil(m.start) <= 0) return 'active'; return m.status || 'planned'; };

      const draw = () => {
        A.$$('.tabs button', el).forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
        const act = A.$('#rmAct', el);
        act.innerHTML = A.can('create') ? (tab === 'timeline' ? `<button class="btn primary" id="rmNew">${A.icon('plus')} Kilometre taşı</button>` : `<button class="btn primary" id="bdNew">${A.icon('plus')} Yeni sürüm</button>`) : '';
        A.icons(act);
        const nb = A.$('#rmNew', el); if (nb) nb.onclick = () => editMs({});
        const bb = A.$('#bdNew', el); if (bb) bb.onclick = () => editBuild({});
        tab === 'timeline' ? timeline() : buildList();
      };

      const timeline = () => {
        const body = A.$('#rmBody', el);
        const list = [...ms].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
        if (!list.length) {
          body.innerHTML = A.emptyState('route', 'Henüz kilometre taşı yok', 'Projenin aşamalarını planlayın. İsterseniz standart bir oyun geliştirme yol haritasıyla başlayın.', A.can('create') ? `<button class="btn primary" id="rmDef">${A.icon('wand-2')} Standart yol haritası oluştur</button>` : '');
          A.icons(body);
          const d = A.$('#rmDef', body);
          if (d) d.onclick = async () => {
            let t = Date.now();
            for (const [title, len, color, description] of DEFAULT_MS) {
              await A.col.create('milestones', { projectId: A.state.projectId, title, color, description, start: iso(t), end: iso(t + len * day), status: 'planned' }).catch(A.err);
              t += len * day;
            }
            A.toast('Yol haritası oluşturuldu 🗺️', 'ok');
          };
          return;
        }
        const starts = list.map((m) => new Date(m.start || A.today()).getTime());
        const ends = list.map((m) => new Date(m.end || m.start || A.today()).getTime());
        const min = Math.min(...starts, Date.now()) - 7 * day, max = Math.max(...ends, Date.now()) + 14 * day;
        const span = max - min;
        const pos = (t) => ((t - min) / span) * 100;
        const months = [];
        const d0 = new Date(min); d0.setDate(1);
        for (let d = new Date(d0); d.getTime() < max; d.setMonth(d.getMonth() + 1)) months.push(new Date(d));
        body.innerHTML = `<div class="card rm-tl">
            <div class="rm-months">${months.map((m) => `<span style="left:${Math.max(0, pos(m.getTime()))}%">${m.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })}</span>`).join('')}</div>
            <div class="rm-rows">${list.map((m, i) => {
              const s = new Date(m.start || A.today()).getTime(), e = new Date(m.end || m.start || A.today()).getTime() + day;
              const p = progress(m), pct = p.total ? Math.round((p.done / p.total) * 100) : statusOf(m) === 'done' ? 100 : 0;
              return `<div class="rm-row"><div class="rm-bar ${statusOf(m)}" data-id="${m.id}" title="${A.esc(m.title)} · %${pct} · ${A.fmtDate(m.start)} → ${A.fmtDate(m.end)}" style="left:${pos(s)}%;width:${Math.max(2, pos(e) - pos(s))}%;--c:${A.esc(m.color || '#9b87f5')};animation-delay:${i * 70}ms"><i style="width:${pct}%"></i><span>${A.esc(m.title)} · %${pct}</span></div></div>`;
            }).join('')}</div>
            <div class="rm-today" style="left:${pos(Date.now())}%"><span>Bugün</span></div>
          </div>
          <div class="grid auto stagger" style="margin-top:16px">${list.map((m) => {
            const p = progress(m), st = statusOf(m), pct = p.total ? Math.round((p.done / p.total) * 100) : st === 'done' ? 100 : 0;
            const left = m.end ? A.daysUntil(m.end) : null;
            return `<div class="card hover rm-card" data-id="${m.id}" style="--c:${A.esc(m.color || '#9b87f5')}">
              <div class="row"><b class="grow">${A.esc(m.title)}</b><span class="badge" style="background:${MS_STATUS[st][1]}22;color:${MS_STATUS[st][1]}">${MS_STATUS[st][0]}</span></div>
              <div class="small muted" style="margin:4px 0 8px">${A.fmtDate(m.start)} → ${A.fmtDate(m.end)}${left !== null && st !== 'done' ? ` · ${left >= 0 ? left + ' gün kaldı' : Math.abs(left) + ' gün gecikti'}` : ''}</div>
              <p class="small" style="margin:0 0 10px;min-height:36px">${A.esc(m.description || '')}</p>
              <div class="row small muted" style="justify-content:space-between"><span>${p.done}/${p.total} görev</span><b>%${pct}</b></div>
              <div class="progress" style="margin-top:6px"><i style="width:${pct}%;background:var(--c)"></i></div></div>`;
          }).join('')}</div>`;
        A.icons(body);
        A.$$('[data-id]', body).forEach((c) => (c.onclick = () => openMs(ms.find((m) => m.id === c.dataset.id))));
      };

      const openMs = (m) => {
        const linked = tasks.filter((t) => t.milestoneId === m.id);
        const free = tasks.filter((t) => !t.milestoneId && t.status !== 'done');
        const ed = A.canEdit(m);
        const md = A.modal({
          title: m.title, icon: 'flag', size: 'wide',
          body: `<div class="row small muted" style="gap:14px;margin-bottom:10px"><span>${A.icon('calendar')} ${A.fmtDate(m.start)} → ${A.fmtDate(m.end)}</span></div>
            ${m.description ? `<p>${A.esc(m.description)}</p>` : ''}${m.goals ? `<div class="md card" style="margin-bottom:12px">${A.md(m.goals)}</div>` : ''}
            <div class="label" style="margin-bottom:8px">Bu aşamanın görevleri (${linked.length})</div>
            <div class="mini-list">${linked.map((t) => `<div class="mini-item" data-task="${t.id}"><span class="chk ${t.status === 'done' ? 'on' : ''}" style="pointer-events:none"></span><span class="grow">${A.esc(t.title)}</span>${t.assignee ? A.avatar(t.assignee, 'xs') : ''}${ed ? `<button class="btn xs ghost" data-unlink="${t.id}" title="Aşamadan çıkar">${A.icon('x')}</button>` : ''}</div>`).join('') || '<p class="muted small">Henüz bağlı görev yok.</p>'}</div>
            ${ed && free.length ? `<div class="row" style="margin-top:10px"><select class="select sm" id="msAdd"><option value="">Görev ekle...</option>${free.map((t) => `<option value="${t.id}">${A.esc(t.title)}</option>`).join('')}</select></div>` : ''}`,
          foot: `${A.canDelete(m) ? `<button class="btn danger" data-del>${A.icon('trash-2')}</button>` : ''}<span class="spacer"></span>${ed && m.status !== 'done' ? `<button class="btn" data-done>${A.icon('check')} Tamamlandı işaretle</button>` : ''}${ed ? `<button class="btn primary" data-edit>${A.icon('pencil')} Düzenle</button>` : ''}`,
        });
        const on = (s, f) => { const b = A.$(s, md.el); if (b) b.onclick = f; };
        on('[data-edit]', () => { md.close(); editMs(m); });
        on('[data-done]', async () => { await A.col.update('milestones', m.id, { status: 'done' }).catch(A.err); md.close(); A.confetti(80); A.sound('done'); A.toast(`“${m.title}” tamamlandı! 🎉`, 'ok'); });
        on('[data-del]', async () => { if (await A.confirm(`“${m.title}” silinsin mi? Görevler silinmez.`)) { await A.col.remove('milestones', m.id).catch(A.err); md.close(); } });
        A.$$('[data-task]', md.el).forEach((r) => (r.onclick = (e) => { if (e.target.closest('[data-unlink]')) return; md.close(); A.go('tasks/' + r.dataset.task); }));
        A.$$('[data-unlink]', md.el).forEach((b) => (b.onclick = async () => { await A.col.update('tasks', b.dataset.unlink, { milestoneId: null }).catch(A.err); md.close(); }));
        const add = A.$('#msAdd', md.el);
        if (add) add.onchange = async () => { if (add.value) { await A.col.update('tasks', add.value, { milestoneId: m.id }).catch(A.err); md.close(); setTimeout(() => openMs(m), 300); } };
      };

      const editMs = async (m) => {
        const r = await A.form({
          title: m.id ? 'Kilometre taşını düzenle' : 'Yeni kilometre taşı', icon: 'flag',
          fields: [
            { key: 'title', label: 'Başlık', value: m.title, required: true, placeholder: 'Örn: Dikey Dilim' },
            { key: 'start', label: 'Başlangıç', type: 'date', value: m.start || A.today(), half: true },
            { key: 'end', label: 'Bitiş', type: 'date', value: m.end || iso(Date.now() + 28 * day), half: true },
            { key: 'status', label: 'Durum', type: 'select', options: [['planned', 'Planlandı'], ['active', 'Devam ediyor'], ['done', 'Tamamlandı']], value: m.status || 'planned', half: true },
            { key: 'color', label: 'Renk', type: 'color', value: m.color || '#9b87f5', half: true },
            { key: 'description', label: 'Kısa açıklama', value: m.description },
            { key: 'goals', label: 'Hedefler / kabul kriterleri (Markdown)', type: 'textarea', value: m.goals || '- [ ] ', rows: 4 },
          ],
        });
        if (!r) return;
        if (r.end < r.start) r.end = r.start;
        try { if (m.id) await A.col.update('milestones', m.id, r); else await A.col.create('milestones', { ...r, projectId: A.state.projectId }); A.toast('Kaydedildi', 'ok'); } catch (e) { A.err(e); }
      };

      const buildList = () => {
        const body = A.$('#rmBody', el);
        const list = [...builds].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
        body.innerHTML = list.length ? `<div class="bl">${list.map((b) => { const t = BUILD_TYPES[b.type] || BUILD_TYPES.internal; return `<div class="bl-item" style="--c:${t[1]}"><div class="bl-dot"></div><div class="card bl-card">
            <div class="row wrap" style="gap:8px"><b class="bl-ver">v${A.esc(b.version)}</b><span class="badge" style="background:${t[1]}22;color:${t[1]}">${t[0]}</span>${(b.platforms || []).map((p) => `<span class="tag">${A.esc(p)}</span>`).join('')}<span class="spacer"></span><span class="small muted">${A.fmtDate(b.date)}</span>
            ${b.link ? `<a class="btn xs" href="${A.esc(b.link)}" target="_blank" rel="noopener">${A.icon('download')} İndir</a>` : ''}${A.canEdit(b) ? `<button class="btn xs ghost" data-eb="${b.id}">${A.icon('pencil')}</button>` : ''}</div>
            ${b.title ? `<div style="margin-top:4px"><b>${A.esc(b.title)}</b></div>` : ''}
            <div class="md small" style="margin-top:6px">${A.md(b.notes || '')}</div>
            <div class="small muted row" style="gap:6px;margin-top:6px">${A.avatar(b.createdBy, 'xs')} ${A.esc(A.user(b.createdBy).displayName)}</div></div></div>`; }).join('')}</div>`
          : A.emptyState('package', 'Henüz sürüm kaydı yok', 'Her build’i ve değişiklik notlarını burada tutun; ekip ve test edenler neyin değiştiğini bilsin.');
        A.icons(body);
        A.$$('[data-eb]', body).forEach((x) => (x.onclick = () => editBuild(builds.find((b) => b.id === x.dataset.eb))));
      };
      const editBuild = async (b) => {
        const last = [...builds].sort((x, y) => y.createdAt - x.createdAt)[0];
        const next = last ? String(last.version).replace(/(\d+)(?!.*\d)/, (n) => String(Number(n) + 1)) : '0.1.0';
        A._delBuild = async () => {
          const top = A.$('#modalRoot').lastElementChild; if (top) A.$('[data-close]', top).click();
          if (await A.confirm(`v${b.version} silinsin mi?`)) A.col.remove('builds', b.id).catch(A.err);
        };
        const r = await A.form({
          title: b.id ? 'Sürümü düzenle' : 'Yeni sürüm / build', icon: 'package', size: 'wide',
          fields: [
            { key: 'version', label: 'Sürüm', value: b.version || next, required: true, half: true },
            { key: 'type', label: 'Tür', type: 'select', options: Object.entries(BUILD_TYPES).map(([k, v]) => [k, v[0]]), value: b.type || 'internal', half: true },
            { key: 'date', label: 'Tarih', type: 'date', value: b.date || A.today(), half: true },
            { key: 'platforms', label: 'Platformlar (virgülle)', value: (b.platforms || ['Windows']).join(', '), half: true },
            { key: 'title', label: 'Başlık (isteğe bağlı)', value: b.title, placeholder: 'Örn: Boss savaşı eklendi' },
            { key: 'notes', label: 'Değişiklik notları (Markdown)', type: 'textarea', rows: 7, value: b.notes || '### Yenilikler\n- \n\n### Düzeltmeler\n- \n\n### Bilinen sorunlar\n- ' },
            { key: 'link', label: 'İndirme bağlantısı (isteğe bağlı)', value: b.link, placeholder: 'https://...' },
          ],
          extra: b.id && A.canDelete(b) ? `<button type="button" class="btn danger sm" onclick="A._delBuild && A._delBuild()">${A.icon('trash-2')} Sürümü sil</button>` : '',
        });
        if (!r) return;
        const body = { ...r, platforms: A.splitTags(r.platforms), link: /^https?:\/\//.test(r.link || '') ? r.link : '' };
        try { if (b.id) await A.col.update('builds', b.id, body); else { await A.col.create('builds', { ...body, projectId: A.state.projectId }); A.confetti(40); } A.toast('Sürüm kaydedildi', 'ok'); } catch (e) { A.err(e); }
      };

      const load = async () => { [ms, tasks, builds] = await Promise.all([A.col.project('milestones'), A.col.project('tasks'), A.col.project('builds')]); draw(); };
      await load();
      const reload = A.debounce(load, 300);
      A.viewOn('db', (p) => { if (['milestones', 'tasks', 'builds'].includes(p.col)) reload(); });
    },
  });
})();
