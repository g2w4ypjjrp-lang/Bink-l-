import { db } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { PermissionKey } from "@/lib/permissions";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const ENTITIES: Record<string, { perm: PermissionKey; load: () => Promise<Record<string, unknown>[]> }> = {
  reservations: { perm: "reservations.view", load: () => db.reservation.findMany({ orderBy: { date: "desc" } }) },
  event_requests: { perm: "events.manage", load: () => db.eventRequest.findMany({ orderBy: { createdAt: "desc" } }) },
  orders: { perm: "orders.view", load: async () => (await db.order.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } })).map(({ items, ...o }) => ({ ...o, items: items.map((i) => `${i.quantity}x ${i.productName}`).join(" | ") })) },
  contact_messages: { perm: "messages.manage", load: () => db.contactMessage.findMany({ orderBy: { createdAt: "desc" } }) },
  products: { perm: "menu.manage", load: async () => (await db.product.findMany({ include: { category: true } })).map(({ category, ...p }) => ({ ...p, category: category.name })) },
  analytics: { perm: "analytics.view", load: () => db.analyticsEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100000 }) },
  qr_scans: { perm: "qr.manage", load: async () => (await db.qrScan.findMany({ orderBy: { createdAt: "desc" }, include: { qrCode: true }, take: 100000 })).map(({ qrCode, userAgent: _ua, ...s }) => ({ ...s, qr: qrCode.label })) },
  audit_logs: { perm: "system.manage", load: () => db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100000 }) },
  login_logs: { perm: "system.manage", load: () => db.loginLog.findMany({ orderBy: { createdAt: "desc" }, take: 100000 }) },
};

export async function GET(_req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const def = ENTITIES[entity];
  if (!def) return new Response("Bulunamadı", { status: 404 });
  const user = await apiUser([def.perm, "system.manage"]);
  if (!user) return new Response("Yetkisiz", { status: 401 });
  const rows = await def.load();
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const csv = "﻿" + cols.join(";") + "\n" + rows.map((r) => cols.map((c) => esc(r[c])).join(";")).join("\n");
  await audit(user.id, "export", entity, null, `${rows.length} kayıt dışa aktarıldı`);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${entity}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
