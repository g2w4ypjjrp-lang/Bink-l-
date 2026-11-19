/**
 * Menü ürünlerine açık lisanslı (Wikimedia Commons) temsili fotoğrafları indirir ve atar.
 * Kaynak, yazar ve lisans bilgileri src/lib/image-credits.json içindedir ve /gorsel-kaynaklari sayfasında gösterilir.
 * İşletmenin kendi ürün fotoğrafları panelden yüklendiğinde bu görsellerin yerini alır.
 * Kullanım: npx tsx prisma/menu-images.ts
 */
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import path from "path";
import { promises as fs } from "fs";
import credits from "../src/lib/image-credits.json";

const db = new PrismaClient();
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const UA = { "User-Agent": "RestaurantMenuImageBot/1.0 (menu image import)" };
const slug = (s: string) => s.toLowerCase().replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchImage(url: string): Promise<Buffer> {
  for (let a = 0; a < 6; a++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429) throw new Error(`${res.status} ${url}`);
    await sleep(4000 * (a + 1));
  }
  throw new Error(`429 ${url}`);
}

export async function applyMenuImages(prisma: PrismaClient = db) {
  const dir = path.join(UPLOAD_DIR, "menu");
  await fs.mkdir(dir, { recursive: true });
  let ok = 0;
  for (const c of credits as { item: string; title: string; download: string }[]) {
    const name = slug(c.item);
    const file = path.join(dir, `${name}.webp`);
    try {
      await fs.access(file);
    } catch {
      try {
        const buf = await fetchImage(c.download);
        const img = sharp(buf).rotate();
        await img.clone().resize({ width: 1200, height: 900, fit: "cover", position: "attention" }).webp({ quality: 80 }).toFile(file);
        await img.clone().resize({ width: 480, height: 360, fit: "cover", position: "attention" }).webp({ quality: 74 }).toFile(path.join(dir, `${name}_t.webp`));
        await sleep(500);
      } catch (e) {
        console.warn(`  ! ${c.item}: indirilemedi (${(e as Error).message})`);
        continue;
      }
    }
    const products = await prisma.product.findMany({ where: { name: c.item } });
    for (const p of products) {
      await prisma.productImage.deleteMany({ where: { productId: p.id } });
      await prisma.productImage.create({ data: { productId: p.id, url: `/uploads/menu/${name}.webp`, alt: c.item, sortOrder: 0 } });
    }
    if (products.length) ok++;
  }
  return ok;
}

if (require.main === module) {
  applyMenuImages()
    .then((n) => console.log(`✓ ${n} ürüne görsel atandı.`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
