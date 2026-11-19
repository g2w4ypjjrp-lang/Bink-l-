/**
 * Mevcut veritabanındaki menüyü prisma/menu-data.ts içindeki gerçek menüyle değiştirir.
 * Geçmiş siparişler korunur (sipariş satırlarında ürün adı ve fiyatı saklıdır).
 * Kullanım: npx tsx prisma/import-menu.ts
 */
import { PrismaClient } from "@prisma/client";
import { writeMenu } from "./menu-data";

const db = new PrismaClient();

async function main() {
  const before = await db.product.count();
  await db.$transaction([db.product.deleteMany(), db.category.updateMany({ data: { parentId: null } }), db.category.deleteMany()]);
  const n = await writeMenu(db);
  const hidden = await db.product.count({ where: { active: false } });
  console.log(`✓ Menü güncellendi: ${before} eski ürün silindi, ${n} ürün eklendi (${hidden} tanesi fiyatı olmadığı için gizli).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
