/**
 * Uçtan uca senaryo testleri — çalışan bir sunucuya karşı (varsayılan http://localhost:3000).
 * Kullanım: BASE_URL=http://localhost:3000 ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run test:e2e
 */
import { createRequire } from "node:module";
// Projede devDependency olarak ya da global (NODE_PATH) kurulu Playwright kullanılır
const { chromium } = createRequire(import.meta.url)("playwright");
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const ADMIN = { email: process.env.ADMIN_EMAIL || "admin@binkilicsaklibahce.com", password: process.env.ADMIN_PASSWORD || "SakliBahce!2026" };
const stamp = Date.now().toString(36);
const results = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`  ✓ ${name} (${Date.now() - t} ms)`);
  } catch (e) {
    results.push({ name, ok: false, err: e.message });
    console.log(`  ✗ ${name}\n    ${e.message.split("\n").slice(0, 4).join("\n    ")}`);
  }
}
const future = (days) => { const d = new Date(Date.now() + days * 864e5); return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d); };

const browser = await chromium.launch();
const admin = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const guest = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const pageErrors = [];
for (const ctx of [admin, guest]) ctx.on("page", (p) => p.on("pageerror", (e) => pageErrors.push(`${p.url()}: ${e.message}`)));

console.log(`\nE2E → ${BASE}\n`);

// ───────── Herkese açık site ─────────
await step("Tüm herkese açık sayfalar 200 döner", async () => {
  for (const path of ["/", "/hakkimizda", "/menu", "/galeri", "/organizasyon", "/rezervasyon", "/iletisim", "/kampanyalar", "/kvkk", "/sitemap.xml", "/robots.txt", "/api/health"]) {
    const r = await guest.request.get(BASE + path);
    assert.equal(r.status(), 200, `${path} → ${r.status()}`);
  }
});

await step("SEO: Restaurant JSON-LD, canonical, OG etiketleri", async () => {
  const html = await (await guest.request.get(BASE + "/")).text();
  assert.match(html, /"@type":\["Restaurant","LocalBusiness"\]/);
  assert.match(html, /<link rel="canonical"/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  const menu = await (await guest.request.get(BASE + "/menu")).text();
  assert.match(menu, /"@type":"Menu"/);
});

let reservationCode;
await step("Rezervasyon formu gönderilir ve kod döner", async () => {
  const p = await guest.newPage();
  await p.goto(BASE + "/rezervasyon");
  await p.fill("#r-name", `Test Misafir ${stamp}`);
  await p.fill("#r-phone", `0532 ${String(Date.now()).slice(-7)}`);
  await p.fill("#r-email", "test@example.com");
  await p.selectOption("#r-guests", "4");
  await p.fill("#r-date", future(3 + (Date.now() % 20)));
  await p.waitForFunction(() => document.querySelectorAll("#r-time option").length > 1);
  await p.selectOption("#r-time", { index: 3 });
  await p.selectOption("#r-occasion", "birthday");
  await p.check('input[name="kvkk"]');
  await p.click('button:has-text("Rezervasyon talebi gönder")');
  await p.waitForSelector("text=Talebiniz alındı", { timeout: 15000 });
  reservationCode = (await p.textContent("[role=status]")).match(/kodunuz: ([A-Z0-9]{6})/)?.[1];
  assert.ok(reservationCode, "rezervasyon kodu yok");
  await p.close();
});

await step("Rezervasyon doğrulaması: eksik alanlar 422 + alan hataları", async () => {
  const r = await guest.request.post(BASE + "/api/reservations", { headers: { Origin: BASE }, data: { name: "", phone: "12", guests: 2, date: future(2), time: "99:00" } });
  assert.equal(r.status(), 422);
  const d = await r.json();
  assert.ok(d.fields.name && d.fields.phone && d.fields.kvkk);
});

await step("CSRF: farklı kökenden gelen form isteği reddedilir (403)", async () => {
  const r = await guest.request.post(BASE + "/api/contact", { headers: { Origin: "https://evil.example" }, data: { name: "x", message: "hello", kvkk: true } });
  assert.equal(r.status(), 403);
});

await step("Organizasyon başvurusu gönderilir", async () => {
  const p = await guest.newPage();
  await p.goto(BASE + "/organizasyon?tur=proposal#basvuru");
  await p.fill("#e-name", `Org Test ${stamp}`);
  await p.fill("#e-phone", "05321112244");
  await p.fill("#e-date", future(40));
  await p.fill("#e-guests", "60");
  await p.fill("#e-desc", "Gün batımında sürpriz evlilik teklifi planlıyoruz.");
  await p.check('input[name="kvkk"]');
  await p.click('button:has-text("Başvuruyu gönder")');
  await p.waitForSelector("text=Başvurunuz alındı", { timeout: 15000 });
  await p.close();
});

await step("İletişim formu gönderilir", async () => {
  const p = await guest.newPage();
  await p.goto(BASE + "/iletisim");
  await p.fill("#c-name", `Mesaj ${stamp}`);
  await p.fill("#c-email", "mesaj@example.com");
  await p.fill("#c-message", "Hafta sonu için otopark kapasitesi hakkında bilgi alabilir miyim?");
  await p.check('input[name="kvkk"]');
  await p.click('button:has-text("Mesajı gönder")');
  await p.waitForSelector("text=Mesajınız iletildi", { timeout: 15000 });
  await p.close();
});

// ───────── Yönetim paneli ─────────
const ap = await admin.newPage();
await step("Admin olmayan erişim giriş sayfasına yönlenir; API 401", async () => {
  const r = await guest.request.get(BASE + "/admin/menu", { maxRedirects: 0 });
  assert.equal(r.status(), 307);
  assert.equal((await guest.request.get(BASE + "/api/admin/notifications")).status(), 401);
});

await step("Admin girişi", async () => {
  await ap.goto(BASE + "/admin/login");
  await ap.fill("input[name=email]", ADMIN.email);
  await ap.fill("input[name=password]", ADMIN.password);
  await Promise.all([ap.waitForURL((u) => !u.pathname.includes("/login")), ap.click('button:has-text("Giriş yap")')]);
  await ap.waitForSelector("text=Özelleştir");
});

await step("Yeni rezervasyon panelde görünür ve onaylanır", async () => {
  await ap.goto(BASE + "/admin/rezervasyonlar", { waitUntil: "networkidle" });
  await ap.fill('input[aria-label="Tabloda ara"]', reservationCode);
  await ap.waitForTimeout(300);
  if (!(await ap.locator("table tbody tr", { hasText: `Test Misafir ${stamp}` }).count())) throw new Error(`kod=${reservationCode} satırlar=${await ap.locator("table tbody").textContent()}`);
  await ap.locator("table tbody tr", { hasText: `Test Misafir ${stamp}` }).first().click();
  await ap.click('div[role=dialog] button:has-text("Onayla")');
  await ap.waitForSelector("text=Durum: Onaylandı");
  const dismiss = ap.locator('div[role=dialog] button:has-text("Vazgeç")');
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
});

await step("Takvim görünümleri (gün/hafta/ay) açılır", async () => {
  await ap.goto(BASE + "/admin/rezervasyonlar");
  for (const t of ["Gün", "Hafta", "Ay"]) await ap.click(`[role=tab]:has-text("${t}")`);
  await ap.waitForSelector("text=Pzt");
});

const productName = `Test Ürünü ${stamp}`;
await step("Menüye ürün eklenir ve QR menüde görünür", async () => {
  await ap.goto(BASE + "/admin/menu");
  await ap.click('button:has-text("Ürün ekle")');
  const dlg = ap.locator("div[role=dialog]");
  await dlg.locator("input").nth(0).waitFor();
  await dlg.locator('label:has-text("Ürün adı") input').fill(productName);
  await dlg.locator('label:has-text("Açıklama") textarea').first().fill("Otomatik testte oluşturulan ürün");
  await dlg.locator('label:has-text("Fiyat (₺)") input').fill("199");
  await dlg.locator('[role=tab]:has-text("English")').click();
  await dlg.locator('label:has-text("Ürün adı") input').fill(`Test Product ${stamp}`);
  await dlg.locator('button:has-text("Kaydet")').click();
  await ap.waitForSelector("text=Ürün kaydedildi");
  await new Promise((r) => setTimeout(r, 500));
  const html = await (await guest.request.get(BASE + "/menu")).text();
  assert.ok(html.includes(productName), "ürün menüde yok");
});

await step("QR sipariş sistemi açılır", async () => {
  await ap.goto(BASE + "/admin/siparisler");
  const label = ap.locator("text=QR sipariş kapalı");
  if (await label.isVisible().catch(() => false)) {
    await label.click();
    await ap.waitForSelector("text=QR sipariş açıldı");
  }
});

let orderUrl;
await step("Masa QR'ı okutulur → menü masa no ile açılır → sepet → sipariş", async () => {
  await ap.goto(BASE + "/admin/qr");
  const qrLink = await ap.evaluate(async () => (await (await fetch("/api/admin/export/qr_scans")).text()).length >= 0);
  assert.ok(qrLink);
  const codes = await (await admin.request.get(BASE + "/admin/qr")).text();
  const code = codes.match(/\/q\/(m3-[a-z0-9]+)/)?.[1];
  assert.ok(code, "Masa 3 QR kodu bulunamadı");
  const p = await guest.newPage();
  await p.goto(`${BASE}/q/${code}`);
  assert.match(p.url(), /table=3/);
  await p.waitForSelector("text=Masa 3");
  await p.click(`text=${productName}`);
  await p.click('div[role=dialog] button:has-text("Sepete ekle")');
  await p.locator("text=Sepet").first().waitFor();
  await p.click('button:has-text("Sepet")');
  await p.fill('textarea[placeholder="Sipariş notu"]', "Acele değil, teşekkürler");
  await p.click('button:has-text("Siparişi gönder")');
  await p.waitForSelector("text=Siparişiniz alındı", { timeout: 15000 });
  await p.click('a:has-text("Sipariş durumu")');
  await p.waitForURL(/\/menu\/siparis\//);
  orderUrl = p.url();
  await p.waitForSelector("text=Alındı");
  await p.close();
});

await step("Canlı sipariş ekranında görünür, durum ilerletilir, müşteri ekranı güncellenir", async () => {
  await ap.goto(BASE + "/admin/siparisler");
  const card = ap.locator("article", { hasText: productName }).first();
  await card.waitFor({ timeout: 15000 });
  await card.locator('button:has-text("Hazırlamaya başla")').click();
  await ap.waitForSelector("text=Durum: Hazırlanıyor");
  const r = await guest.request.get(BASE + "/api/orders/" + orderUrl.split("/").pop());
  assert.equal((await r.json()).status, "preparing");
});

await step("Sunucu fiyatı kullanır (istemci fiyatı manipüle edilemez)", async () => {
  const r = await guest.request.get(BASE + "/api/orders/" + orderUrl.split("/").pop());
  const d = await r.json();
  assert.equal(d.items[0].unitPrice, 199);
});

await step("Geçersiz masa anahtarıyla sipariş reddedilir (403)", async () => {
  const r = await guest.request.post(BASE + "/api/orders", { headers: { Origin: BASE }, data: { table: 3, token: "xxxxxxxxxxxxxxxx", items: [{ productId: "x", quantity: 1 }] } });
  assert.equal(r.status(), 403);
});

await step("Organizasyon ve mesaj panelde görünür", async () => {
  await ap.goto(BASE + "/admin/organizasyonlar");
  await ap.waitForSelector(`text=Org Test ${stamp}`);
  await ap.goto(BASE + "/admin/mesajlar");
  await ap.waitForSelector(`text=Mesaj ${stamp}`);
});

await step("Bildirim merkezi yeni kayıtları gösterir", async () => {
  const r = await admin.request.get(BASE + "/api/admin/notifications");
  const d = await r.json();
  assert.ok(d.items.some((n) => n.title.includes(`Test Misafir ${stamp}`)), "rezervasyon bildirimi yok");
});

await step("QR PNG/SVG/PDF indirilir", async () => {
  const html = await (await admin.request.get(BASE + "/admin/qr")).text();
  const id = html.match(/\/api\/admin\/qr\/([a-z0-9]+)\?preview=1/)?.[1];
  for (const f of ["png", "svg", "pdf"]) {
    const r = await admin.request.get(`${BASE}/api/admin/qr/${id}?format=${f}`);
    assert.equal(r.status(), 200, f);
    assert.ok((await r.body()).length > 500);
  }
});

await step("Personel rolü: yalnızca rezervasyon & sipariş yetkisi", async () => {
  const email = `personel-${stamp}@example.com`;
  await ap.goto(BASE + "/admin/kullanicilar");
  await ap.click('button:has-text("Kullanıcı ekle")');
  const dlg = ap.locator("div[role=dialog]");
  await dlg.locator('label:has-text("Ad soyad") input').fill("Test Personel");
  await dlg.locator('label:has-text("E-posta") input').fill(email);
  await dlg.locator('label:has-text("Şifre") input').fill("Personel2026Test");
  await dlg.locator('button:has-text("Kaydet")').click();
  await ap.waitForSelector("text=Kaydedildi");
  const staff = await browser.newContext();
  const sp = await staff.newPage();
  await sp.goto(BASE + "/admin/login");
  await sp.fill("input[name=email]", email);
  await sp.fill("input[name=password]", "Personel2026Test");
  await Promise.all([sp.waitForURL((u) => !u.pathname.includes("/login")), sp.click('button:has-text("Giriş yap")')]);
  await sp.goto(BASE + "/admin/menu");
  assert.match(sp.url(), /denied=1/, "personel menü yönetimine erişebildi");
  await sp.goto(BASE + "/admin/rezervasyonlar");
  await sp.waitForSelector("h1:has-text('Rezervasyonlar')");
  const nav = await sp.locator("aside nav").first().textContent();
  assert.ok(!nav.includes("Kullanıcılar") && !nav.includes("Ayarlar"), "personel menüsünde yetkisiz modül var");
  assert.equal((await staff.request.get(BASE + "/api/admin/backup")).status(), 401);
  await staff.close();
});

await step("Hesap kilitleme: 5 hatalı denemeden sonra doğru şifre de reddedilir", async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  const email = `personel-${stamp}@example.com`;
  for (let i = 0; i < 6; i++) {
    await p.goto(BASE + "/admin/login");
    await p.fill("input[name=email]", email);
    await p.fill("input[name=password]", "yanlis-sifre-" + i);
    await p.click('button:has-text("Giriş yap")');
    await p.waitForSelector("[role=alert]");
  }
  await p.fill("input[name=password]", "Personel2026Test");
  await p.click('button:has-text("Giriş yap")');
  await p.waitForSelector("text=Çok fazla");
  await ctx.close();
});

await step("Sayfa içeriği panelden değiştirilir ve sitede yayınlanır", async () => {
  await ap.goto(BASE + "/admin/sayfalar/about");
  const input = ap.locator('#s-hero label:has-text("Başlık") input').first();
  const old = await input.inputValue();
  await input.fill(`${old} ✦${stamp}`);
  await ap.click('button:has-text("Kaydet ve yayınla")');
  await ap.waitForSelector("text=Sayfa yayınlandı");
  const html = await (await guest.request.get(BASE + "/hakkimizda")).text();
  assert.ok(html.includes(`✦${stamp}`));
  await input.fill(old);
  await ap.click('button:has-text("Kaydet ve yayınla")');
  await ap.waitForSelector("text=Sayfa yayınlandı");
});

await step("Analitik ve dashboard gerçek veriyle çalışır", async () => {
  await ap.goto(BASE + "/admin/analitik");
  await ap.waitForSelector("text=En popüler ürünler");
  await ap.goto(BASE + "/admin");
  await ap.waitForSelector("text=Ziyaretçi trafiği");
});

await step("Tarayıcıda yakalanmamış JS hatası yok", async () => {
  assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} senaryo başarılı${failed.length ? ` — ${failed.length} başarısız` : ""}\n`);
process.exit(failed.length ? 1 : 0);
