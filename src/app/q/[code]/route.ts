import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deviceFromUA, hashValue, isBot } from "@/lib/security";
import { track } from "@/lib/analytics";

/** QR kodların kodladığı kısa bağlantı: taramayı kaydeder, menüye (masa numarasıyla) yönlendirir. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const base = process.env.APP_URL || new URL(req.url).origin;
  const qr = await db.qrCode.findUnique({ where: { code: code.slice(0, 60) }, include: { table: true } });
  if (!qr || !qr.active) return NextResponse.redirect(new URL("/menu", base), 302);

  const ua = req.headers.get("user-agent") || "";
  if (!isBot(ua)) {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    await db.$transaction([
      db.qrScan.create({ data: { qrCodeId: qr.id, device: deviceFromUA(ua), userAgent: ua.slice(0, 300), ipHash: ip ? hashValue(ip) : null } }),
      db.qrCode.update({ where: { id: qr.id }, data: { scanCount: { increment: 1 }, lastScanAt: new Date() } }),
    ]);
    await track("qr_scan", { path: `/q/${qr.code}`, entityId: qr.id, entityName: qr.label, ua, source: "qr" });
  }

  const url = new URL(qr.targetPath || "/menu", base);
  if (qr.table && qr.table.active) {
    url.searchParams.set("table", String(qr.table.number));
    url.searchParams.set("t", qr.table.orderToken);
  }
  url.searchParams.set("src", "qr");
  return NextResponse.redirect(url, 302);
}
