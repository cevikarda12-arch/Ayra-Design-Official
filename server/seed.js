// İlk çalıştırmada admin hesabını ve başlangıç içeriğini oluşturur.
const DEFAULT_ADMIN = {
  username: 'admin',
  password: process.env.AYRA_ADMIN_PASSWORD || 'Ayra2026!',
  displayName: 'Ayra Yönetici',
};

const GDD_TEMPLATE = [
  ['Genel Bakış', 'sparkles', '## Oyunun Özeti\n\n**Tür:** \n**Platform:** PC\n**Hedef Kitle:** \n**Tek cümlelik tanım (elevator pitch):** \n\n## Temel Deneyim\nOyuncu bu oyunu oynarken ne hissetmeli?\n\n## Benzersiz Satış Noktaları (USP)\n- \n- \n- '],
  ['Hikaye & Evren', 'book-open', '## Dünya\nOyunun geçtiği evreni anlatın.\n\n## Ana Hikaye\n### Başlangıç\n### Gelişme\n### Final\n\n## Temalar\n- '],
  ['Oynanış (Gameplay)', 'gamepad-2', '## Çekirdek Döngü (Core Loop)\n1. Keşfet\n2. Topla\n3. Geliştir\n4. Tekrarla\n\n## Kontroller\n| Tuş | Eylem |\n|---|---|\n| WASD | Hareket |\n| Boşluk | Zıpla |\n\n## Kazanma / Kaybetme Koşulları\n'],
  ['Mekanikler', 'cog', '## Ana Mekanikler\n### Hareket\n### Savaş\n### Envanter\n\n## İlerleme Sistemi\nSeviye, deneyim puanı, yetenek ağacı...'],
  ['Karakterler', 'users', '## Ana Karakter\n\n## Yan Karakterler\n\n## Düşmanlar\n\n> İpucu: Ayrıntılı istatistikler için **Karakter & Eşya Veritabanı** modülünü kullanın.'],
  ['Seviye Tasarımı', 'map', '## Seviye Listesi\n1. Eğitim bölümü\n2. \n\n## Zorluk Eğrisi\n\n> Haritaları **Seviye Editörü** ile çizin.'],
  ['Arayüz (UI/UX)', 'layout', '## Ana Menü\n## Oyun İçi HUD\n## Envanter Ekranı\n## Ayarlar'],
  ['Sanat Yönü', 'palette', '## Görsel Stil\n\n## Renk Paleti\n\n## Referanslar\n> Referans görselleri **Dosyalar** ve **Fikir Duvarı** modülüne ekleyin.'],
  ['Ses & Müzik', 'music', '## Müzik Tarzı\n## Ses Efektleri Listesi\n## Seslendirme'],
  ['Teknik Tasarım', 'cpu', '## Motor\n(Unity / Unreal / Godot ...)\n\n## Hedef Performans\n## Kaydetme Sistemi\n## Platform Gereksinimleri'],
  ['Para Kazanma', 'coins', '## Model\n(Premium / F2P / Abonelik)\n\n## Fiyatlandırma'],
  ['Pazarlama & Yayın', 'rocket', '## Hedef Çıkış Tarihi\n## Pazarlama Planı\n## Topluluk'],
];

function seed(db, bcrypt) {
  if (db.col('users').length > 0) return;
  const now = Date.now();
  const day = 24 * 3600 * 1000;

  const admin = db.insert('users', {
    username: DEFAULT_ADMIN.username,
    displayName: DEFAULT_ADMIN.displayName,
    email: '',
    title: 'Stüdyo Kurucusu',
    bio: 'Ayra Design stüdyosunun kurucusu ve yöneticisi.',
    passwordHash: bcrypt.hashSync(DEFAULT_ADMIN.password, 10),
    role: 'admin',
    status: 'active',
    mustChangePassword: !process.env.AYRA_ADMIN_PASSWORD,
    avatarColor: '#9b87f5',
    skills: ['Oyun Tasarımı', 'Yönetim'],
    prefs: { theme: 'dark', accent: '#9b87f5', intro: true, sounds: true },
  });

  const project = db.insert('projects', {
    name: 'İlk Oyunumuz',
    description: 'Stüdyonun ilk oyun projesi. Adını ve detaylarını Projeler bölümünden değiştirebilirsiniz.',
    genre: 'Aksiyon / Macera', platform: 'PC', engine: 'Unity', status: 'Ön Üretim',
    color: '#9b87f5', icon: 'gamepad-2', createdBy: admin.id,
  });

  GDD_TEMPLATE.forEach(([title, icon, content], i) => {
    db.insert('gdd', { projectId: project.id, title, icon, content, order: i, createdBy: admin.id });
  });

  const rooms = [
    ['genel', 'Takımın genel sohbet odası', '💬', false],
    ['duyurular', 'Önemli duyurular (yalnızca yöneticiler yazabilir)', '📣', true],
    ['oyun-tasarimi', 'Mekanikler, sistemler ve denge tartışmaları', '🎮', false],
    ['sanat', 'Konsept sanat, sprite ve animasyon paylaşımları', '🎨', false],
    ['programlama', 'Kod, motor ve teknik konular', '💻', false],
    ['ses-muzik', 'Müzik ve ses efektleri', '🎵', false],
    ['rastgele', 'Kahve molası sohbetleri', '☕', false],
  ];
  const roomIds = {};
  rooms.forEach(([name, topic, icon, readonly], i) => {
    const r = db.insert('rooms', { type: 'channel', name, topic, icon, readonly, locked: i < 2, members: [], createdBy: admin.id });
    roomIds[name] = r.id;
  });
  db.insert('messages', { roomId: roomIds.genel, userId: admin.id, text: 'Ayra Design stüdyosuna hoş geldiniz! 🎮✨ Burada birlikte oyun tasarlayacağız. Sorularınız için @admin yazarak bana ulaşabilirsiniz.', attachments: [], reactions: { '🎉': [admin.id] } });

  db.insert('announcements', {
    title: 'Ayra Design Stüdyosu açıldı! 🚀',
    content: 'Takımımızın tüm araçları artık tek bir yerde: görev panosu, GDD editörü, çizim panosu, seviye editörü, diyalog editörü, piksel stüdyosu ve daha fazlası. Keşfetmeye başlayın!',
    pinned: true, priority: 'high', createdBy: admin.id,
  });

  const tasks = [
    ['Oyun konseptini netleştir', 'GDD > Genel Bakış bölümünü doldur', 'todo', 'high', 'Tasarım'],
    ['Ana karakter konsept çizimleri', 'En az 3 farklı silüet denemesi', 'todo', 'medium', 'Sanat'],
    ['Prototip: karakter hareketi', 'Zıplama, koşma ve kamera takibi', 'progress', 'high', 'Programlama'],
    ['Ana menü müziği taslağı', '60-90 saniyelik döngü', 'todo', 'low', 'Ses'],
    ['Eğitim seviyesi taslağı', 'Seviye Editörü ile ilk bölümün haritası', 'review', 'medium', 'Seviye'],
    ['Takım kurulumu', 'Herkesin Ayra Design hesabı açıldı', 'done', 'medium', 'Yönetim'],
  ];
  tasks.forEach(([title, description, status, priority, category], i) => {
    db.insert('tasks', {
      projectId: project.id, title, description, status, priority, category, assignee: admin.id,
      due: new Date(now + (i + 2) * day).toISOString().slice(0, 10), tags: [], checklist: [], comments: [], order: i, createdBy: admin.id,
    });
  });

  const events = [
    ['Proje başlangıç toplantısı', 1, 'meeting', '#4dabf7'],
    ['Prototip teslimi', 14, 'milestone', '#9b87f5'],
    ['İlk oyun testi (Playtest)', 21, 'playtest', '#20c997'],
    ['Alfa sürümü', 45, 'release', '#f06595'],
  ];
  events.forEach(([title, offset, type, color]) => {
    db.insert('events', { title, date: new Date(now + offset * day).toISOString().slice(0, 10), type, color, description: '', projectId: project.id, createdBy: admin.id });
  });

  const ideas = [
    ['Zamanı geri saran bir yetenek!', '#ffd43b', 80, 60],
    ['Gece-gündüz döngüsüyle değişen düşmanlar', '#69db7c', 340, 110],
    ['Evcil hayvan yoldaş sistemi 🐾', '#74c0fc', 600, 50],
  ];
  ideas.forEach(([text, color, x, y]) => {
    db.insert('ideas', { projectId: project.id, text, color, x, y, votes: [], category: 'Mekanik', createdBy: admin.id });
  });

  db.insert('entities', {
    projectId: project.id, type: 'character', name: 'Kahraman', rarity: 'legendary',
    description: 'Oyunun ana karakteri. Cesur, meraklı ve biraz sakar.',
    stats: [{ k: 'Can', v: 100 }, { k: 'Saldırı', v: 12 }, { k: 'Savunma', v: 8 }, { k: 'Hız', v: 14 }],
    tags: ['oyuncu'], lore: '', image: null, createdBy: admin.id,
  });
  db.insert('entities', {
    projectId: project.id, type: 'enemy', name: 'Balçık', rarity: 'common',
    description: 'Zayıf ama kalabalık gezen yeşil yaratık.',
    stats: [{ k: 'Can', v: 20 }, { k: 'Saldırı', v: 4 }, { k: 'Savunma', v: 2 }, { k: 'Hız', v: 5 }],
    tags: ['orman'], lore: '', image: null, createdBy: admin.id,
  });
  db.insert('entities', {
    projectId: project.id, type: 'item', name: 'Can İksiri', rarity: 'uncommon',
    description: 'İçildiğinde 30 can yeniler.',
    stats: [{ k: 'İyileştirme', v: 30 }, { k: 'Fiyat', v: 25 }],
    tags: ['tüketilebilir'], lore: '', image: null, createdBy: admin.id,
  });

  db.insert('drawings', { projectId: project.id, name: 'Beyin Fırtınası Panosu', strokes: [], createdBy: admin.id });

  db.insert('notes', {
    title: 'Hoş geldin notu 📝', private: true, pinned: true, folder: 'Kişisel', tags: ['başlangıç'],
    content: '# Ayra Design\'a hoş geldin!\n\nBu not defteri **Markdown** destekler.\n\n- [x] Hesabımı oluştur\n- [ ] Profilimi düzenle\n- [ ] Ekibi davet et (kayıt olanlar admin onayına düşer)\n- [ ] İlk görevleri ata\n\n> Kısayollar: `Ctrl+K` hızlı arama / komut paleti.',
    createdBy: admin.id,
  });

  db.insert('dialogues', {
    projectId: project.id, name: 'Köylü ile ilk karşılaşma',
    nodes: [
      { id: 'n1', speaker: 'Köylü', text: 'Hey yabancı! Buralarda pek görünmezsin.', x: 60, y: 80, choices: [{ text: 'Kimsin sen?', target: 'n2' }, { text: 'Yoluma bakıyorum.', target: 'n3' }] },
      { id: 'n2', speaker: 'Köylü', text: 'Ben Ali, bu köyün demircisiyim. Ormana gidiyorsan dikkatli ol!', x: 420, y: 20, choices: [] },
      { id: 'n3', speaker: 'Köylü', text: 'Peki peki... Ama orman tehlikeli, söylemedi deme.', x: 420, y: 220, choices: [] },
    ],
    start: 'n1', createdBy: admin.id,
  });

  db.insert('levels', {
    projectId: project.id, name: 'Eğitim Bölümü', width: 24, height: 14, tileSize: 32,
    layers: { ground: makeTutorialLevel(24, 14), objects: {
      '2,2': 'spawn', '21,2': 'goal', '11,5': 'door', '5,10': 'key', '7,3': 'coin', '8,3': 'coin', '9,3': 'coin',
      '14,4': 'enemy', '18,6': 'enemy', '3,11': 'chest', '13,10': 'tree', '13,11': 'tree', '20,11': 'heart', '16,2': 'trap', '6,7': 'npc', '15,6': 'checkpoint',
    } }, createdBy: admin.id,
  });

  // örnek piksel sprite: 2 karelik zıplayan balçık
  const W = 16, frames = [[], []];
  const slime = (f, lift) => {
    const px = new Array(W * W).fill('');
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const cx = 7.5, cy = 10 - lift, rx = lift ? 5.5 : 6.5, ry = lift ? 5 : 4.2;
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1 && y <= 13 - lift) px[y * W + x] = d > 0.75 ? '#008751' : y < cy - 1 ? '#69db7c' : '#00e436';
    }
    const ey = 9 - lift;
    [[5, ey], [10, ey]].forEach(([x, y]) => { px[y * W + x] = '#1d2b53'; px[(y - 1) * W + x] = '#ffffff'; });
    px[(ey + 2) * W + 7] = '#1d2b53'; px[(ey + 2) * W + 8] = '#1d2b53';
    return px;
  };
  frames[0] = slime(0, 0); frames[1] = slime(1, 2);
  db.insert('pixelart', { projectId: project.id, name: 'Balçık (zıplama)', w: W, h: W, fps: 4, frames, createdBy: admin.id });

  db.flush();
  console.log(`[seed] Admin hesabı oluşturuldu -> kullanıcı adı: ${DEFAULT_ADMIN.username}`);
}

function makeTutorialLevel(w, h) {
  const g = {};
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let t = 'grass';
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) t = 'wall';
      else if (y > 8 && x > 14 && x < 20) t = 'water';
      else if (x > 4 && x < 8 && y > 3 && y < 6) t = 'sand';
      g[x + ',' + y] = t;
    }
  }
  for (let y = 1; y < 9; y++) if (y !== 5) g['11,' + y] = 'wall';
  g['11,5'] = 'wood';
  return g;
}

module.exports = { seed, DEFAULT_ADMIN };
