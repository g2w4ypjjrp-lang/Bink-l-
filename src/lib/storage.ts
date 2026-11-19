import "server-only";
import path from "path";
import { db } from "./db";
import { isWorkers } from "./runtime";

/**
 * Medya depolama.
 *  - "fs" (varsayılan, VPS/Docker): dosyalar UPLOAD_DIR klasörüne yazılır; görseller sharp ile WebP'ye çevrilir.
 *  - "db" (Cloudflare Workers veya STORAGE_DRIVER=db): dosyalar veritabanındaki `files` tablosunda tutulur.
 */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "./storage/uploads");
export const storesInDb = () => isWorkers || process.env.STORAGE_DRIVER === "db";
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // veritabanı depolamasında makul sınır

export type StoredFile = { url: string; thumbUrl?: string; width?: number; height?: number; type: "image" | "video"; bytes: number };

const MIME: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", png: "image/png", gif: "image/gif", avif: "image/avif", mp4: "video/mp4", webm: "video/webm" };

/** Dosya imzasından gerçek türü tespit eder (uzantıya/MIME'a güvenmez). */
function sniff(b: Uint8Array): keyof typeof MIME | null {
  const s = (o: number, l: number) => String.fromCharCode(...b.subarray(o, o + l));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && s(1, 3) === "PNG") return "png";
  if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return "webp";
  if (s(0, 3) === "GIF") return "gif";
  if (s(4, 4) === "ftyp") return /avif|avis/.test(s(8, 4)) ? "avif" : "mp4";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "webm";
  return null;
}

/** JPEG'den EXIF/APP segmentlerini (GPS konumu vb.) çıkarır. */
function stripJpegMeta(b: Uint8Array): Uint8Array {
  const out: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const marker = b[i + 1];
    if (marker === 0xda) break; // görüntü verisinin başlangıcı
    const len = (b[i + 2] << 8) | b[i + 3];
    const isMeta = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe; // APP1-APP15, COM
    if (!isMeta) out.push(b.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  out.push(b.subarray(i));
  const total = out.reduce((a, x) => a + x.length, 0);
  const res = new Uint8Array(total);
  let o = 0;
  for (const x of out) {
    res.set(x, o);
    o += x.length;
  }
  return res;
}

function newName() {
  const d = new Date();
  const dir = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (x) => x.toString(16).padStart(2, "0")).join("");
  return { dir, id };
}

async function fsMod() {
  return (await import("fs")).promises;
}

export async function saveFile(rel: string, data: Uint8Array, mime: string) {
  if (storesInDb()) {
    const bytes = new Uint8Array(data) as Uint8Array<ArrayBuffer>;
    await db.storedFile.upsert({ where: { path: rel }, update: { data: bytes, mime, size: bytes.length }, create: { path: rel, data: bytes, mime, size: bytes.length } });
    return;
  }
  const fs = await fsMod();
  const abs = path.join(UPLOAD_DIR, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
}

export async function readFile(rel: string): Promise<{ data: Uint8Array; mime: string } | null> {
  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME[ext === "jpeg" ? "jpg" : ext];
  if (!mime) return null;
  if (storesInDb()) {
    const f = await db.storedFile.findUnique({ where: { path: rel } });
    return f ? { data: f.data, mime: f.mime } : null;
  }
  const abs = path.resolve(UPLOAD_DIR, rel);
  if (!abs.startsWith(UPLOAD_DIR + path.sep)) return null;
  try {
    return { data: await (await fsMod()).readFile(abs), mime };
  } catch {
    return null;
  }
}

/** Görselleri doğrular; sunucuda (Node) WebP'ye çevirir ve önizleme üretir, Workers'ta meta verisi temizlenmiş orijinali saklar. */
export async function storeUpload(file: File): Promise<StoredFile> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) throw new Error("Desteklenmeyen dosya türü. JPG, PNG, WebP, AVIF veya MP4 yükleyin.");
  const { dir, id } = newName();

  if (kind === "mp4" || kind === "webm") {
    if (buf.length > MAX_VIDEO_BYTES) throw new Error(`Video en fazla ${MAX_VIDEO_BYTES / 1048576} MB olabilir.`);
    const rel = `${dir}/${id}.${kind}`;
    await saveFile(rel, buf, MIME[kind]);
    return { url: `/uploads/${rel}`, type: "video", bytes: buf.length };
  }
  if (buf.length > MAX_IMAGE_BYTES) throw new Error("Görsel en fazla 12 MB olabilir.");

  if (!isWorkers) {
    // Node: sharp ile doğrula, döndür, EXIF'i sil, WebP'ye çevir, önizleme üret
    const req = eval("require") as NodeRequire;
    const sharp = req("sharp") as typeof import("sharp");
    let img;
    try {
      img = sharp(Buffer.from(buf), { failOn: "error", limitInputPixels: 100_000_000 }).rotate();
      await img.metadata();
    } catch {
      throw new Error("Görsel okunamadı veya bozuk.");
    }
    const main = await img.clone().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    const thumb = await img.clone().resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
    await saveFile(`${dir}/${id}.webp`, main.data, "image/webp");
    await saveFile(`${dir}/${id}_t.webp`, thumb, "image/webp");
    return { url: `/uploads/${dir}/${id}.webp`, thumbUrl: `/uploads/${dir}/${id}_t.webp`, width: main.info.width, height: main.info.height, type: "image", bytes: main.data.length };
  }

  const clean = kind === "jpg" ? stripJpegMeta(buf) : buf;
  const rel = `${dir}/${id}.${kind}`;
  await saveFile(rel, clean, MIME[kind]);
  return { url: `/uploads/${rel}`, type: "image", bytes: clean.length };
}

export async function deleteUpload(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/") || url.startsWith("/uploads/seed/") || url.startsWith("/uploads/menu/")) return;
  const rel = url.replace(/^\/uploads\//, "");
  const thumb = rel.endsWith(".webp") && !rel.endsWith("_t.webp") ? rel.replace(/\.webp$/, "_t.webp") : null;
  if (storesInDb()) {
    await db.storedFile.deleteMany({ where: { path: { in: [rel, ...(thumb ? [thumb] : [])] } } });
    return;
  }
  const fs = await fsMod();
  const abs = path.resolve(UPLOAD_DIR, rel);
  if (!abs.startsWith(UPLOAD_DIR)) return;
  await fs.unlink(abs).catch(() => {});
  if (thumb) await fs.unlink(path.resolve(UPLOAD_DIR, thumb)).catch(() => {});
}

export async function dirSize(): Promise<{ bytes: number; files: number }> {
  if (storesInDb()) {
    const a = await db.storedFile.aggregate({ _sum: { size: true }, _count: { _all: true } });
    return { bytes: a._sum.size ?? 0, files: a._count._all };
  }
  const fs = await fsMod();
  let bytes = 0;
  let files = 0;
  async function walk(d: string) {
    const entries = await fs.readdir(d, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else {
        files++;
        bytes += (await fs.stat(p)).size;
      }
    }
  }
  await walk(UPLOAD_DIR);
  return { bytes, files };
}
