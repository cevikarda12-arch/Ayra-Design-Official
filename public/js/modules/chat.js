/* Sohbet Odaları — kanallar, özel odalar ve birebir mesajlar */
(function () {
  const EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '😮', '😢', '🚀', '✅', '💡', '🎮', '🎨', '🐛', '💯', '🙏'];
  const PICKER = '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 😜 🤪 🤗 🤔 🤨 😐 😑 😶 🙄 😏 😬 😌 😴 🥳 😎 🤓 🧐 😕 😟 😮 😲 😳 🥺 😢 😭 😱 😤 😡 🤯 💀 👻 👽 🤖 💩 👍 👎 👏 🙌 🙏 💪 👀 🧠 ❤️ 🧡 💛 💚 💙 💜 🖤 💯 ✨ ⭐ 🔥 💥 🎉 🎊 🎮 🕹️ 🎲 🎯 🏆 🎨 🖌️ ✏️ 📝 📌 📎 💡 🐛 🛠️ ⚙️ 🚀 ✅ ❌ ⚠️ ⏰ ☕ 🍕'.split(' ');

  A.register('chat', {
    title: 'Sohbet Odaları', icon: 'messages-square', group: 'iletisim', full: true, scoped: false,
    async render(el, [openId]) {
      let rooms = [];
      let room = null;
      let messages = [];
      let replyTo = null;
      let editing = null;
      const typing = new Map();
      el.innerHTML = `<div class="chat">
        <aside class="chat-side">
          <div class="chat-side-head"><b>Sohbet</b><span class="spacer"></span>${A.can('create') ? `<button class="btn xs" id="cNew" title="Yeni oda">${A.icon('plus')}</button>` : ''}</div>
          <div class="chat-rooms" id="cRooms"></div>
        </aside>
        <section class="chat-main" id="cMain"></section>
        <aside class="chat-info hidden" id="cInfo"></aside></div>`;
      A.icons(el);
      const nb = A.$('#cNew', el);
      if (nb) nb.onclick = newRoom;

      const roomName = (r) => {
        if (r.type === 'dm') { const other = r.members.find((id) => id !== A.state.user.id) || A.state.user.id; return A.user(other).displayName; }
        return r.name;
      };
      const drawRooms = () => {
        const box = A.$('#cRooms', el);
        if (!box) return;
        const chans = rooms.filter((r) => r.type === 'channel');
        const priv = rooms.filter((r) => r.type === 'private');
        const dms = rooms.filter((r) => r.type === 'dm');
        const item = (r) => {
          const icon = r.type === 'dm' ? A.avatar(r.members.find((id) => id !== A.state.user.id) || A.state.user.id, 'xs', true) : `<span class="ch-ico">${r.type === 'private' ? A.icon('lock') : A.esc(r.icon || '#')}</span>`;
          return `<button class="room ${room && room.id === r.id ? 'on' : ''} ${r.unread ? 'unread' : ''}" data-id="${r.id}">${icon}<span class="grow ell">${A.esc(roomName(r))}</span>${r.unread ? `<span class="badge count">${r.unread}</span>` : ''}</button>`;
        };
        const others = A.activeUsers().filter((u) => u.id !== A.state.user.id && !dms.some((d) => d.members.includes(u.id)));
        box.innerHTML = `<div class="room-sec">Kanallar</div>${chans.map(item).join('')}
          ${priv.length ? `<div class="room-sec">Özel Odalar</div>${priv.map(item).join('')}` : ''}
          <div class="room-sec">Direkt Mesajlar</div>${dms.map(item).join('')}
          ${others.map((u) => `<button class="room dim" data-dm="${u.id}">${A.avatar(u, 'xs', true)}<span class="grow ell">${A.esc(u.displayName)}</span></button>`).join('')}`;
        A.icons(box);
        A.$$('[data-id]', box).forEach((b) => (b.onclick = () => openRoom(b.dataset.id)));
        A.$$('[data-dm]', box).forEach((b) => (b.onclick = () => openDm(b.dataset.dm)));
        A.unread.chat = rooms.reduce((s, r) => s + (r.unread || 0), 0);
        A.renderNav();
      };
      const openDm = async (userId) => {
        try {
          const r = await A.post('/api/rooms', { type: 'dm', userId });
          if (!rooms.find((x) => x.id === r.id)) rooms.push(r);
          openRoom(r.id);
        } catch (e) { A.err(e); }
      };
      A.chatOpenDm = openDm;

      const openRoom = async (id) => {
        room = rooms.find((r) => r.id === id) || rooms[0];
        if (!room) return;
        A.chatRoomId = room.id;
        room.unread = 0;
        replyTo = null; editing = null;
        if (location.hash !== '#/chat/' + room.id) history.replaceState(null, '', '#/chat/' + room.id);
        drawRooms();
        const main = A.$('#cMain', el);
        const isDm = room.type === 'dm';
        const other = isDm ? A.user(room.members.find((x) => x !== A.state.user.id) || A.state.user.id) : null;
        main.innerHTML = `
          <div class="chat-head">
            ${isDm ? A.avatar(other, 'sm', true) : `<span class="ch-ico big">${room.type === 'private' ? A.icon('lock') : A.esc(room.icon || '#')}</span>`}
            <div class="grow"><b>${isDm ? A.esc(other.displayName) : '#' + A.esc(room.name)}</b><div class="small muted ell">${isDm ? A.esc(A.PRESENCE[A.presenceOf(other)] + (other.statusText ? ' · ' + other.statusText : '')) : A.esc(room.topic || '')}</div></div>
            <div class="input-icon" style="width:190px">${A.icon('search')}<input class="input sm" id="cSearch" placeholder="Mesajlarda ara"></div>
            <button class="btn icon sm ghost" id="cPins" title="Sabitlenmiş mesajlar">${A.icon('pin')}</button>
            ${!isDm ? `<button class="btn icon sm ghost" id="cInfoBtn" title="Oda bilgisi">${A.icon('info')}</button>` : ''}
          </div>
          <div class="chat-msgs" id="cMsgs"><div class="loader"></div></div>
          <div class="chat-typing" id="cTyping"></div>
          <div class="chat-compose">
            <div id="cReply"></div>
            <div class="cc-box">
              <button class="btn icon sm ghost" id="cAttach" title="Dosya ekle">${A.icon('paperclip')}</button>
              <textarea id="cInput" rows="1" placeholder="${room.readonly && !A.can('announce') ? 'Bu odaya yalnızca yöneticiler yazabilir' : 'Mesaj yaz... (@kullanici ile bahset)'}" ${room.readonly && !A.can('announce') ? 'disabled' : ''}></textarea>
              <button class="btn icon sm ghost" id="cEmoji" title="Emoji">${A.icon('smile')}</button>
              <button class="btn icon sm primary" id="cSend" title="Gönder">${A.icon('send')}</button>
            </div>
            <div class="small muted" style="padding:4px 4px 0">Enter gönder · Shift+Enter yeni satır · **kalın**, *italik*, \`kod\` desteklenir</div>
          </div>`;
        A.icons(main);
        const input = A.$('#cInput', main);
        const autosize = () => { input.style.height = 'auto'; input.style.height = Math.min(160, input.scrollHeight) + 'px'; };
        let lastTyping = 0;
        input.oninput = () => { autosize(); if (Date.now() - lastTyping > 2000) { lastTyping = Date.now(); A.state.socket.emit('chat:typing', { roomId: room.id }); } };
        input.onkeydown = (e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
          if (e.key === 'ArrowUp' && !input.value) { const mine = [...messages].reverse().find((m) => m.userId === A.state.user.id); if (mine) startEdit(mine); }
          if (e.key === 'Escape') { replyTo = null; editing = null; drawReply(); input.value = ''; }
        };
        A.$('#cSend', main).onclick = send;
        A.$('#cEmoji', main).onclick = (e) => emojiPicker(e.currentTarget, (em) => { input.setRangeText(em, input.selectionStart, input.selectionEnd, 'end'); input.focus(); });
        A.$('#cAttach', main).onclick = async () => {
          const files = await A.pickFile('*/*', true);
          if (!files || !files.length) return;
          try {
            const atts = [];
            for (const f of files.slice(0, 6)) { const up = await A.upload(f, { hidden: true }); atts.push({ url: up.url, name: up.name, type: up.type }); }
            A.state.socket.emit('chat:send', { roomId: room.id, text: input.value.trim(), attachments: atts, replyTo: replyTo && replyTo.id }, (r) => { if (r && r.error) A.toast(r.error, 'err'); });
            input.value = ''; replyTo = null; drawReply();
          } catch (er) { A.err(er); }
        };
        A.$('#cSearch', main).oninput = (e) => drawMsgs(e.target.value.trim().toLocaleLowerCase('tr'));
        A.$('#cPins', main).onclick = showPins;
        const ib = A.$('#cInfoBtn', main);
        if (ib) ib.onclick = toggleInfo;
        // dosya sürükle-bırak
        main.ondragover = (e) => { e.preventDefault(); main.classList.add('drop'); };
        main.ondragleave = (e) => { if (!main.contains(e.relatedTarget)) main.classList.remove('drop'); };
        main.ondrop = async (e) => {
          e.preventDefault(); main.classList.remove('drop');
          const files = [...e.dataTransfer.files];
          if (!files.length) return;
          try { const atts = []; for (const f of files.slice(0, 6)) { const up = await A.upload(f, { hidden: true }); atts.push({ url: up.url, name: up.name, type: up.type }); } A.state.socket.emit('chat:send', { roomId: room.id, text: '', attachments: atts }); } catch (er) { A.err(er); }
        };
        const msgsEl = A.$('#cMsgs', main);
        msgsEl.onscroll = async () => {
          if (msgsEl.scrollTop < 40 && messages.length && !msgsEl.dataset.loading && !msgsEl.dataset.end) {
            msgsEl.dataset.loading = '1';
            const older = await A.get(`/api/rooms/${room.id}/messages?before=${messages[0].createdAt}&limit=50`);
            if (!older.length) msgsEl.dataset.end = '1';
            const h = msgsEl.scrollHeight;
            messages = [...older, ...messages];
            drawMsgs();
            msgsEl.scrollTop = msgsEl.scrollHeight - h;
            delete msgsEl.dataset.loading;
          }
        };
        messages = await A.get(`/api/rooms/${room.id}/messages?limit=80`);
        drawMsgs();
        scrollBottom(true);
        A.post(`/api/rooms/${room.id}/read`);
        input.focus();
        if (!A.$('#cInfo', el).classList.contains('hidden')) drawInfo();
      };

      const send = () => {
        const input = A.$('#cInput', el);
        const text = input.value.trim();
        if (!text) return;
        if (editing) {
          A.state.socket.emit('chat:edit', { id: editing.id, text });
          editing = null;
        } else {
          A.state.socket.emit('chat:send', { roomId: room.id, text, replyTo: replyTo && replyTo.id }, (r) => { if (r && r.error) A.toast(r.error, 'err'); });
        }
        input.value = ''; input.style.height = 'auto';
        replyTo = null; drawReply();
      };
      const startEdit = (m) => {
        editing = m; replyTo = null;
        const input = A.$('#cInput', el);
        input.value = m.text; input.focus();
        drawReply();
      };
      const drawReply = () => {
        const box = A.$('#cReply', el);
        if (!box) return;
        const target = editing || replyTo;
        box.innerHTML = target ? `<div class="reply-bar">${A.icon(editing ? 'pencil' : 'reply')}<span class="grow ell">${editing ? 'Mesajı düzenliyorsun' : `<b>${A.esc(A.user(replyTo.userId).displayName)}</b> kişisine yanıt: ${A.esc((replyTo.text || '').slice(0, 80))}`}</span><button class="btn xs ghost">${A.icon('x')}</button></div>` : '';
        A.icons(box);
        const b = A.$('button', box);
        if (b) b.onclick = () => { replyTo = null; if (editing) { editing = null; A.$('#cInput', el).value = ''; } drawReply(); };
      };

      const msgHtml = (m, grouped) => {
        const u = A.user(m.userId);
        const mine = m.userId === A.state.user.id;
        const reply = m.replyTo ? messages.find((x) => x.id === m.replyTo) : null;
        const atts = (m.attachments || []).map((a) => a.type && a.type.startsWith('image/') ? `<a href="${A.esc(a.url)}" target="_blank" class="att-img"><img src="${A.esc(a.url)}" alt="${A.esc(a.name)}" loading="lazy"></a>` : a.type && a.type.startsWith('audio/') ? `<audio controls src="${A.esc(a.url)}"></audio>` : a.type && a.type.startsWith('video/') ? `<video controls src="${A.esc(a.url)}" style="max-width:360px;border-radius:10px"></video>` : `<a class="att-file" href="${A.esc(a.url)}" download="${A.esc(a.name)}">${A.icon('file')}<span>${A.esc(a.name)}</span>${A.icon('download')}</a>`).join('');
        const reacts = Object.entries(m.reactions || {}).map(([em, ids]) => `<button class="react ${ids.includes(A.state.user.id) ? 'mine' : ''}" data-react="${A.esc(em)}" title="${A.esc(ids.map((id) => A.user(id).displayName).join(', '))}">${em} <b>${ids.length}</b></button>`).join('');
        return `<div class="msg ${grouped ? 'grouped' : ''} ${m.pinned ? 'pinned' : ''} ${new RegExp('@(herkes|everyone|' + A.state.user.username.replace(/[.]/g, '\\.') + ')(?![a-z0-9_.-])', 'i').test(m.text || '') ? 'mention-me' : ''}" data-id="${m.id}">
          <div class="msg-av">${grouped ? `<span class="msg-time-sm">${A.fmtTime(m.createdAt)}</span>` : A.avatar(u, '')}</div>
          <div class="msg-body">
            ${grouped ? '' : `<div class="msg-head"><b style="color:${A.esc(u.avatarColor)}">${A.esc(u.displayName)}</b>${A.state.roles[u.role] && u.role !== 'member' ? A.roleBadge(u.role) : ''}<span class="small muted">${A.fmtTime(m.createdAt)}</span>${m.pinned ? `<span class="badge yellow">${A.icon('pin')} Sabit</span>` : ''}</div>`}
            ${reply ? `<div class="msg-reply">${A.icon('corner-down-right')}<b>${A.esc(A.user(reply.userId).displayName)}</b> ${A.esc((reply.text || '📎').slice(0, 80))}</div>` : ''}
            ${m.text ? `<div class="msg-text md">${A.md(m.text)}${m.editedAt ? '<span class="small muted"> (düzenlendi)</span>' : ''}</div>` : ''}
            ${atts ? `<div class="msg-atts">${atts}</div>` : ''}
            ${reacts ? `<div class="reacts">${reacts}</div>` : ''}
          </div>
          <div class="msg-actions">
            ${EMOJIS.slice(0, 4).map((e) => `<button data-qr="${e}">${e}</button>`).join('')}
            <button data-act="react" title="Tepki">${A.icon('smile')}</button>
            <button data-act="reply" title="Yanıtla">${A.icon('reply')}</button>
            <button data-act="pin" title="Sabitle">${A.icon('pin')}</button>
            ${mine ? `<button data-act="edit" title="Düzenle">${A.icon('pencil')}</button>` : ''}
            ${mine || A.can('manage_rooms') ? `<button data-act="del" title="Sil">${A.icon('trash-2')}</button>` : ''}
          </div></div>`;
      };
      const drawMsgs = (q = '') => {
        const box = A.$('#cMsgs', el);
        if (!box) return;
        const list = q ? messages.filter((m) => (m.text || '').toLocaleLowerCase('tr').includes(q)) : messages;
        let html = '', lastDay = '', last = null;
        if (!list.length) html = `<div class="chat-welcome"><div class="cw-ico">${room.type === 'dm' ? A.icon('message-circle') : A.esc(room.icon || '#')}</div><h2>${room.type === 'dm' ? A.esc(roomName(room)) + ' ile sohbetin başlangıcı' : '#' + A.esc(room.name) + ' kanalına hoş geldin!'}</h2><p class="muted">${q ? 'Aramayla eşleşen mesaj yok.' : 'Bu, sohbetin en başı. İlk mesajı sen gönder! 👋'}</p></div>`;
        list.forEach((m) => {
          const day = new Date(m.createdAt).toDateString();
          if (day !== lastDay) { html += `<div class="day-sep"><span>${A.fmtDate(m.createdAt, { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>`; lastDay = day; last = null; }
          const grouped = last && last.userId === m.userId && m.createdAt - last.createdAt < 5 * 60 * 1000 && !m.replyTo;
          html += msgHtml(m, grouped);
          last = m;
        });
        box.innerHTML = html;
        A.icons(box);
        A.$$('.msg', box).forEach((d) => {
          const m = messages.find((x) => x.id === d.dataset.id);
          d.querySelectorAll('[data-qr]').forEach((b) => (b.onclick = () => A.state.socket.emit('chat:react', { id: m.id, emoji: b.dataset.qr })));
          d.querySelectorAll('[data-react]').forEach((b) => (b.onclick = () => A.state.socket.emit('chat:react', { id: m.id, emoji: b.dataset.react })));
          d.querySelectorAll('[data-act]').forEach((b) => (b.onclick = async () => {
            const a = b.dataset.act;
            if (a === 'react') emojiPicker(b, (em) => A.state.socket.emit('chat:react', { id: m.id, emoji: em }));
            if (a === 'reply') { replyTo = m; editing = null; drawReply(); A.$('#cInput', el).focus(); }
            if (a === 'pin') A.state.socket.emit('chat:pin', { id: m.id });
            if (a === 'edit') startEdit(m);
            if (a === 'del' && (await A.confirm('Mesaj silinsin mi?'))) A.state.socket.emit('chat:delete', { id: m.id });
          }));
        });
        A.$$('.mention', box).forEach((s) => { s.style.cursor = 'pointer'; s.onclick = () => { const u = A.activeUsers().find((x) => '@' + x.username === s.textContent.toLowerCase()); if (u) A.showUser(u.id); }; });
        A.$$('.msg-head b, .msg-av .avatar', box).forEach((n) => { n.style.cursor = 'pointer'; n.onclick = () => { const m = messages.find((x) => x.id === n.closest('.msg').dataset.id); if (m) A.showUser(m.userId); }; });
      };
      const scrollBottom = (force) => {
        const box = A.$('#cMsgs', el);
        if (!box) return;
        const near = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
        if (force || near) box.scrollTop = box.scrollHeight;
      };

      const showPins = () => {
        const pins = messages.filter((m) => m.pinned);
        A.modal({ title: 'Sabitlenmiş Mesajlar', icon: 'pin', body: pins.length ? pins.map((m) => `<div class="comment">${A.avatar(m.userId, 'sm')}<div><b>${A.esc(A.user(m.userId).displayName)}</b> <span class="small muted">${A.timeAgo(m.createdAt)}</span><div class="md">${A.md(m.text || '📎 Dosya')}</div></div></div>`).join('') : '<p class="muted">Bu odada sabitlenmiş mesaj yok. Bir mesajın üzerine gelip 📌 simgesine tıklayın.</p>' });
      };

      const toggleInfo = () => { const box = A.$('#cInfo', el); box.classList.toggle('hidden'); if (!box.classList.contains('hidden')) drawInfo(); };
      const drawInfo = () => {
        const box = A.$('#cInfo', el);
        if (!room || room.type === 'dm') { box.classList.add('hidden'); return; }
        const members = room.type === 'channel' ? A.activeUsers() : room.members.map((id) => A.user(id));
        const canManage = room.createdBy === A.state.user.id || A.can('manage_rooms');
        const files = messages.flatMap((m) => m.attachments || []);
        box.innerHTML = `<div class="row"><b>Oda Bilgisi</b><span class="spacer"></span><button class="btn xs ghost" id="ciClose">${A.icon('x')}</button></div>
          <h3 style="margin:14px 0 4px">${room.type === 'private' ? A.icon('lock') : A.esc(room.icon || '#')} ${A.esc(room.name)}</h3>
          <p class="small muted">${A.esc(room.topic || 'Konu belirtilmemiş')}</p>
          ${canManage ? `<div class="row" style="gap:6px;margin-bottom:12px"><button class="btn xs" id="ciEdit">${A.icon('pencil')} Düzenle</button>${!room.locked ? `<button class="btn xs danger" id="ciDel">${A.icon('trash-2')} Sil</button>` : ''}</div>` : ''}
          <div class="label" style="margin:10px 0 8px">Üyeler (${members.length})</div>
          ${members.map((u) => `<div class="row" style="gap:8px;margin-bottom:8px;cursor:pointer" data-u="${u.id}">${A.avatar(u, 'sm', true)}<div class="grow"><div class="small"><b>${A.esc(u.displayName)}</b></div><div class="small muted">${A.esc(u.title || '')}</div></div></div>`).join('')}
          ${files.length ? `<div class="label" style="margin:14px 0 8px">Paylaşılan dosyalar (${files.length})</div><div class="ci-files">${files.slice(-12).map((f) => f.type && f.type.startsWith('image/') ? `<a href="${A.esc(f.url)}" target="_blank"><img src="${A.esc(f.url)}"></a>` : `<a href="${A.esc(f.url)}" download class="small ell">${A.esc(f.name)}</a>`).join('')}</div>` : ''}`;
        A.icons(box);
        A.$('#ciClose', box).onclick = toggleInfo;
        A.$$('[data-u]', box).forEach((d) => (d.onclick = () => A.showUser(d.dataset.u)));
        const ed = A.$('#ciEdit', box);
        if (ed) ed.onclick = async () => {
          const fields = [{ key: 'name', label: 'Oda adı', value: room.name, required: true }, { key: 'topic', label: 'Konu', value: room.topic }];
          if (room.type === 'private') fields.push({ key: 'members', label: 'Üyeler', type: 'html', html: memberPicker(room.members) });
          const r = await A.form({ title: 'Odayı düzenle', icon: 'hash', fields });
          if (!r) return;
          const body = { name: r.name, topic: r.topic };
          if (room.type === 'private') body.members = A.$$('.mp input:checked', document).map((c) => c.value);
          try { await A.put('/api/rooms/' + room.id, body); } catch (e) { A.err(e); }
        };
        const dl = A.$('#ciDel', box);
        if (dl) dl.onclick = async () => { if (await A.confirm(`#${room.name} odası ve tüm mesajları silinecek.`)) A.del('/api/rooms/' + room.id).catch(A.err); };
      };

      async function newRoom() {
        let picked = [];
        const r = await A.form({
          title: 'Yeni Sohbet Odası', icon: 'hash',
          fields: [
            { key: 'name', label: 'Oda adı', required: true, placeholder: 'ornek-oda' },
            { key: 'icon', label: 'Simge (emoji)', value: '💬', half: true },
            { key: 'type', label: 'Tür', type: 'select', options: [['channel', 'Herkese açık kanal'], ['private', 'Özel oda (davetli)']], half: true },
            { key: 'topic', label: 'Konu', placeholder: 'Bu oda ne hakkında?' },
            { key: 'members', label: 'Özel oda üyeleri', type: 'html', html: memberPicker([]) },
          ],
        });
        if (!r) return;
        picked = A.$$('.mp input:checked', document).map((c) => c.value);
        try {
          const nr = await A.post('/api/rooms', { ...r, members: picked });
          if (!rooms.find((x) => x.id === nr.id)) rooms.push(nr);
          openRoom(nr.id);
        } catch (e) { A.err(e); }
      }
      const memberPicker = (sel) => `<div class="mp">${A.activeUsers().filter((u) => u.id !== A.state.user.id).map((u) => `<label>${A.avatar(u, 'xs')}<span class="grow">${A.esc(u.displayName)}</span><input type="checkbox" value="${u.id}" ${sel.includes(u.id) ? 'checked' : ''}></label>`).join('') || '<span class="muted small">Başka kullanıcı yok</span>'}</div>`;

      // ---------------------------------------------------------------- live
      A.viewOn('chat:message', (m) => {
        const r = rooms.find((x) => x.id === m.roomId);
        if (r) r.lastMessage = m;
        if (room && m.roomId === room.id) {
          messages.push(m);
          typing.delete(m.userId); drawTyping();
          drawMsgs();
          scrollBottom(m.userId === A.state.user.id);
          if (!document.hidden) A.post(`/api/rooms/${room.id}/read`);
          const last = A.$('#cMsgs .msg:last-child', el);
          if (last) last.classList.add('msg-new');
        } else if (r && m.userId !== A.state.user.id) { r.unread = (r.unread || 0) + 1; drawRooms(); }
      });
      A.viewOn('chat:updated', (m) => { const i = messages.findIndex((x) => x.id === m.id); if (i >= 0) { messages[i] = m; drawMsgs(); } });
      A.viewOn('chat:deleted', (m) => { messages = messages.filter((x) => x.id !== m.id); drawMsgs(); });
      A.viewOn('chat:typing', (d) => {
        if (!room || d.roomId !== room.id) return;
        typing.set(d.userId, Date.now());
        drawTyping();
      });
      A.viewInterval(() => { const now = Date.now(); let ch = false; typing.forEach((t, k) => { if (now - t > 3500) { typing.delete(k); ch = true; } }); if (ch) drawTyping(); }, 1000);
      const drawTyping = () => {
        const box = A.$('#cTyping', el);
        if (!box) return;
        const names = [...typing.keys()].map((id) => A.user(id).displayName);
        box.innerHTML = names.length ? `<span class="dots"><i></i><i></i><i></i></span> <b>${A.esc(names.join(', '))}</b> yazıyor...` : '';
      };
      A.viewOn('room:created', (r) => { if (!rooms.find((x) => x.id === r.id)) { rooms.push({ ...r, unread: 0 }); drawRooms(); } });
      A.viewOn('room:updated', (r) => {
        const i = rooms.findIndex((x) => x.id === r.id);
        const visible = r.type === 'channel' || (r.members || []).includes(A.state.user.id);
        if (i >= 0 && !visible) { rooms.splice(i, 1); if (room && room.id === r.id) openRoom(rooms[0] && rooms[0].id); }
        else if (i >= 0) { rooms[i] = { ...rooms[i], ...r }; if (room && room.id === r.id) { room = rooms[i]; const ib = A.$('#cInfo', el); if (!ib.classList.contains('hidden')) drawInfo(); } }
        else if (visible) rooms.push(r);
        drawRooms();
      });
      A.viewOn('room:deleted', ({ id }) => { rooms = rooms.filter((r) => r.id !== id); if (room && room.id === id) { A.toast('Oda silindi', 'info'); openRoom(rooms[0] && rooms[0].id); } else drawRooms(); });
      A.viewOn('presence', drawRooms);
      A.viewOn('reconnect', () => room && openRoom(room.id));

      rooms = await A.get('/api/rooms');
      const def = rooms.find((r) => r.id === openId) || rooms.find((r) => r.id === A.ls.get('room')) || rooms[0];
      drawRooms();
      if (def) openRoom(def.id);
      else A.$('#cMain', el).innerHTML = A.emptyState('messages-square', 'Henüz oda yok', 'Yeni bir sohbet odası oluşturun.');
      this.destroy = () => { if (room) A.ls.set('room', room.id); A.chatRoomId = null; A.refreshChatUnread(); };
    },
  });

  function emojiPicker(anchor, cb) {
    A.closeMenu();
    const dd = A.h(`<div class="dropdown emoji-pick">${PICKER.map((e) => `<button>${e}</button>`).join('')}</div>`);
    document.body.appendChild(dd);
    const r = anchor.getBoundingClientRect();
    dd.style.left = Math.max(8, Math.min(innerWidth - 300, r.left - 140)) + 'px';
    dd.style.top = Math.max(8, r.top - dd.offsetHeight - 8) + 'px';
    A.$$('button', dd).forEach((b) => (b.onclick = () => { cb(b.textContent); A.closeMenu(); }));
    A._menu = dd;
    setTimeout(() => document.addEventListener('mousedown', A._menuOut = (e) => { if (!dd.contains(e.target)) A.closeMenu(); }), 0);
  }
  A.emojiPicker = emojiPicker;
})();
