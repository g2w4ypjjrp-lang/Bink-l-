"use server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { guarded, UserError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { PAGES, type Field } from "@/lib/page-schema";
import { sanitizeText } from "@/lib/security";

function cleanValue(f: Field, v: unknown): unknown {
  if (f.type === "boolean") return !!v;
  if (f.type === "list") return Array.isArray(v) ? v.slice(0, 50).map((row) => Object.fromEntries((f.fields ?? []).map((sf) => [sf.key, cleanValue(sf, (row as Record<string, unknown>)?.[sf.key])]))) : [];
  const s = typeof v === "string" ? v : "";
  if (f.type === "image" || f.type === "video" || f.type === "url") return /^(\/|https:\/\/)/.test(s) || s === "" ? s.slice(0, 500) : "";
  return sanitizeText(s, f.type === "textarea" ? 6000 : 300);
}

export async function savePageContent(key: string, content: Record<string, Record<string, unknown>>) {
  return guarded("pages.manage", async (u) => {
    const def = PAGES.find((p) => p.key === key);
    if (!def) throw new UserError("Sayfa bulunamadı");
    const clean: Record<string, Record<string, unknown>> = {};
    for (const s of def.sections) {
      const src = content[s.key] ?? {};
      clean[s.key] = { visible: src.visible !== false, ...Object.fromEntries(s.fields.map((f) => [f.key, cleanValue(f, src[f.key])])) };
    }
    await db.page.upsert({ where: { key }, update: { content: clean as object }, create: { key, title: def.title, slug: def.slug, content: clean as object } });
    await audit(u.id, "update", "page", key, `${def.title} içeriği güncellendi`);
    revalidateTag("pages");
    revalidatePath(def.slug);
  });
}

export async function resetPageSection(key: string, section: string) {
  return guarded("pages.manage", async (u) => {
    const page = await db.page.findUnique({ where: { key } });
    const content = { ...((page?.content as Record<string, unknown>) ?? {}) };
    delete content[section];
    await db.page.update({ where: { key }, data: { content: content as object } });
    await audit(u.id, "update", "page", key, `${section} bölümü varsayılana döndü`);
    revalidateTag("pages");
  });
}

const seoSchema = z.object({
  key: z.string(), seoTitle: z.string().max(70), seoDescription: z.string().max(170), seoKeywords: z.string().max(300), ogImage: z.string().max(300),
  canonical: z.string().max(300).refine((v) => !v || /^(\/|https:\/\/)/.test(v), "Canonical '/' veya https:// ile başlamalı"), noindex: z.boolean(),
});
export async function saveSeo(input: unknown) {
  return guarded("seo.manage", async (u) => {
    const d = seoSchema.parse(input);
    const def = PAGES.find((p) => p.key === d.key);
    if (!def) throw new UserError("Sayfa bulunamadı");
    const data = { seoTitle: sanitizeText(d.seoTitle, 70) || null, seoDescription: sanitizeText(d.seoDescription, 170) || null, seoKeywords: sanitizeText(d.seoKeywords, 300) || null, ogImage: d.ogImage || null, canonical: d.canonical || null, noindex: d.noindex };
    await db.page.upsert({ where: { key: d.key }, update: data, create: { key: d.key, title: def.title, slug: def.slug, ...data } });
    await audit(u.id, "update", "seo", d.key, `${def.title} SEO güncellendi`);
    revalidateTag("pages");
    revalidatePath(def.slug);
  });
}
