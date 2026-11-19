# BinKılıç Saklı Bahçe — Dijital Platform

Çatalca Binkılıç'taki **BinKılıç Saklı Bahçe** için tek bir entegre platform:

- Premium kurumsal web sitesi (ana sayfa, hakkımızda, galeri, organizasyon, kampanyalar, rezervasyon, iletişim)
- QR kod ile açılan **dijital menü** (TR / EN / DE, masa tanıma, favoriler, alerjenler, arama, filtreler)
- QR menüden **sipariş sistemi** (panelden açılıp kapatılır) + canlı mutfak ekranı
- **Rezervasyon sistemi** (kapasite ve saat kontrolü, liste + gün/hafta/ay takvimi)
- **Organizasyon başvuruları** (süreç panosu, teklif, notlar)
- Kapsamlı **yönetim paneli** (18 modül, rol bazlı yetki, mobil uyumlu)
- Çerezsiz **analitik**, SEO yönetimi, bildirim merkezi, işlem logları, yedekleme

> Tüm butonlar, formlar, tablolar ve işlemler gerçek veritabanı işlemleri yapar; demo/placeholder ekran yoktur.

---

## İçindekiler

1. [Teknoloji ve mimari](#teknoloji-ve-mimari)
2. [Hızlı başlangıç (geliştirme)](#hızlı-başlangıç-geliştirme)
3. [Canlıya alma (Docker)](#canlıya-alma-docker)
4. [İlk kurulumdan sonra yapılacaklar](#ilk-kurulumdan-sonra-yapılacaklar)
5. [Yönetim paneli](#yönetim-paneli)
6. [QR menü ve sipariş akışı](#qr-menü-ve-sipariş-akışı)
7. [Güvenlik](#güvenlik)
8. [SEO ve performans](#seo-ve-performans)
9. [Yedekleme](#yedekleme)
10. [Testler](#testler)
11. [Genişletme (SMS/WhatsApp, online ödeme, S3)](#genişletme)

---

## Teknoloji ve mimari

| Katman | Seçim |
|---|---|
| Uygulama | Next.js 15 (App Router, React 19, Server Components, Server Actions), TypeScript (strict) |
| Arayüz | Tailwind CSS v4, özel tasarım sistemi (Cormorant Garamond + Manrope), lucide ikonlar |
| Veritabanı | PostgreSQL 16 + Prisma ORM (32 tablo, ilişkiler ve indeksler) |
| Kimlik doğrulama | Veritabanı oturumları (httpOnly çerez, SHA-256 hash'li token), bcrypt, rol/yetki tablosu |
| Medya | Yerel depolama + sharp ile otomatik WebP dönüştürme ve küçük önizleme |
| QR | `qrcode` (PNG/SVG) + `pdf-lib` (Türkçe fontlu, yazdırılabilir masa kartları) |
| Grafikler | Recharts (yalnızca panelde) |
| Dağıtım | Docker (standalone çıktı), Docker Compose (PostgreSQL + Caddy otomatik HTTPS + gece yedeği) |

```
src/
  app/
    (site)/            Herkese açık site: /, /hakkimizda, /galeri, /organizasyon, /rezervasyon, /iletisim, /kampanyalar, /kvkk
    menu/              QR dijital menü (/menu, /menu?table=5, /menu/siparis/[id])
    q/[code]/          QR kısa bağlantısı → taramayı kaydeder, menüye yönlendirir
    admin/login        Panel girişi
    admin/(panel)/     18 yönetim modülü (her biri page.tsx + actions.ts + istemci bileşeni)
    api/               Herkese açık form uçları + /api/admin/* (yükleme, QR, dışa aktarma, yedek, bildirim)
    uploads/[...path]  Yüklenen medyayı önbellekli sunar (video için Range desteği)
    sitemap.ts, robots.ts
  components/          site/, menu/, admin/ (DataTable, Modal, Charts, Shell…)
  lib/                 auth, permissions, actions (yetki sarmalayıcı), validation (zod), security, settings,
                       content + page-schema (yönetilebilir sayfalar), menu, hours, stats, analytics,
                       notify, qr, storage, payments, seo
prisma/                schema.prisma, migrations/, seed.ts
tests/                 unit/ (vitest), e2e/ (Playwright senaryoları)
scripts/               backup.sh, restore.sh, docker-entrypoint.sh
deploy/Caddyfile
```

**Veri akışı:** Herkese açık sayfalar sunucuda render edilir; ayarlar, sayfa içerikleri ve menü etiketli önbellekte (`unstable_cache`) tutulur ve panelde bir değişiklik yapıldığında anında geçersiz kılınır (`revalidateTag`). Böylece site hızlıdır ama panelden yapılan değişiklik saniyesinde yayına girer.

---

## Hızlı başlangıç (geliştirme)

Gereksinimler: Node.js 22+, PostgreSQL 16+

```bash
cp .env.example .env        # DATABASE_URL, APP_URL, SESSION_SECRET, ADMIN_* değerlerini düzenleyin
```

```bash
npm install
```

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed             # roller, yetkiler, admin kullanıcısı, örnek menü, masalar + QR kodlar, galeri
```

```bash
npm run dev                 # http://localhost:3000  ·  panel: http://localhost:3000/admin
```

---

## Canlıya alma (Docker)

Bir Linux sunucuda (Docker + Docker Compose kurulu, alan adı sunucuya yönlendirilmiş):

```bash
cp .env.example .env        # APP_URL, DOMAIN, POSTGRES_PASSWORD, SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, (ops.) SMTP_*
```

```bash
docker compose --profile setup run --rm seed     # yalnızca ilk kurulumda
```

```bash
docker compose up -d --build
```

Bu komutlar şunları başlatır:

- **db** — PostgreSQL 16 (kalıcı volume)
- **app** — Next.js standalone sunucu; her açılışta migrasyonları otomatik uygular, `/api/health` ile sağlık kontrolü
- **caddy** — Let's Encrypt ile otomatik HTTPS, HTTP/3, sıkıştırma, statik dosya önbelleği
- **backup** — her gece 03:30'da `pg_dump` + medya yedeği, 14 gün saklama (`./storage/backups`)

Güncelleme: `git pull && docker compose up -d --build`

CDN: `/_next/static/*` ve `/uploads/*` yanıtları `immutable` önbellek başlığıyla gelir; Cloudflare vb. bir CDN önüne doğrudan konabilir.

---

## İlk kurulumdan sonra yapılacaklar

Seed verisi platformu çalışır halde göstermek için **örnek içerik** içerir. Yayına almadan önce panelden:

1. **Ayarlar → İşletme:** Gerçek telefon, **WhatsApp numarası** (ülke koduyla, ör. `905321234567`), e-posta, Google Maps bağlantısı ve koordinatlar, Google yorum bağlantısı, logo.
2. **Ayarlar → Sosyal medya**, **Çalışma saatleri** ve özel günler.
3. **Menü:** Örnek ürünler ve **fiyatlar temsilidir** — gerçek menü ve fiyatlarla değiştirin.
4. **Galeri / Sayfalar:** Başlangıç görselleri Unsplash lisanslı stok fotoğraflardır (`storage/uploads/seed`). İşletmenin kendi fotoğraflarıyla değiştirin; görseller yüklenirken otomatik WebP'ye çevrilir.
5. **Yorumlar:** Bilinçli olarak boş bırakıldı. Sitede yalnızca gerçek misafir yorumlarını (ör. Google'dan, kaynak bağlantısıyla) ekleyin. Hiç yorum yoksa ana sayfa Google yorum bağlantısını gösterir.
6. **Profil → Şifre değiştir:** Seed ile oluşan admin şifresini değiştirin. Personel için **Kullanıcılar** ekranından ayrı hesap açın.
7. **QR Kodlar:** Masa sayınıza göre masaları oluşturun, **“Tümünü yazdır (PDF)”** ile A4'e 4'lü kesilebilir masa kartlarını basın.

---

## Yönetim paneli

`/admin` — ayrı giriş sayfası, daraltılabilir kenar menü, mobilde çekmece menü, bildirim zili (15 sn'de bir yenilenir, yeni kayıtta sesli uyarı).

| Modül | Özellikler |
|---|---|
| Dashboard | Bugünkü/aylık ziyaretçi, QR tarama, menü görüntüleme, rezervasyon, organizasyon, mesaj, sipariş, ciro; günlük/haftalık/aylık trafik grafiği, QR kullanım grafiği, en çok görüntülenen ürün/kategori. **Kartlar sürüklenebilir/gizlenebilir, düzen kullanıcıya özel kaydedilir.** |
| Menü | Ürün CRUD (çoklu görsel, TR/EN/DE çeviri, fiyat/eski fiyat/kampanya fiyatı, alerjen, kalori, gramaj, hazırlanma süresi, acılık, etiketler, vejetaryen/vegan/glutensiz, öne çıkan/yeni/popüler/günlük, stok, aktif, SEO), tabloda **satır içi fiyat ve stok düzenleme**, toplu işlemler (yayına al, gizle, tükendi, % fiyat değişimi, sil), kategori/alt kategori (servis saatleri, çeviriler), sürükle-bırak sıralama, alerjen yönetimi |
| QR Kodlar & Masalar | Toplu masa oluşturma, genel/özel/masa QR, PNG/SVG/PDF indirme, toplu PDF yazdırma, aktif/pasif, tarama sayıları, cihaz ve QR bazlı istatistik, sipariş anahtarı yenileme |
| Siparişler | Canlı 3 sütunlu mutfak ekranı (Yeni → Hazırlanıyor → Hazır), bekleme süresi uyarısı, fiş yazdırma, liste görünümü, ödeme işaretleme, QR siparişi aç/kapat |
| Rezervasyonlar | Liste (arama: ad/telefon/kod), gün/hafta/ay takvimi, durumlar (beklemede, onaylandı, reddedildi, iptal, tamamlandı, gelmedi), notlar, telefonla manuel kayıt, tek tıkla **hazır WhatsApp onay mesajı**, SMS, otomatik e-posta |
| Organizasyonlar | Başvuru listesi, sürükle-bırak süreç panosu (Yeni → Görüşüldü → Teklif → Onay…), teklif tutarı/detayı (e-postayla gönderme), notlar, organizasyon türleri yönetimi |
| Galeri | Çoklu fotoğraf/video yükleme, kategori, sürükle-bırak sıralama, ana sayfada göster, alt metin, açıklama |
| Kampanyalar | Tarih aralığı, fiyat, indirim oranı, kategori, görsel, ana sayfa/QR menüde göster, otomatik durum (planlandı/yayında/süresi doldu) |
| Yorumlar | Gerçek yorum ekleme (kaynak bağlantısıyla), öne çıkarma, gizleme |
| Mesajlar | Gelen kutusu / arşiv, okundu/okunmadı/yanıtlandı, panelden e-posta ile yanıt, WhatsApp |
| Analitik | 7/30/90 gün/12 ay; ziyaret, QR, menü, ürün görüntüleme, rezervasyon dönüşümü, popüler ürün/kategori/QR, cihaz, trafik kaynağı, CSV |
| Sayfalar | Ana sayfa (14 bölüm), Hakkımızda, Galeri, Organizasyon, İletişim, Rezervasyon, Kampanyalar, Menü — tüm metin/görsel/listeler, bölüm gizle/göster, varsayılana döndür |
| SEO | Sayfa başına başlık, açıklama, anahtar kelime, OG görseli, canonical, noindex; Google önizlemesi ve uyarılar |
| Kullanıcılar | Kullanıcı CRUD, rol atama, oturum sonlandırma, **rol-yetki matrisi** (18 yetki) |
| Ayarlar | İşletme, sosyal medya, haftalık saatler + resmî tatil/özel gün/geçici kapanış, para birimi, diller, KDV, rezervasyon kuralları (aralık, kapasite, min. süre), bildirimler, duyuru şeridi |
| Bildirimler | Rezervasyon/sipariş/organizasyon/mesaj bildirim merkezi |
| Sistem & Güvenlik | Sistem durumu, işlem logları, giriş kayıtları, hata kayıtları, giden bildirimler, JSON yedek, CSV dışa aktarma, bakım/temizlik |

**Varsayılan roller:** Admin (tüm yetkiler) · Yönetici (kullanıcı ve sistem hariç her şey) · Personel (yalnızca rezervasyon ve siparişler). Panelden yeni roller oluşturulabilir.

---

## QR menü ve sipariş akışı

1. Her QR kod `https://alanadi/q/<kod>` kısa bağlantısını içerir. Hedef değişse bile basılı kodlar geçerli kalır.
2. Tarama sunucuda kaydedilir (cihaz türü, zaman; IP yalnızca hash'lenmiş halde), ardından `/menu?table=5&t=<masa-anahtarı>` adresine yönlendirilir.
3. Menüde masa numarası görünür; **Hesap iste** butonu panele bildirim düşer (QR sipariş açıkken).
4. QR sipariş açıksa misafir sepete ekler, not yazar, siparişi gönderir; **fiyatlar her zaman sunucuda hesaplanır**. Sipariş yalnızca geçerli masa anahtarıyla kabul edilir.
5. Misafir `/menu/siparis/<id>` ekranından durumu canlı izler; panel canlı ekranı 5 saniyede bir güncellenir.

Menü özellikleri: kategori çubuğu (scrollspy), arama (Türkçe karakter duyarsız), vejetaryen/vegan/glutensiz/favori filtreleri, ürün detay paneli (kaydırmalı çoklu görsel, alerjen, kalori, gramaj, hazırlanma), kampanya ve günün önerileri şeridi, tükendi gösterimi, kategori servis saatleri, dil seçimi (TR/EN/DE, cihazda hatırlanır), geri tuşuyla kapanan paneller, tek elle kullanım için alt eylem çubuğu.

---

## Güvenlik

- **Kimlik doğrulama:** bcrypt (cost 12), 32 baytlık rastgele oturum anahtarı (veritabanında yalnızca SHA-256 hash'i), `httpOnly` + `SameSite=Lax` + üretimde `Secure` çerez, 7 günlük kayan oturum
- **Kaba kuvvet koruması:** hesap başına 5 hatalı deneme / 15 dk kilit, IP başına ek sınır, tüm denemeler `login_logs` tablosunda
- **Yetkilendirme:** Her server action ve admin API yetki anahtarı ile korunur (`guarded()`); arayüzdeki gizleme yalnızca kolaylıktır
- **CSRF:** Server action'lar Next.js Origin kontrolüyle; herkese açık POST uçları ve admin API'leri ayrıca Origin/Host eşleşmesi ister
- **Girdi doğrulama:** Tüm formlar zod şemalarıyla; metinler HTML etiketlerinden arındırılır (XSS), bot tuzağı (honeypot), IP başına hız sınırı
- **SQL injection:** Prisma parametreli sorgular; ham SQL yalnızca `Prisma.sql` şablonlarıyla
- **Dosya yükleme:** Tür + boyut sınırı, görseller sharp ile gerçekten çözülür ve yeniden kodlanır (EXIF temizlenir), videolarda imza kontrolü, rastgele dosya adları, yol geçişi koruması
- **Başlıklar:** CSP, HSTS (üretim), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy; `/admin` için `noindex` + `no-store`
- **Denetim:** Tüm panel işlemleri `audit_logs`, sunucu hataları `error_logs` tablosunda

---

## SEO ve performans

- Semantik HTML, sayfa başına başlık/açıklama/canonical/OG/Twitter kartları (panelden yönetilir)
- Schema.org: `Restaurant` + `LocalBusiness` (adres, saatler, rezervasyon eylemi), `Menu` (bölümler, ürünler, fiyat, diyet), `FAQPage`, `BreadcrumbList`
- Dinamik `sitemap.xml` ve `robots.txt`; hedef aramalar için anahtar kelime altyapısı (Çatalca restoran, Binkılıç kahvaltı, Çatalca organizasyon…)
- AVIF/WebP görseller, responsive `srcset`, lazy loading, öncelikli LCP görseli, yalnızca gerekli font alt kümelerinin önyüklenmesi, panel kodunun siteye hiç yüklenmemesi

**Lighthouse (mobil, simüle yavaş 4G, production build):**

| Sayfa | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` | 92 | 100 | 100 | 100 |
| `/menu` | 92 | 96 | 100 | 100 |
| `/rezervasyon` | 94 | 100 | 100 | 100 |
| `/hakkimizda` | 91 | 100 | 100 | 100 |
| `/galeri` | 92 | 100 | 100 | 100 |

---

## Yedekleme

- **Otomatik:** Docker kurulumunda `backup` servisi her gece `scripts/backup.sh` çalıştırır (`pg_dump` custom format + medya arşivi, 14 gün).
- **Elle:** Panel → Sistem → Yedekleme → JSON yedeği indir; ayrıca her modül için Excel uyumlu CSV dışa aktarma.
- **Geri yükleme:** `DATABASE_URL=… ./scripts/restore.sh storage/backups/db-….dump storage/backups/uploads-….tar.gz`

---

## Testler

```bash
npm test                    # birim testleri (çalışma saatleri, doğrulama, XSS temizleme, yetkiler…)
```

```bash
npm run test:e2e            # çalışan sunucuya karşı 25 uçtan uca senaryo (BASE_URL ile değiştirilebilir)
```

E2E senaryoları gerçek tarayıcıda şunları doğrular: tüm sayfalar, yapısal veri, rezervasyon/organizasyon/iletişim formları, doğrulama hataları, CSRF reddi, admin girişi, rezervasyon onayı ve takvim, ürün ekleme → menüde görünme, QR tarama → masa tanıma → sepet → sipariş → canlı ekran → müşteri durum ekranı, sunucu taraflı fiyat, geçersiz masa anahtarı reddi, bildirimler, QR PNG/SVG/PDF, personel rolü kısıtları, hesap kilitleme, sayfa içeriği yayınlama, analitik. Playwright projede kurulu değilse `npm i -D playwright` ile ekleyin.

---

## Genişletme

- **SMS / WhatsApp Business API:** `src/lib/notify.ts` içindeki `providers` nesnesine `sms` / `whatsapp` sağlayıcısı (Netgsm, İleti Merkezi, Twilio, Meta Cloud API) ekleyin. Tüm müşteri bildirimleri `outbound_messages` tablosuna kaydedilir; sağlayıcı yokken panel tek tıkla hazır mesajlı `wa.me` / `sms:` bağlantıları sunar.
- **E-posta:** `.env` içine `SMTP_*` değerlerini girmeniz yeterli (rezervasyon alındı/onay, organizasyon teklifi, yönetici bildirimleri, mesaj yanıtları).
- **Online ödeme:** `src/lib/payments.ts` — `PaymentProvider` arayüzü (iyzico/PayTR/Stripe), `payments` tablosu ve `Order.paymentStatus` alanları hazır.
- **Bulut depolama (S3/R2):** `src/lib/storage.ts` tek giriş noktasıdır; `storeUpload` / `deleteUpload` fonksiyonları S3 SDK ile değiştirilebilir.
- **Çoklu sunucu:** Hız sınırlayıcı (`src/lib/security.ts`) bellek içidir; yatay ölçeklemede Redis tabanlı sürümle değiştirin (giriş kilidi zaten veritabanı tabanlıdır).
