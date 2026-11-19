import { db } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { json } from "@/lib/api";
import { isSameOrigin } from "@/lib/security";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function allowedTypes(perms: string[]) {
  const t = ["system"];
  if (hasPermission(perms, ["reservations.view", "reservations.manage"])) t.push("reservation");
  if (hasPermission(perms, ["orders.view", "orders.manage"])) t.push("order");
  if (hasPermission(perms, "events.manage")) t.push("event");
  if (hasPermission(perms, "messages.manage")) t.push("message");
  return t;
}

export async function GET(req: Request) {
  const user = await apiUser();
  if (!user) return json({ error: "Yetkisiz." }, 401);
  const types = allowedTypes(user.permissions);
  const all = new URL(req.url).searchParams.get("all") === "1";
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where: { type: { in: types } }, orderBy: { createdAt: "desc" }, take: all ? 200 : 12 }),
    db.notification.count({ where: { type: { in: types }, read: false } }),
  ]);
  return json({ items, unread });
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ error: "Geçersiz istek." }, 403);
  const user = await apiUser();
  if (!user) return json({ error: "Yetkisiz." }, 401);
  const body = (await req.json().catch(() => ({}))) as { ids?: string[]; all?: boolean };
  const types = allowedTypes(user.permissions);
  if (body.all) await db.notification.updateMany({ where: { type: { in: types }, read: false }, data: { read: true } });
  else if (Array.isArray(body.ids)) await db.notification.updateMany({ where: { id: { in: body.ids.slice(0, 200) }, type: { in: types } }, data: { read: true } });
  return json({ ok: true });
}
