import "server-only";
import { db } from "./db";

/**
 * "Değişiklikleri sitede yayınla" — herkese açık sayfalar statik HTML'dir; içerik değişince
 * Cloudflare Workers Builds'te yeniden derleme (Deploy Hook) tetiklenir.
 * Yayınlanmamış değişiklik: son yayından sonra, siteyi etkileyen bir içerik kaydı (audit log) varsa.
 */
export const SITE_ENTITIES = [
  "product", "category", "allergen", "campaign", "event", "gallery", "gallery_category",
  "page", "review", "seo", "settings", "special_day", "table",
];

export type PublishState = { lastAt: string | null; by: string | null; pending: number; hookConfigured: boolean };

export async function getPublishState(): Promise<PublishState> {
  const row = await db.setting.findUnique({ where: { key: "publish" } });
  const v = (row?.value ?? {}) as { lastAt?: string; by?: string };
  const since = v.lastAt ? new Date(v.lastAt) : new Date(0);
  const pending = await db.auditLog.count({ where: { entity: { in: SITE_ENTITIES }, createdAt: { gt: since }, action: { not: "status" } } });
  return { lastAt: v.lastAt ?? null, by: v.by ?? null, pending, hookConfigured: !!process.env.DEPLOY_HOOK_URL };
}

export async function markPublished(by: string) {
  const value = { lastAt: new Date().toISOString(), by };
  await db.setting.upsert({ where: { key: "publish" }, update: { value }, create: { key: "publish", value } });
}
