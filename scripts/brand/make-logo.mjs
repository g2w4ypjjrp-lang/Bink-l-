import sharp from "sharp";
const SRC = process.argv[2], OUT = process.argv[3];
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const full = Buffer.from(data), light = Buffer.from(data);
const LEAF_Y = Math.round(H * 0.42); // üstteki büyük yaprak bu çizginin üstünde
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 4;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = (r + g + b) / 3, S = mx - mn;
  // dama tahtası + beyaz hale: düşük doygunluk, açık renk → saydam (yumuşak kenar)
  let a = 1;
  // arka plan griler 210–255 aralığında; yazılar ~30–60
  if (S < 30) a = Math.min(1, Math.max(0, (195 - L) / 75));
  else if (L > 185 && S < 60) a = Math.min(1, Math.max(0, (225 - L) / 40));
  const A = Math.round(a * 255);
  full[i + 3] = A; light[i + 3] = A;
  if (a > 0 && a < 1) { // kenarlarda beyaz saçak kalmasın
    for (const buf of [full]) { buf[i] = Math.min(r, 70); buf[i + 1] = Math.min(g, 95); buf[i + 2] = Math.min(b, 45); }
  }
  // açık zemin (koyu hero / footer) sürümü: yazılar krem, büyük yaprak doğal renginde
  if (y > LEAF_Y) { light[i] = 246; light[i + 1] = 241; light[i + 2] = 231; }
}
const raw = { raw: { width: W, height: H, channels: 4 } };
const trimmed = async (buf) => sharp(await sharp(buf, raw).png().toBuffer()).trim({ threshold: 1 }).toBuffer();
const f = await trimmed(full), l = await trimmed(light);
const meta = await sharp(f).metadata();
console.log("trimmed", meta.width, meta.height);
for (const [name, buf] of [["logo", f], ["logo-light", l]]) {
  await sharp(buf).resize({ height: 240 }).webp({ quality: 90, alphaQuality: 100 }).toFile(`${OUT}/${name}.webp`);
  await sharp(buf).resize({ height: 240 }).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}.png`);
}
// büyük yaprak → simge (favicon / ana ekran)
const leaf = await sharp(await sharp(full, raw).extract({ left: 0, top: 0, width: W, height: LEAF_Y }).png().toBuffer()).trim({ threshold: 1 }).toBuffer();
const sq = (s, pad, bg) => sharp(leaf).resize({ width: s - pad * 2, height: s - pad * 2, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: pad, bottom: pad, left: pad, right: pad, background: bg ?? { r: 0, g: 0, b: 0, alpha: 0 } });
await sq(512, 40, { r: 246, g: 241, b: 231, alpha: 1 }).flatten({ background: "#F6F1E7" }).png().toFile(`${OUT}/icon-512.png`);
await sq(180, 16).flatten({ background: "#F6F1E7" }).png().toFile(`${OUT}/apple-touch-icon.png`);
await sq(64, 2).png().toFile(`${OUT}/icon-64.png`);
// paylaşım görseli için tam logo (krem zemin)
await sharp(f).resize({ width: 900 }).extend({ top: 120, bottom: 120, left: 150, right: 150, background: "#F6F1E7" }).flatten({ background: "#F6F1E7" }).png().toFile(`${OUT}/logo-card.png`);
console.log("ok");
