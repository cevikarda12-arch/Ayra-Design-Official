/* Oyun Testleri (Playtest) — test oturumları ve oyuncu geri bildirimleri */
(function () {
  const METRICS = [['fun', 'Eğlence'], ['difficulty', 'Zorluk dengesi'], ['clarity', 'Anlaşılırlık'], ['visual', 'Görsellik'], ['audio', 'Ses'], ['controls', 'Kontroller']];
  const avg = (fb, k) => { const v = fb.map((f) => f.ratings && f.ratings[k]).filter((x) => x); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0; };
  const stars = (n, k = '') => `<span class="stars" ${k ? `data-k="${k}"` : ''}>${[1, 2, 3, 4, 5].map((i) => `<i data-v="${i}" class="${i <= Math.round(n) ? 'on' : ''}">★</i>`).join('')}</span>`;

  A.register('playtests', {
    title: 'Oyun Testleri', icon: 'flask-conical', group: 'uretim',
    async render(el, [openId]) {
      if (A.needProject(el)) return;
      let tests = await A.col.project('playtests');
      el.innerHTML = `<div class="page-head"><div><h1>Oyun Testleri</h1><p>Playtest oturumlarını planlayın, oyuncu geri bildirimlerini toplayın ve puanları karşılaştırın.</p></div>
        <div class="actions">${A.can('create') ? `<button class="btn primary" id="ptNew">${A.icon('plus')} Test oturumu</button>` : ''}</div></div>
        <div class="grid auto stagger" id="ptList"></div>`;
      A.icons(el);
      const nb = A.$('#ptNew', el);
      if (nb) nb.onclick = async () => {
        const r = await A.form({ title: 'Yeni Test Oturumu', icon: 'flask-conical', fields: [
          { key: 'title', label: 'Başlık', required: true, value: 'Playtest #' + (tests.length + 1) },
          { key: 'date', label: 'Tarih', type: 'date', value: A.today(), half: true }, { key: 'build', label: 'Build / Sürüm', placeholder: 'v0.2', half: true },
          { key: 'goals', label: 'Test hedefleri', type: 'textarea', rows: 3, placeholder: 'Bu testte neyi öğrenmek istiyoruz?' },
        ] });
        if (r) try { await A.col.create('playtests', { ...r, projectId: A.state.projectId, feedback: [] }); A.toast('Test oturumu oluşturuldu', 'ok'); } catch (e) { A.err(e); }
      };
      const draw = () => {
        const box = A.$('#ptList', el);
        box.innerHTML = tests.length ? tests.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((t) => {
          const fb = t.feedback || [];
          return `<div class="card hover" data-id="${t.id}"><div class="row"><b class="grow">${A.esc(t.title)}</b>${t.build ? `<span class="badge blue">${A.esc(t.build)}</span>` : ''}</div>
            <div class="small muted" style="margin:4px 0 10px">${A.icon('calendar')} ${A.fmtDate(t.date)} · ${fb.length} geri bildirim</div>
            ${METRICS.slice(0, 4).map(([k, l]) => `<div class="row small" style="justify-content:space-between"><span class="muted">${l}</span>${stars(avg(fb, k))}</div>`).join('')}</div>`;
        }).join('') : A.emptyState('flask-conical', 'Henüz test oturumu yok', 'İlk playtest oturumunuzu oluşturun ve oyuncu geri bildirimlerini toplayın.');
        A.icons(box);
        A.$$('[data-id]', box).forEach((c) => (c.onclick = () => open(c.dataset.id)));
      };
      const open = (id) => {
        const t = tests.find((x) => x.id === id);
        if (!t) return;
        const m = A.modal({ title: t.title, icon: 'flask-conical', size: 'xwide', body: '<div id="ptBody"></div>', foot: `${A.canDelete(t) ? `<button class="btn danger" data-del>${A.icon('trash-2')} Sil</button>` : ''}<span class="spacer"></span><button class="btn" data-close>Kapat</button>` });
        const del = A.$('[data-del]', m.el);
        if (del) del.onclick = async () => { if (await A.confirm('Test oturumu silinsin mi?')) { await A.col.remove('playtests', t.id).catch(A.err); m.close(); } };
        const body = A.$('#ptBody', m.el);
        const render = () => {
          const fb = t.feedback || [];
          body.innerHTML = `<div class="pt-detail"><div>
            <div class="row wrap small muted" style="gap:12px;margin-bottom:10px"><span>${A.icon('calendar')} ${A.fmtDate(t.date)}</span>${t.build ? `<span>${A.icon('package')} ${A.esc(t.build)}</span>` : ''}<span>${A.icon('users')} ${fb.length} katılımcı</span></div>
            ${t.goals ? `<div class="card" style="margin-bottom:14px"><div class="label">Hedefler</div><div class="md small">${A.md(t.goals)}</div></div>` : ''}
            <div class="card"><div class="card-title">${A.icon('bar-chart-3')} Ortalama puanlar</div>${METRICS.map(([k, l]) => { const a = avg(fb, k); return `<div class="bar-row"><span style="width:120px">${l}</span><div class="progress grow"><i style="width:${(a / 5) * 100}%"></i></div><b style="width:40px;text-align:right">${a ? a.toFixed(1) : '—'}</b></div>`; }).join('')}</div>
            <div class="label" style="margin:16px 0 8px">Geri bildirimler</div>
            ${fb.map((f, i) => `<div class="card fb"><div class="row"><b>${A.esc(f.tester || 'Anonim')}</b><span class="small muted">${A.timeAgo(f.at)}</span><span class="spacer"></span>${A.can('create') ? `<button class="btn xs" data-task="${i}" title="Göreve dönüştür">${A.icon('check-square')}</button>` : ''}${f.by === A.state.user.id || A.can('delete_all') ? `<button class="btn xs ghost" data-rm="${i}">${A.icon('trash-2')}</button>` : ''}</div>
              <div class="row wrap small" style="gap:10px;margin:6px 0">${METRICS.map(([k, l]) => f.ratings && f.ratings[k] ? `<span class="muted">${l}: <b style="color:var(--yellow)">${f.ratings[k]}★</b></span>` : '').join('')}</div>
              ${f.liked ? `<div class="small">👍 <b>Beğendiği:</b> ${A.esc(f.liked)}</div>` : ''}${f.disliked ? `<div class="small">👎 <b>Zorlandığı:</b> ${A.esc(f.disliked)}</div>` : ''}${f.notes ? `<div class="small muted" style="margin-top:4px">${A.esc(f.notes)}</div>` : ''}</div>`).join('') || '<p class="muted small">Henüz geri bildirim yok.</p>'}
          </div>
          <div class="card"><div class="card-title">${A.icon('plus')} Geri bildirim ekle</div>
            <div class="field"><label>Test eden kişi</label><input class="input sm" id="fbT" placeholder="Ad veya takma ad"></div>
            ${METRICS.map(([k, l]) => `<div class="row small" style="justify-content:space-between;margin-bottom:6px"><span>${l}</span>${stars(0, k)}</div>`).join('')}
            <div class="field" style="margin-top:10px"><label>En çok beğendiği</label><input class="input sm" id="fbL"></div>
            <div class="field"><label>Zorlandığı / sevmediği</label><input class="input sm" id="fbD"></div>
            <div class="field"><label>Notlar</label><textarea class="textarea" id="fbN" rows="3"></textarea></div>
            <button class="btn primary block" id="fbAdd">Kaydet</button></div></div>`;
          A.icons(body);
          const ratings = {};
          A.$$('.stars[data-k]', body).forEach((s) => A.$$('i', s).forEach((i) => (i.onclick = () => { ratings[s.dataset.k] = +i.dataset.v; A.$$('i', s).forEach((x) => x.classList.toggle('on', +x.dataset.v <= +i.dataset.v)); })));
          A.$('#fbAdd', body).onclick = async () => {
            const f = { tester: A.$('#fbT', body).value.trim(), ratings, liked: A.$('#fbL', body).value.trim(), disliked: A.$('#fbD', body).value.trim(), notes: A.$('#fbN', body).value.trim(), at: Date.now(), by: A.state.user.id };
            if (!Object.keys(ratings).length && !f.notes && !f.liked && !f.disliked) return A.toast('En az bir puan veya not girin', 'err');
            t.feedback = [...(t.feedback || []), f];
            try { await A.col.update('playtests', t.id, { feedback: t.feedback }); A.toast('Geri bildirim eklendi', 'ok'); render(); } catch (e) { A.err(e); }
          };
          A.$$('[data-rm]', body).forEach((x) => (x.onclick = async () => { t.feedback.splice(+x.dataset.rm, 1); await A.col.update('playtests', t.id, { feedback: t.feedback }).catch(A.err); render(); }));
          A.$$('[data-task]', body).forEach((x) => (x.onclick = async () => { const f = t.feedback[+x.dataset.task]; try { await A.col.create('tasks', { projectId: A.state.projectId, title: `Playtest: ${(f.disliked || f.notes || f.liked || 'geri bildirim').slice(0, 80)}`, description: `**${t.title}** oturumundan (${A.esc(f.tester || 'Anonim')})\n\n${f.notes || ''}`, status: 'todo', priority: 'medium', category: 'QA', tags: ['playtest'], checklist: [], comments: [] }); A.toast('Göreve dönüştürüldü', 'ok'); } catch (e) { A.err(e); } }));
        };
        render();
      };
      draw();
      if (openId) open(openId);
      A.viewOn('db:playtests', (p) => {
        if (p.item.projectId && p.item.projectId !== A.state.projectId) return;
        if (p.action === 'delete') tests = tests.filter((t) => t.id !== p.item.id);
        else { const i = tests.findIndex((t) => t.id === p.item.id); if (i >= 0) Object.assign(tests[i], p.item); else tests.push(p.item); }
        draw();
      });
    },
  });
})();
