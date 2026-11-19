import "server-only";
import { db } from "./db";
import { deviceFromUA, isBot } from "./security";

export type AnalyticsType = "pageview" | "menu_view" | "product_view" | "category_view" | "qr_scan" | "reservation" | "event_request" | "order" | "contact";

export function classifySource(referrer: string | null | undefined, host?: string | null, utm?: string | null): string {
  if (utm) return utm.toLowerCase().slice(0, 40);
  if (!referrer) return "direct";
  try {
    const h = new URL(referrer).hostname;
    if (host && h === host.split(":")[0]) return "internal";
    if (/google\./.test(h)) return "google";
    if (/instagram\./.test(h)) return "instagram";
    if (/facebook\.|fb\./.test(h)) return "facebook";
    if (/bing\.|yandex\.|duckduckgo/.test(h)) return "search";
    if (/t\.co|twitter|x\.com/.test(h)) return "x";
    if (/tiktok/.test(h)) return "tiktok";
    if (/whatsapp|wa\.me/.test(h)) return "whatsapp";
    return "referral";
  } catch {
    return "direct";
  }
}

export async function track(type: AnalyticsType, data: { path?: string; entityId?: string; entityName?: string; sessionId?: string; ua?: string; source?: string; referrer?: string }) {
  const ua = data.ua ?? "";
  if (ua && isBot(ua)) return;
  try {
    await db.analyticsEvent.create({
      data: {
        type,
        path: data.path?.slice(0, 300),
        entityId: data.entityId,
        entityName: data.entityName?.slice(0, 160),
        sessionId: data.sessionId?.slice(0, 64),
        device: ua ? deviceFromUA(ua) : null,
        source: data.source,
        referrer: data.referrer?.slice(0, 300),
      },
    });
  } catch (e) {
    console.error("track failed", e);
  }
}
