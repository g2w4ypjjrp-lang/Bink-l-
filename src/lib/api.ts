import "server-only";
import { NextResponse } from "next/server";
import { logError } from "./audit";
import { isSameOrigin, rateLimit, clientIp } from "./security";

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

/** Public form endpoint'leri için ortak koruma: aynı köken + IP başına hız sınırı */
export async function guardPublic(req: Request, bucket: string, limit = 5, windowMs = 10 * 60_000) {
  if (!isSameOrigin(req)) return json({ error: "Geçersiz istek kaynağı." }, 403);
  const ip = await clientIp();
  const rl = rateLimit(`${bucket}:${ip}`, limit, windowMs);
  if (!rl.ok) return json({ error: `Çok fazla istek gönderdiniz. Lütfen ${Math.ceil(rl.retryAfter / 60)} dakika sonra tekrar deneyin.` }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  return null;
}

export function withErrors<T extends unknown[]>(source: string, fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      const req = args[0] as Request | undefined;
      await logError(source, e, req?.url ? new URL(req.url).pathname : undefined);
      return json({ error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." }, 500);
    }
  };
}

export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("Payload too large");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
