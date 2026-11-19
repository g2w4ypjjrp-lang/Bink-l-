import { createHash } from "crypto";
import { headers } from "next/headers";

/** Basit, bellek içi sabit pencere rate limiter (tek sunucu). Çoklu sunucuda Redis ile değiştirilebilir. */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    }
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "0.0.0.0").slice(0, 64);
}

export async function clientUA(): Promise<string> {
  const h = await headers();
  return (h.get("user-agent") || "").slice(0, 300);
}

export function hashValue(v: string): string {
  return createHash("sha256").update(v + (process.env.SESSION_SECRET || "")).digest("hex").slice(0, 32);
}

/** CSRF koruması: değişiklik yapan isteklerde Origin/Referer, Host ile eşleşmeli. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") || req.headers.get("referer");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function deviceFromUA(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

export function isBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit/i.test(ua);
}

export { sanitizeText } from "./sanitize";
