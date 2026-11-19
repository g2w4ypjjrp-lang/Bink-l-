import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { qrUsage, istanbulDayStart, trafficSeries } from "@/lib/stats";
import { addDaysISO, todayISO } from "@/lib/utils";
import { qrUrl } from "@/lib/qr";
import { QrAdmin } from "./QrAdmin";

export const metadata = { title: "QR Kodlar & Masalar" };

export default async function QrPage() {
  await requirePagePermission("qr.manage");
  const since30 = istanbulDayStart(addDaysISO(todayISO(), -29));
  const [tables, codes, usage, series, devices] = await Promise.all([
    db.table.findMany({ orderBy: { number: "asc" }, include: { _count: { select: { orders: true } } } }),
    db.qrCode.findMany({ include: { table: true }, orderBy: [{ type: "asc" }, { createdAt: "asc" }] }),
    qrUsage(since30),
    trafficSeries("day", 30),
    db.qrScan.groupBy({ by: ["device"], _count: { _all: true }, where: { createdAt: { gte: since30 } } }),
  ]);
  return (
    <QrAdmin
      tables={tables.map((t) => ({ id: t.id, number: t.number, name: t.name ?? "", area: t.area ?? "", capacity: t.capacity, active: t.active, orders: t._count.orders }))}
      codes={codes
        .map((c) => ({ id: c.id, code: c.code, url: qrUrl(c.code), label: c.label, type: c.type, targetPath: c.targetPath, active: c.active, scanCount: c.scanCount, lastScanAt: c.lastScanAt?.toISOString() ?? null, tableId: c.tableId, tableNumber: c.table?.number ?? null, area: c.table?.area ?? "", period: usage.find((u) => u.id === c.id)?.period ?? 0 }))
        .sort((a, b) => (a.tableNumber ?? 0) - (b.tableNumber ?? 0))}
      series={series.map((s) => ({ label: s.label, qr: s.qr }))}
      devices={devices.map((d) => ({ name: d.device ?? "bilinmiyor", value: d._count._all }))}
    />
  );
}
