import { z } from "zod";
import { db } from "@/lib/db";
import { classifySource, track } from "@/lib/analytics";
import { rateLimit, clientIp, isSameOrigin } from "@/lib/security";
import { getSettings } from "@/lib/settings";

const schema = z.object({
  type: z.enum(["pageview", "menu_view", "product_view", "category_view"]),
  path: z.string().max(300).optional(),
  entityId: z.string().max(40).optional(),
  entityName: z.string().max(160).optional(),
  sid: z.string().max(64).optional(),
  ref: z.string().max(300).optional(),
  utm: z.string().max(40).optional(),
  qr: z.boolean().optional(),
});

/** Çerezsiz, birinci taraf analitik — sendBeacon ile çağrılır */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return new Response(null, { status: 204 });
  const ip = await clientIp();
  if (!rateLimit(`track:${ip}`, 120, 60_000).ok) return new Response(null, { status: 204 });
  const s = await getSettings();
  if (!s.site.analyticsEnabled) return new Response(null, { status: 204 });
  let body: unknown;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 204 });
  }
  const p = schema.safeParse(body);
  if (!p.success) return new Response(null, { status: 204 });
  const d = p.data;
  const host = req.headers.get("host");
  await track(d.type, {
    path: d.path, entityId: d.entityId, entityName: d.entityName, sessionId: d.sid, ua: req.headers.get("user-agent") || "",
    source: d.qr ? "qr" : classifySource(d.ref, host, d.utm), referrer: d.ref,
  });
  if (d.type === "product_view" && d.entityId) await db.product.update({ where: { id: d.entityId }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  return new Response(null, { status: 204 });
}
