import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { todayISO, addDaysISO, dateFromISO } from "./utils";

const LOCAL = Prisma.sql`(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Istanbul')`;

/** İstanbul gün başlangıcının UTC karşılığı */
export function istanbulDayStart(iso = todayISO()): Date {
  return new Date(`${iso}T00:00:00+03:00`);
}
export function istanbulMonthStart(): Date {
  return new Date(`${todayISO().slice(0, 7)}-01T00:00:00+03:00`);
}

type Bucket = "day" | "week" | "month";

/** Ziyaretçi (benzersiz oturum) ve görüntülenme serisi */
export async function trafficSeries(bucket: Bucket, count: number) {
  const unit = bucket === "day" ? "days" : bucket === "week" ? "weeks" : "months";
  const rows = await db.$queryRaw<{ b: Date; visitors: bigint; views: bigint; menu: bigint; qr: bigint }[]>`
    SELECT date_trunc(${bucket}, ${LOCAL}) AS b,
      COUNT(DISTINCT COALESCE("sessionId", id)) FILTER (WHERE type IN ('pageview','menu_view')) AS visitors,
      COUNT(*) FILTER (WHERE type = 'pageview') AS views,
      COUNT(*) FILTER (WHERE type = 'menu_view') AS menu,
      COUNT(*) FILTER (WHERE type = 'qr_scan') AS qr
    FROM analytics
    WHERE "createdAt" >= (date_trunc(${bucket}, now() AT TIME ZONE 'Europe/Istanbul') - (${count - 1} || ' ' || ${unit})::interval) AT TIME ZONE 'Europe/Istanbul'
    GROUP BY 1 ORDER BY 1`;
  // Boş günleri doldur
  const map = new Map(rows.map((r) => [new Date(r.b).toISOString().slice(0, bucket === "month" ? 7 : 10), r]));
  const out: { label: string; key: string; visitors: number; views: number; menu: number; qr: number }[] = [];
  const now = new Date(`${todayISO()}T00:00:00Z`);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    if (bucket === "day") d.setUTCDate(d.getUTCDate() - i);
    if (bucket === "week") {
      const dow = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - dow - i * 7);
    }
    if (bucket === "month") {
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - i);
    }
    const key = d.toISOString().slice(0, bucket === "month" ? 7 : 10);
    const r = map.get(key);
    const label =
      bucket === "month"
        ? d.toLocaleDateString("tr-TR", { month: "short", year: "2-digit", timeZone: "UTC" })
        : d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });
    out.push({ key, label, visitors: Number(r?.visitors ?? 0), views: Number(r?.views ?? 0), menu: Number(r?.menu ?? 0), qr: Number(r?.qr ?? 0) });
  }
  return out;
}

export async function visitorsSince(since: Date) {
  const r = await db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(DISTINCT COALESCE("sessionId", id)) AS n FROM analytics WHERE type IN ('pageview','menu_view') AND "createdAt" >= ${since}`;
  return Number(r[0]?.n ?? 0);
}

export async function topEntities(type: "product_view" | "category_view", since: Date, take = 8) {
  const rows = await db.analyticsEvent.groupBy({ by: ["entityId", "entityName"], where: { type, createdAt: { gte: since }, entityId: { not: null } }, _count: { _all: true }, orderBy: { _count: { entityId: "desc" } }, take });
  return rows.map((r) => ({ id: r.entityId!, name: r.entityName ?? "—", count: r._count._all }));
}

export async function breakdown(field: "device" | "source", since: Date) {
  const rows = await db.analyticsEvent.groupBy({ by: [field], where: { createdAt: { gte: since }, type: { in: ["pageview", "menu_view"] } }, _count: { _all: true } });
  return rows.map((r) => ({ name: (r[field] as string | null) ?? "bilinmiyor", value: r._count._all })).sort((a, b) => b.value - a.value);
}

export async function qrUsage(since: Date) {
  const rows = await db.qrScan.groupBy({ by: ["qrCodeId"], where: { createdAt: { gte: since } }, _count: { _all: true } });
  const codes = await db.qrCode.findMany({ select: { id: true, label: true, scanCount: true } });
  return codes
    .map((c) => ({ id: c.id, label: c.label, period: rows.find((r) => r.qrCodeId === c.id)?._count._all ?? 0, total: c.scanCount }))
    .sort((a, b) => b.period - a.period || b.total - a.total);
}

export async function orderedProducts(since: Date, take = 8) {
  const rows = await db.orderItem.groupBy({ by: ["productName"], where: { order: { createdAt: { gte: since }, status: { not: "cancelled" } } }, _sum: { quantity: true }, orderBy: { _sum: { quantity: "desc" } }, take });
  return rows.map((r) => ({ name: r.productName, count: r._sum.quantity ?? 0 }));
}

export async function conversion(since: Date) {
  const [visitors, reservations, events, orders, contacts] = await Promise.all([
    visitorsSince(since),
    db.reservation.count({ where: { createdAt: { gte: since } } }),
    db.eventRequest.count({ where: { createdAt: { gte: since } } }),
    db.order.count({ where: { createdAt: { gte: since } } }),
    db.contactMessage.count({ where: { createdAt: { gte: since } } }),
  ]);
  const rate = (n: number) => (visitors ? Math.round((n / visitors) * 1000) / 10 : 0);
  return { visitors, reservations, events, orders, contacts, reservationRate: rate(reservations), eventRate: rate(events) };
}

export { addDaysISO, dateFromISO };
