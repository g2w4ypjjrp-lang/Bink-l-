import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { dirSize } from "@/lib/storage";
import { isWorkers } from "@/lib/runtime";
import { isEmailConfigured } from "@/lib/notify";
import { SystemClient } from "./SystemClient";

export const metadata = { title: "Sistem & Güvenlik" };

export default async function SystemPage() {
  await requirePagePermission("system.manage");
  const t0 = Date.now();
  const [ver] = await db.$queryRaw<{ version: string }[]>`SELECT version()`;
  const dbMs = Date.now() - t0;
  const [size] = await db.$queryRaw<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`;
  const [logins, audits, errors, outbound, counts, uploads, failed24, sessions] = await Promise.all([
    db.loginLog.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 1000, include: { user: { select: { name: true, email: true } } } }),
    db.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    db.outboundMessage.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    Promise.all([db.reservation.count(), db.order.count(), db.product.count(), db.analyticsEvent.count(), db.galleryItem.count(), db.user.count()]),
    dirSize(),
    db.loginLog.count({ where: { success: false, createdAt: { gte: new Date(Date.now() - 864e5) } } }),
    db.session.count({ where: { expiresAt: { gt: new Date() } } }),
  ]);
  return (
    <SystemClient
      status={{
        db: { ok: true, ms: dbMs, version: ver.version.split(" ").slice(0, 2).join(" "), size: size.size },
        node: isWorkers ? "Cloudflare Workers" : process.version, uptime: isWorkers ? 0 : Math.round(process.uptime()), memory: isWorkers ? 0 : Math.round(process.memoryUsage().rss / 1048576), load: "-", env: process.env.NODE_ENV ?? "",
        uploads: { mb: Math.round(uploads.bytes / 1048576), files: uploads.files }, smtp: isEmailConfigured(), failed24, sessions,
        counts: { reservations: counts[0], orders: counts[1], products: counts[2], analytics: counts[3], gallery: counts[4], users: counts[5] },
      }}
      logins={logins.map((l) => ({ id: l.id, email: l.email, success: l.success, reason: l.reason ?? "", ip: l.ip ?? "", ua: l.userAgent ?? "", at: l.createdAt.toISOString() }))}
      audits={audits.map((a) => ({ id: a.id, user: a.user?.name ?? "Sistem", action: a.action, entity: a.entity, entityId: a.entityId ?? "", summary: a.summary ?? "", ip: a.ip ?? "", at: a.createdAt.toISOString() }))}
      errors={errors.map((e) => ({ id: e.id, source: e.source, message: e.message, path: e.path ?? "", stack: e.stack ?? "", at: e.createdAt.toISOString() }))}
      outbound={outbound.map((o) => ({ id: o.id, channel: o.channel, to: o.to, subject: o.subject ?? "", status: o.status, error: o.error ?? "", at: o.createdAt.toISOString() }))}
    />
  );
}
