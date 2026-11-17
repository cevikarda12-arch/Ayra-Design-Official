# ✦ Ayra Design — Oyun Tasarım Stüdyosu

Oyun tasarlayan ekipler için **animasyonlu, hepsi bir arada masaüstü uygulaması**.
Görev takibinden tasarım dokümanına, ortak çizim panosundan seviye ve diyalog editörüne,
piksel sanat stüdyosundan gerçek zamanlı sohbet odalarına kadar ekibin ihtiyaç duyduğu her şey tek bir yerde.

Uygulama açıldığında Ayra Design logosu animasyonla çizilir, parçacıklar logonun etrafında döner ve giriş ekranı açılır.

---

## 🔐 Yönetici (Admin) hesabı

| Kullanıcı adı | İlk şifre |
|---|---|
| `admin` | `Ayra2026!` |

- Bu hesap **tüm yetkilere** sahiptir (kullanıcı yönetimi, roller, sistem ayarları, yedekleme…).
- **İlk girişte şifreyi değiştirmeniz istenir** — yeni şifreyi belirlemeden uygulama kullanılamaz.
- Ad, unvan ve profil fotoğrafını **Profil & Ayarlar** bölümünden değiştirebilirsiniz.
- İsterseniz ilk şifreyi kurulumdan önce `AYRA_ADMIN_PASSWORD` ortam değişkeniyle belirleyebilirsiniz.

### Hesap onay sistemi
Biri **Kayıt Ol** sekmesinden hesap açmaya çalıştığında:
1. Hesap **"Onay bekliyor"** durumunda oluşturulur, kişi giriş **yapamaz**.
2. Size anında **bildirim** gelir, menüde **Yönetim Paneli** yanında kırmızı sayaç belirir.
3. **Yönetim Paneli → Onay Bekleyenler**'den kişinin notunu görüp hangi rolle katılacağını seçerek **Onayla** veya **Reddet** dersiniz.
4. Onaylanan kişi giriş yapabilir ve "Hesabın onaylandı 🎉" bildirimi alır.

Kayıtları tamamen kapatmak için: **Yönetim Paneli → Sistem → Yeni kayıtlara izin ver**.

---

## 🧩 Modüller

| Bölüm | Neler var? |
|---|---|
| **Pano** | Selamlama, günün tasarım sözü, istatistikler, duyurular, bana atananlar, proje ilerleme halkası, yaklaşan etkinlikler, canlı aktivite akışı, çevrimiçi ekip |
| **Takvim** | Toplantı, kilometre taşı, sprint, oyun testi, yayın etkinlikleri + görev teslim tarihleri |
| **Ekip** | Üye kartları, çevrimiçi durumları, üzerinde çalıştıkları iş, birebir mesaj |
| **Sohbet Odaları** | Kanallar, özel odalar, birebir mesajlar, emoji tepkileri, yanıtlama, düzenleme, sabitleme, @bahsetme, "yazıyor..." göstergesi, dosya/görsel paylaşımı (sürükle-bırak), mesaj arama |
| **Görev Panosu** | Sürükle-bırak Kanban, liste görünümü, kategori/öncelik/atanan/teslim tarihi, kontrol listesi, yorumlar, filtreler, tamamlanınca konfeti 🎉 |
| **Hata Takibi** | Önem derecesi, durum akışı, platform, sürüm, tekrar üretme adımları, ekran görüntüsü (Ctrl+V ile yapıştır) |
| **Oyun Testleri** | Playtest oturumları, yıldızlı puanlama (eğlence, zorluk, anlaşılırlık…), geri bildirimi tek tıkla göreve dönüştürme |
| **Tasarım Dokümanı (GDD)** | Hazır şablon bölümleri, Markdown editörü (bölünmüş önizleme), onay durumu, tam doküman görünümü, Markdown/PDF/JSON dışa aktarma |
| **Karakter & Eşya** | Karakter, düşman, NPC, eşya, silah, yetenek, görev kayıtları; nadirlik, istatistik çubukları, radar grafik, karşılaştırma, JSON/CSV dışa aktarma |
| **Seviye Editörü** | Tile tabanlı harita, zemin + nesne katmanları, fırça/dikdörtgen/doldurma/silgi/damlalık, **"Test Et" ile haritada gerçekten oynama** (anahtar-kapı, altın, düşman, tuzak, buz kayması, kontrol noktası), PNG/JSON dışa aktarma |
| **Diyalog Editörü** | Düğüm tabanlı diyalog ağacı, sürükle-bağla seçenekler, **oynatma modu** (daktilo efektiyle), senaryo metni / JSON dışa aktarma |
| **Lore & Wiki** | Oyun evreninin ansiklopedisi (karakterler, mekanlar, tarih, fraksiyonlar…) |
| **Çizim Panosu** | Sonsuz tuval, **çok kullanıcılı gerçek zamanlı çizim**, diğerlerinin imleçleri, kalem/fosforlu/silgi/çizgi/ok/şekil/yazı/yapışkan not/görsel, geri al-yinele, yakınlaştırma, PNG dışa aktarma |
| **Piksel Stüdyosu** | Sprite çizimi (8–64 px), ayna modu, soğan kabuğu, animasyon kareleri, canlı önizleme, sprite sheet dışa aktarma, görselden içe aktarma |
| **Fikir Duvarı** | Mantar pano üzerinde yapışkan notlar, sürükleme, oylama, sıralama, fikri göreve dönüştürme |
| **Not Defteri** | Markdown notlar, klasörler, etiketler, özel/paylaşılan notlar, tıklanabilir yapılacaklar listesi, görsel ekleme, yazdırma |
| **Dosyalar & Varlıklar** | Ortak dosya kütüphanesi, klasörler, görsel/ses/video önizleme, sürükle-bırak yükleme |
| **Tasarım Araçları** | Zar atıcı + olasılık dağılımı, fantastik isim üretici, rastgele oyun fikri üretici, renk paleti üretici, XP/seviye eğrisi hesaplayıcı, ganimet (loot) simülatörü, Pomodoro zamanlayıcı |
| **Projeler** | Birden fazla oyun projesi; tüm modüller aktif projeye göre çalışır |
| **Profil & Ayarlar** | Profil fotoğrafı, unvan, yetenekler, durum mesajı, tema (Koyu / Açık / Gece Yarısı), vurgu rengi, ses ve açılış animasyonu tercihleri, şifre değiştirme, aktif oturumlar, kişisel istatistikler |
| **Yönetim Paneli** | Hesap onayları, kullanıcı yönetimi (rol değiştirme, devre dışı bırakma, şifre sıfırlama, silme), **rol & yetki matrisi** (yeni rol oluşturma), sistem ayarları, yedek alma/geri yükleme, aktivite günlüğü |

**Kısayollar:** `Ctrl+K` arama/komut paleti · `Alt+1..9` bölümler arası geçiş · Çizim panosunda `V B M E L A R O T N I` araçları · `Ctrl+Z / Ctrl+Y` geri al/yinele · `F11` tam ekran

### Roller
| Rol | Varsayılan yetkiler |
|---|---|
| **Yönetici (Admin)** | Her şey (değiştirilemez) |
| **Takım Lideri** | Proje yönetimi, içerik oluşturma/düzenleme/silme, oda yönetimi, duyuru, yönetim panelini görme |
| **Takım Üyesi** | İçerik oluşturma ve ortak içerikleri düzenleme |
| **İzleyici** | Yalnızca görüntüleme (fikirlere oy verebilir) |

Yetkiler **Yönetim Paneli → Roller & Yetkiler** ekranından değiştirilebilir, yeni roller eklenebilir.

---

## 💻 Kurulum ve çalıştırma

### Seçenek 1 — Hazır Windows kurulum dosyası
Her güncellemede GitHub Actions uygulamayı otomatik derler:
1. GitHub'da depo → **Actions** sekmesi → en son **"Masaüstü Uygulamasını Derle"** çalışması.
2. Sayfanın altındaki **Artifacts** bölümünden **Ayra-Design-Windows** dosyasını indirin.
3. İçindeki `Ayra Design Setup 1.0.0.exe` (kurulum) veya `Ayra Design 1.0.0.exe` (kurulumsuz, taşınabilir) dosyasını çalıştırın.

> Windows SmartScreen "tanınmayan uygulama" uyarısı verirse **Ek bilgi → Yine de çalıştır** deyin (uygulama imzalı olmadığı için).
> İlk açılışta Windows Güvenlik Duvarı izin isterse **izin verin** — ekip arkadaşlarınızın bağlanabilmesi için gerekir.

### Seçenek 2 — Kaynak koddan
1. [Node.js LTS](https://nodejs.org) kurun.
2. Klasörde **`Ayra-Design-Baslat.bat`** dosyasına çift tıklayın (ilk seferde paketleri kurar, sonra uygulamayı açar).
   - Komut satırıyla: `npm install` → `npm start`

### Kendi kurulum dosyanızı derlemek
```bash
npm install
npm run dist:win     # dist/ klasöründe .exe oluşur
```

---

## 👥 Ekibi bağlamak

Ayra Design açıldığında bilgisayarınızda **yerel bir sunucu** başlatır (varsayılan port `4321`). Verileriniz sizin bilgisayarınızda durur.

**Aynı ağdaki (ev/ofis Wi-Fi) ekip arkadaşları için:**
1. **Yönetim Paneli → Sistem → Ekibi bağlama** bölümündeki adresi kopyalayın (ör. `http://192.168.1.20:4321`).
2. Ekip arkadaşınız bu adresi **tarayıcıda** açabilir **veya** Ayra Design uygulamasında giriş ekranının sağ üstündeki **Sunucu** düğmesinden **"Uzak sunucuya bağlan"** seçip adresi girebilir.
3. Kayıt olurlar → siz onaylarsınız → birlikte çalışmaya başlarsınız. Sohbet, çizim panosu ve tüm değişiklikler **anlık** senkronize olur.

> Sizin bilgisayarınız (sunucu) açık olduğu sürece ekip bağlanabilir.

**İnternet üzerinden (farklı şehirler):** Sunucuyu sürekli açık bir bilgisayara/VPS'e kurun:
```bash
npm install --omit=dev
PORT=4321 AYRA_ADMIN_PASSWORD='GucluBirSifre!' npm run server
```
Ardından herkes `http://SUNUCU-ADRESİ:4321` adresine bağlanır (HTTPS için önüne Nginx/Caddy koymanız önerilir). Windows'ta `Sunucu-Baslat.bat` aynı işi yapar.

---

## 🗂 Veriler ve yedekleme
- Masaüstü uygulamasında veriler: `%APPDATA%\Ayra Design\data\` (Windows)
- Sunucu modunda: proje klasöründeki `data/` (veya `AYRA_DATA_DIR`)
- `ayra-db.json` tüm veriyi, `uploads/` yüklenen dosyaları içerir. Her kayıtta otomatik `.bak` yedeği tutulur.
- **Yönetim Paneli → Sistem → Yedek indir** ile tek dosyalık yedek alıp **Yedekten geri yükle** ile geri dönebilirsiniz.

## 🛡 Güvenlik
- Şifreler `bcrypt` ile şifrelenerek saklanır; oturum anahtarları veritabanında yalnızca özet (hash) olarak tutulur.
- Kaba kuvvet koruması: 10 dakikada 10 hatalı denemeden sonra giriş geçici olarak engellenir.
- Özel notlar yalnızca sahibine, birebir mesajlar yalnızca katılımcılara görünür.
- Devre dışı bırakılan / silinen kullanıcıların oturumları anında kapatılır.

## 🧪 Testler
```bash
npm test
```
26 API testi; kayıt-onay akışı, rol yetkileri, not gizliliği, DM görünürlüğü, dosya yükleme, şifre sıfırlama ve daha fazlasını doğrular.

## 🏗 Teknik yapı
- **Masaüstü:** Electron (`electron/`)
- **Sunucu:** Node.js, Express, Socket.IO (`server/`) — ek veritabanı kurulumu gerektirmez (JSON dosyası)
- **Arayüz:** Saf JavaScript, derleme adımı yok (`public/`); Poppins + Kalam yazı tipleri ve Lucide ikonları uygulamanın içinde gelir, **internetsiz çalışır**.

---
© Ayra Design · Oyun Tasarım Stüdyosu
