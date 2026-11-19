/**
 * Cloudflare statik çıktı adımı (opennextjs-cloudflare build'den SONRA çalışır).
 *
 * 1. Derleme sırasında üretilen herkese açık sayfaların HTML'lerini `.open-next/assets/` içine kopyalar.
 *    Cloudflare bu adreslere gelen istekleri doğrudan statik dosyadan verir; Worker hiç çalışmaz.
 * 2. Veritabanındaki tüm görselleri (`files` tablosu) `.open-next/assets/uploads/` içine yazar ve
 *    menü kutucukları için küçük (`_s.webp`, ~240 px) sürümler üretir.
 * 3. `_headers` dosyasıyla güvenlik ve önbellek başlıklarını ekler.
 *
 * Gerekli ortam değişkeni: DATABASE_URL (Neon "pooler" adresi).
 */
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { neon } from "@neondatabase/serverless";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next/server/app");
const OUT = path.join(ROOT, ".open-next/assets");

// URL → derlenmiş dosya
const PAGES = {
  "index.html": "index.html",
  "menu.html": "menu.html",
  "menu/siparis.html": "menu/siparis.html",
  "galeri.html": "galeri.html",
  "hakkimizda.html": "hakkimizda.html",
  "organizasyon.html": "organizasyon.html",
  "kampanyalar.html": "kampanyalar.html",
  "iletisim.html": "iletisim.html",
  "rezervasyon.html": "rezervasyon.html",
  "kvkk.html": "kvkk.html",
  "gorsel-kaynaklari.html": "gorsel-kaynaklari.html",
  "robots.txt": "robots.txt.body",
  "sitemap.xml": "sitemap.xml.body",
};

async function copyPages() {
  for (const [to, from] of Object.entries(PAGES)) {
    const src = path.join(APP, from);
    const dst = path.join(OUT, to);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
  }
  console.log(`✓ ${Object.keys(PAGES).length} statik sayfa kopyalandı`);
}

/** Menü kutucukları için küçük sürüm adı: x.webp → x_s.webp */
export const smallName = (p) => p.replace(/\.(webp|jpe?g|png|avif|gif)$/i, "_s.webp");

async function exportFiles() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL tanımlı değil");
  const sql = neon(url);
  const list = await sql`select path, size from files order by path`;
  let n = 0, small = 0, bytes = 0;
  for (const { path: rel } of list) {
    if (rel.includes("..")) continue;
    const [row] = await sql`select encode(data, 'base64') as b64 from files where path = ${rel}`;
    const buf = Buffer.from(row.b64, "base64");
    const dst = path.join(OUT, "uploads", rel);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.writeFile(dst, buf);
    n++;
    bytes += buf.length;
    // Küçük sürüm: yalnızca ana görseller (önizleme _t / _s ve videolar hariç)
    if (/\.(webp|jpe?g|png|avif)$/i.test(rel) && !/_(t|s)\.webp$/i.test(rel)) {
      try {
        const out = await sharp(buf).rotate().resize({ width: 240, height: 240, fit: "cover" }).webp({ quality: 74 }).toBuffer();
        await fs.writeFile(path.join(OUT, "uploads", smallName(rel)), out);
        small++;
      } catch (e) {
        console.warn(`! küçük sürüm üretilemedi: ${rel}: ${e.message}`);
      }
    }
  }
  console.log(`✓ ${n} görsel (${(bytes / 1048576).toFixed(1)} MB) ve ${small} küçük sürüm yazıldı`);
}

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://www.google.com https://maps.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

async function writeHeaders() {
  const h = `/*
  Content-Security-Policy: ${CSP}
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
  Cross-Origin-Opener-Policy: same-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

/uploads/*
  Cache-Control: public, max-age=2592000

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/menu/siparis
  X-Robots-Tag: noindex
`;
  await fs.writeFile(path.join(OUT, "_headers"), h);
  console.log("✓ _headers yazıldı");
}

await copyPages();
await exportFiles();
await writeHeaders();
