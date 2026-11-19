/** storage/uploads klasöründeki dosyaları veritabanındaki `files` tablosuna aktarır. Kullanım: npx tsx scripts/import-uploads.ts */
import { PrismaClient } from "@prisma/client";
import path from "path";
import { promises as fs } from "fs";

const db = new PrismaClient();
const ROOT = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
const MIME: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", avif: "image/avif", mp4: "video/mp4", webm: "video/webm" };

async function walk(d: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await fs.readdir(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function main() {
  let n = 0, bytes = 0;
  for (const abs of await walk(ROOT)) {
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    const mime = MIME[rel.split(".").pop()!.toLowerCase()];
    if (!mime) continue;
    const data = new Uint8Array(await fs.readFile(abs));
    await db.storedFile.upsert({ where: { path: rel }, update: { data, mime, size: data.length }, create: { path: rel, data, mime, size: data.length } });
    n++; bytes += data.length;
  }
  console.log(`✓ ${n} dosya aktarıldı (${(bytes / 1048576).toFixed(1)} MB)`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
