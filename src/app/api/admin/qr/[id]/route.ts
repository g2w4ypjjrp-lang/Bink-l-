import { db } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { qrPng, qrSvg } from "@/lib/qr";
import { slugify } from "@/lib/utils";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiUser("qr.manage"))) return new Response("Yetkisiz", { status: 401 });
  const { id } = await params;
  const qr = await db.qrCode.findUnique({ where: { id } });
  if (!qr) return new Response("Bulunamadı", { status: 404 });
  const format = new URL(req.url).searchParams.get("format") || "png";
  const name = `qr-${slugify(qr.label) || qr.code}`;
  const dl = (ext: string) => ({ "Content-Disposition": `attachment; filename="${name}.${ext}"`, "Cache-Control": "no-store" });
  if (format === "svg") return new Response(await qrSvg(qr.code), { headers: { "Content-Type": "image/svg+xml", ...dl("svg") } });
  const sp = new URL(req.url).searchParams;
  const preview = sp.get("preview") === "1";
  const size = Math.min(1600, Math.max(200, Number(sp.get("size")) || 1200));
  return new Response(new Uint8Array(await qrPng(qr.code, preview ? 320 : size)), { headers: { "Content-Type": "image/png", ...(preview || sp.get("size") ? { "Cache-Control": "private, max-age=300" } : dl("png")) } });
}
