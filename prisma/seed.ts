import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import path from "path";
import { promises as fs } from "fs";
import { PERMISSIONS, DEFAULT_ROLES } from "../src/lib/permissions";
import { writeMenu } from "./menu-data";
import { applyMenuImages } from "./menu-images";

const db = new PrismaClient();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");

/** Başlangıç görselleri (Unsplash lisansı). İşletme kendi fotoğraflarını panelden yükleyerek bunları değiştirmelidir. */
const SEED_IMAGES: Record<string, [string, number]> = {
  hero: ["1425913397330-cf8af2ff40a1", 2400],
  "forest-path": ["1441974231531-c6227db76b6e", 1800],
  "forest-mist": ["1448375240586-882707db888b", 2200],
  garden: ["1585320806297-9794b3e4eeae", 1800],
  "long-table": ["1511795409834-ef04bbd61622", 1800],
  "table-dinner": ["1414235077428-338989a2e8c0", 1600],
  nature: ["1500534314209-a25ddb2bd429", 1800],
  "wedding-table": ["1519225421980-715cb0215aed", 1800],
  proposal: ["1465495976277-4387d4b0b4c6", 1400],
  party: ["1464366400600-7168b8af9bc3", 1600],
  "breakfast-board": ["1541529086526-db283c563270", 1400],
  "breakfast-eggs": ["1533089860892-a7c6f0a88666", 1200],
  "breakfast-toast": ["1525351484163-7529414344d8", 1200],
  pancakes: ["1484723091739-30a097e8f929", 1200],
  soup: ["1547592166-23ac45744acd", 1200],
  salad: ["1540189549336-e6e99c3679fe", 1200],
  "salad-bowl": ["1512621776951-a57141f2eefd", 1200],
  pasta: ["1473093295043-cdd812d0e601", 1200],
  grill: ["1555939594-58d7cb561ad1", 1400],
  steak: ["1600891964092-4316c288032e", 1200],
  chicken: ["1598103442097-8b74394b95c6", 1200],
  fish: ["1519708227418-c8fd9a32b7a2", 1200],
  burger: ["1568901346375-23c9450c58cd", 1200],
  pizza: ["1565299624946-b28f40a0ae38", 1200],
  fries: ["1573080496219-bb080dd4f877", 1200],
  wrap: ["1529006557810-274b9b2fc783", 1200],
  cake: ["1578985545062-69928b1d9587", 1200],
  parfait: ["1563805042-7684c019e1cb", 1200],
  icecream: ["1497034825429-c343d7c6a68f", 1200],
  coffee: ["1509042239860-f550ce710b93", 1200],
  tea: ["1544787219-7f47ccb76574", 1200],
  lemonade: ["1621263764928-df1444c5e859", 1200],
  restaurant: ["1466978913421-dad2ebd01d17", 1600],
  "food-spread": ["1504674900247-0877df9cc836", 1600],
};

async function downloadImages() {
  const dir = path.join(UPLOAD_DIR, "seed");
  await fs.mkdir(dir, { recursive: true });
  await Promise.all(
    Object.entries(SEED_IMAGES).map(async ([name, [id, w]]) => {
      const out = path.join(dir, `${name}.webp`);
      try {
        await fs.access(out);
        return;
      } catch {}
      try {
        const res = await fetch(`https://images.unsplash.com/photo-${id}?w=${w}&q=80&fm=jpg`);
        if (!res.ok) throw new Error(String(res.status));
        const buf = Buffer.from(await res.arrayBuffer());
        await sharp(buf).webp({ quality: 80 }).toFile(out);
        await sharp(buf).resize({ width: 800 }).webp({ quality: 74 }).toFile(path.join(dir, `${name}_t.webp`));
      } catch (e) {
        // Ağ yoksa doğal tonlarda bir yer tutucu üret
        console.warn(`Görsel indirilemedi (${name}): ${e}. Yer tutucu oluşturuluyor.`);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#173D2B"/><stop offset="1" stop-color="#84977D"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
        await sharp(Buffer.from(svg)).webp().toFile(out);
        await sharp(Buffer.from(svg)).resize({ width: 800 }).webp().toFile(path.join(dir, `${name}_t.webp`));
      }
    })
  );
}

const I = (n: string) => `/uploads/seed/${n}.webp`;

const ALLERGENS = [
  ["gluten", "Gluten", "Gluten", "Gluten", "🌾"], ["milk", "Süt", "Milk", "Milch", "🥛"], ["eggs", "Yumurta", "Eggs", "Eier", "🥚"],
  ["nuts", "Kabuklu yemiş", "Tree nuts", "Schalenfrüchte", "🌰"], ["peanuts", "Yer fıstığı", "Peanuts", "Erdnüsse", "🥜"], ["fish", "Balık", "Fish", "Fisch", "🐟"],
  ["crustaceans", "Kabuklu deniz ürünleri", "Crustaceans", "Krebstiere", "🦐"], ["soy", "Soya", "Soy", "Soja", "🫘"], ["celery", "Kereviz", "Celery", "Sellerie", "🥬"],
  ["mustard", "Hardal", "Mustard", "Senf", "🌭"], ["sesame", "Susam", "Sesame", "Sesam", "⚪"], ["sulphites", "Sülfit", "Sulphites", "Sulfite", "🍷"],
  ["lupin", "Acı bakla", "Lupin", "Lupinen", "🌼"], ["molluscs", "Yumuşakçalar", "Molluscs", "Weichtiere", "🐚"],
] as const;

const EVENTS = [
  ["birthday", "Doğum Günü", "Pastası, süslemesi ve sürprizleriyle doğanın içinde unutulmaz doğum günleri.", "party"],
  ["engagement", "Nişan", "Ağaçların arasında, sevdiklerinizle zarif bir nişan töreni.", "wedding-table"],
  ["promise", "Söz", "Ailelerin buluştuğu samimi söz merasimleri için özel düzen.", "long-table"],
  ["proposal", "Evlilik Teklifi", "Işıklar, çiçekler ve sadece ikinize ait bir köşe: Evet demek hiç bu kadar kolay olmamıştı.", "proposal"],
  ["wedding", "Düğün", "Kır düğünü hayaliniz için açık hava alanı, menü ve organizasyon desteği.", "wedding-table"],
  ["henna", "Kına", "Geleneksel kına gecesi, bahçe ışıkları altında.", "garden"],
  ["private", "Özel Davet", "Yıl dönümü, mezuniyet ya da sadece bir araya gelmek için özel davetler.", "table-dinner"],
  ["corporate", "Kurumsal Etkinlik", "Ekip buluşmaları, lansmanlar ve toplantılar için doğada ilham veren bir mekân.", "long-table"],
  ["family", "Aile Buluşması", "Kalabalık aileler için uzun sofralar ve çocuklara özel alanlar.", "food-spread"],
  ["photoshoot", "Fotoğraf Çekimi", "Dış çekim, düğün öncesi ve ürün çekimleri için doğal fon.", "forest-path"],
  ["other", "Diğer", "Hayalinizdeki organizasyonu bize anlatın, birlikte planlayalım.", "nature"],
] as const;

async function main() {
  console.log("→ Görseller hazırlanıyor…");
  await downloadImages();

  console.log("→ Yetkiler ve roller…");
  for (const p of PERMISSIONS) await db.permission.upsert({ where: { key: p.key }, update: { name: p.name, group: p.group }, create: p });
  const perms = await db.permission.findMany();
  for (const r of DEFAULT_ROLES) {
    const role = await db.role.upsert({ where: { key: r.key }, update: {}, create: { key: r.key, name: r.name, description: r.description, system: true } });
    const existing = await db.rolePermission.count({ where: { roleId: role.id } });
    if (!existing) {
      await db.rolePermission.createMany({ data: perms.filter((p) => r.permissions.includes(p.key as never)).map((p) => ({ roleId: role.id, permissionId: p.id })) });
    }
  }
  // admin rolü her zaman tüm yetkilere sahip
  const adminRole = await db.role.findUniqueOrThrow({ where: { key: "admin" } });
  await db.rolePermission.createMany({ data: perms.map((p) => ({ roleId: adminRole.id, permissionId: p.id })), skipDuplicates: true });

  const email = (process.env.ADMIN_EMAIL || "admin@binkilicsaklibahce.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "SakliBahce!2026";
  if (!(await db.user.findUnique({ where: { email } }))) {
    await db.user.create({ data: { email, name: "Yönetici", passwordHash: await bcrypt.hash(password, 12), roleId: adminRole.id } });
    console.log(`  Admin oluşturuldu: ${email}`);
  }

  if ((await db.category.count()) > 0) {
    console.log("Menü verisi zaten mevcut, içerik tohumlaması atlandı.");
    return;
  }

  console.log("→ Alerjenler…");
  for (const [i, [key, tr, en, de, icon]] of ALLERGENS.entries()) {
    await db.allergen.create({ data: { key, nameTr: tr, nameEn: en, nameDe: de, icon, sortOrder: i } });
  }

  console.log("→ Menü…");
  console.log(`  ${await writeMenu(db)} ürün eklendi`);
  try {
    console.log(`  ${await applyMenuImages(db)} ürüne görsel atandı`);
  } catch (e) {
    console.warn("  Menü görselleri indirilemedi:", e);
  }

  console.log("→ Masalar ve QR kodlar…");
  const areas = ["Bahçe", "Bahçe", "Bahçe", "Bahçe", "Çardak", "Çardak", "Kamelya", "Kamelya", "Kapalı salon", "Kapalı salon", "Bahçe", "Bahçe"];
  for (let n = 1; n <= 12; n++) {
    const t = await db.table.create({ data: { number: n, name: `Masa ${n}`, area: areas[n - 1], capacity: n % 3 === 0 ? 6 : 4 } });
    await db.qrCode.create({ data: { code: `m${n}-${Math.random().toString(36).slice(2, 7)}`, label: `Masa ${n}`, type: "table", tableId: t.id, targetPath: "/menu" } });
  }
  await db.qrCode.create({ data: { code: "menu", label: "Genel Menü", type: "general", targetPath: "/menu" } });

  console.log("→ Galeri…");
  const gcats = [["bahce", "Bahçe"], ["restoran", "Restoran"], ["yemekler", "Yemekler"], ["kahvalti", "Kahvaltı"], ["organizasyon", "Organizasyon"], ["dugun", "Düğün"], ["doga", "Doğa"], ["misafirler", "Misafirler"], ["ozel-etkinlikler", "Özel Etkinlikler"]];
  for (const [i, [slug, name]] of gcats.entries()) await db.galleryCategory.create({ data: { slug, name, sortOrder: i } });
  const gc = Object.fromEntries((await db.galleryCategory.findMany()).map((g) => [g.slug, g.id]));
  const gallery: [string, string, string, boolean][] = [
    ["hero", "doga", "Gün ışığında orman", true], ["garden", "bahce", "Çiçekli bahçe yolu", true], ["breakfast-board", "kahvalti", "Serpme kahvaltı sofrası", true],
    ["long-table", "organizasyon", "Açık havada uzun davet masası", true], ["grill", "yemekler", "Közde ızgara tabağı", true], ["forest-path", "doga", "Orman patikası", true],
    ["wedding-table", "dugun", "Düğün masası süslemesi", true], ["breakfast-eggs", "kahvalti", "Sahanda yumurta", false], ["forest-mist", "doga", "Sisli sabah", true],
    ["table-dinner", "restoran", "Akşam yemeği servisi", false], ["proposal", "ozel-etkinlikler", "Evlilik teklifi", false], ["party", "organizasyon", "Kutlama alanı", false],
    ["salad", "yemekler", "Bahçe salatası", false], ["cake", "yemekler", "Çikolatalı pasta", false], ["lemonade", "yemekler", "Ev yapımı limonata", false], ["nature", "doga", "Trakya tepeleri", false],
  ];
  const sizes: Record<string, [number, number]> = {};
  for (const [i, [img, cat, title, home]] of gallery.entries()) {
    try {
      const m = await sharp(path.join(UPLOAD_DIR, "seed", `${img}.webp`)).metadata();
      sizes[img] = [m.width ?? 1600, m.height ?? 1067];
    } catch {
      sizes[img] = [1600, 1067];
    }
    await db.galleryItem.create({ data: { url: I(img), thumbUrl: `/uploads/seed/${img}_t.webp`, title, alt: title, categoryId: gc[cat], showOnHome: home, sortOrder: i, width: sizes[img][0], height: sizes[img][1] } });
  }

  console.log("→ Organizasyon türleri…");
  for (const [i, [key, name, description, img]] of EVENTS.entries()) await db.event.create({ data: { key, name, description, image: I(img), sortOrder: i } });

  console.log("→ Kampanyalar…");
  const kahvalti = await db.category.findUnique({ where: { slug: "kahvalti" } });
  await db.campaign.create({
    data: {
      title: "Hafta İçi Kahvaltı Keyfi", description: "Pazartesi–Perşembe serpme kahvaltıda %15 indirim. Şehirden kaçmanın en lezzetli bahanesi.", image: I("breakfast-board"),
      discountRate: 15, categoryId: kahvalti?.id, startsAt: new Date(), endsAt: new Date(Date.now() + 60 * 864e5),
    },
  });
  await db.campaign.create({
    data: { title: "Doğum Günü Sürprizi", description: "Doğum gününüzde rezervasyon yapın, pastanız bizden olsun.", image: I("cake"), showOnMenu: false },
  });

  console.log("→ Sayfalar…");
  const { PAGES } = await import("../src/lib/page-schema");
  for (const p of PAGES) {
    await db.page.upsert({ where: { key: p.key }, update: {}, create: { key: p.key, title: p.title, slug: p.slug, content: {} } });
  }
  await db.page.update({
    where: { key: "home" },
    data: {
      seoTitle: "BinKılıç Saklı Bahçe Çatalca | Doğa İçinde Kahvaltı, Restoran & Organizasyon",
      seoDescription: "Saklı Bahçe, Çatalca Binkılıç'ta orman içinde serpme kahvaltı, ızgara ve aile restoranı. İstanbul'a yakın doğa içinde doğum günü, nişan ve kır düğünü organizasyonları.",
      seoKeywords: "Saklı Bahçe, Saklı Bahçe Çatalca, Saklı Bahçe İstanbul, BinKılıç Saklı Bahçe, Çatalca restoran, Binkılıç restoran, Çatalca kahvaltı, serpme kahvaltı İstanbul, doğa içinde restoran, Çatalca organizasyon",
    },
  });

  console.log("✓ Tohumlama tamamlandı.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
