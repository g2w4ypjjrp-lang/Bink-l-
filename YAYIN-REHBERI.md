# BinKılıç Saklı Bahçe — Yayın Rehberi

Site: https://binkılıçsaklıbahçe.com (`xn--binklsaklbahe-mgbh88ibaf.com`) · Cloudflare Worker: `sakli-bahce` · Ücretsiz plan

## Site nasıl çalışıyor? (sade anlatım)

- **Herkese açık sayfalar** (ana sayfa, /menu, galeri, hakkımızda, organizasyon, kampanyalar, iletişim,
  rezervasyon, KVKK) artık **hazır HTML dosyası**. "Yayınla" sırasında bir kez üretiliyor, Cloudflare bunları
  doğrudan dosya olarak veriyor. Bu sayfalar Worker'ı hiç çalıştırmadığı için 10 ms sınırına takılmaz.
- **Fotoğraflar** da hazır dosya. Menü kutucukları için ayrıca küçük sürümler (~5–20 KB) üretiliyor.
- **Dinamik işler** (QR yönlendirmesi, rezervasyon, iletişim ve organizasyon formları, QR menüden sipariş,
  hesap isteme, ziyaret sayacı) Worker'ın içinde, Next.js'e girmeden çalışan hafif bir kodla karşılanıyor
  (`src/worker/fast.ts`). Ölçülen süre çoğunlukla 0–4 ms; bir süre boşta kaldıktan sonraki ilk istekte 11 ms'ye kadar çıkabiliyor.
- **Yönetim paneli** (/admin) eskisi gibi Next.js ile çalışıyor. Panelde ara sıra "Error 1102" görülebilir;
  sayfayı yenilemek yeterli. Ziyaretçi sayfaları bundan etkilenmez.
- **"Şu an açık / kapalı"** bilgisi ziyaretçinin tarayıcısında, her zaman **İstanbul saatine** göre
  hesaplanır ve dakikada bir yenilenir.

## Menüyü (veya siteyi) güncelleme — adım adım

1. https://binkılıçsaklıbahçe.com/admin adresinden giriş yapın.
2. Menü, fiyat, fotoğraf, galeri, kampanya, sayfa metni, çalışma saati vb. ne değişecekse değiştirip **Kaydet**'e basın.
   Birden fazla değişikliği art arda yapabilirsiniz.
3. Panelin üstünde sarı bir uyarı çıkar: **"Sitede yayınlanmamış N değişiklik var"**.
4. **"Değişiklikleri sitede yayınla"** butonuna basın.
5. **3–5 dakika** bekleyin. Sonra siteyi yenileyin; değişiklikler görünür.

Notlar:
- Yayınlamadan önce yapılan değişiklikler ziyaretçilere **görünmez**. Rezervasyonlar, siparişler ve mesajlar ise
  yayın gerektirmez: anında panele düşer.
- Yeni yüklenen bir fotoğraf, yayından önce de görünür ama daha yavaş açılır. Yayından sonra hızlanır.
- Özel gün (tatil/kapalı gün) eklerseniz "açık/kapalı" bilgisinin güncellenmesi için de yayınlayın.

## Bir sorun olursa: eski sürüme dönmek

| Sürüm | Açıklama |
|---|---|
| `123ac82c-b2d8-471f-94d6-9462321d1ec6` | Değişiklikten **önceki** sürüm (her sayfa Worker'da üretiliyordu) |
| `a967d611-fe62-46c4-baf9-0b1a58fcf3c7` | Statik sayfalı **yeni** sürüm (19.11.2026) |

**Panelden (en kolay):** Cloudflare → Workers & Pages → `sakli-bahce` → **Deployments** → istediğiniz sürümün
yanındaki **⋯** → **Rollback**.

**Komutla (proje klasöründe):**
```
npx wrangler deployments list
npx wrangler rollback 123ac82c-b2d8-471f-94d6-9462321d1ec6 --message "Eski sürüme dönüş"
```
Komut için bilgisayarda `CLOUDFLARE_API_TOKEN` ortam değişkeni tanımlı olmalı ya da `npx wrangler login` ile giriş yapılmalı.
Geri dönüş anında gerçekleşir; veritabanına dokunmaz.

## Cloudflare Workers Builds kurulumu (bir kerelik)

Kod GitHub'daki özel depoda durur. Cloudflare, "Yayınla" butonuyla bu depodan siteyi yeniden derler.

1. Cloudflare → Workers & Pages → `sakli-bahce` → **Settings → Builds → Connect** → GitHub hesabını yetkilendirin
   ve özel depoyu seçin (dal: `main`).
2. Derleme ayarları:
   - **Build command:** `npm run cf:build`
   - **Deploy command:** `npx opennextjs-cloudflare deploy`
3. **Build variables and secrets** (Settings → Builds → Variables and secrets) bölümüne ekleyin:
   - `DATABASE_URL` → Neon **pooler** bağlantı adresi (Secret olarak; sonu `/bink%C4%B1l%C4%B1%C3%A7?sslmode=require...`)
   - `APP_URL` → `https://xn--binklsaklbahe-mgbh88ibaf.com`
   - `NODE_VERSION` → `22`
4. **Settings → Builds → Deploy Hooks** → "Yayınla" adında bir hook oluşturun (dal `main`), URL'yi kopyalayın.
5. Worker'ın kendi gizli değişkenlerine (Settings → **Variables and Secrets** → Add → Secret) ekleyin:
   - `DEPLOY_HOOK_URL` → 4. adımda kopyaladığınız URL
6. Panelde "Değişiklikleri sitede yayınla"ya basarak deneyin; Builds sekmesinde derlemenin başladığını görürsünüz.

Worker'da zaten tanımlı gizli değişkenler: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`. **Hiçbir şifre depoya
yazılmaz** (`.env*`, `.dev.vars`, `.deploy.env` git dışında).

## Teknik notlar
- Derleme: `npm run cf:build` = `prisma generate` → `opennextjs-cloudflare build` → `node scripts/cf-static.mjs`
  (HTML'leri ve görselleri `.open-next/assets/` içine yazar, `_headers` ile güvenlik başlıklarını ekler).
- Derleme sırasında veritabanına `DB_DRIVER=neon` ile bağlanılır (veritabanı adındaki Türkçe karakterler nedeniyle
  Prisma'nın kendi sürücüsü yanlış veritabanına gider).
- Worker girişi `cf-worker.ts`: önce `src/worker/fast.ts`, eşleşmezse Next.js (OpenNext).
- Ücretsiz plan sınırları: Worker'a günde 100.000 istek (statik dosyalar bu sayıma girmez), ayda 3.000 dakika derleme.
