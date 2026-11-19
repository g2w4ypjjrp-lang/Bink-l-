"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/security";
import { dateFromISO } from "@/lib/utils";

const refresh = () => { revalidatePath("/admin/yorumlar"); revalidatePath("/"); };

/** Yalnızca gerçek misafir yorumları elle (ör. Google'dan kopyalanarak, kaynak bağlantısıyla) eklenir. */
export async function saveReview(input: unknown) {
  return guarded("reviews.manage", async (u) => {
    const d = z.object({ id: z.string().optional(), authorName: z.string().trim().min(1).max(80), rating: z.coerce.number().int().min(1).max(5), body: z.string().trim().min(3).max(2000), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), photo: z.string().max(300), source: z.enum(["google", "manual"]), sourceUrl: z.string().url().max(500).optional().or(z.literal("")), featured: z.boolean(), visible: z.boolean() }).parse(input);
    const data = { authorName: sanitizeText(d.authorName, 80), rating: d.rating, body: sanitizeText(d.body, 2000), date: dateFromISO(d.date), photo: d.photo || null, source: d.source, sourceUrl: d.sourceUrl || null, featured: d.featured, visible: d.visible };
    const r = d.id ? await db.review.update({ where: { id: d.id }, data }) : await db.review.create({ data });
    await audit(u.id, d.id ? "update" : "create", "review", r.id, r.authorName);
    refresh();
  });
}
export async function patchReviews(ids: string[], patch: { featured?: boolean; visible?: boolean }) {
  return guarded("reviews.manage", async (u) => {
    await db.review.updateMany({ where: { id: { in: ids } }, data: patch });
    await audit(u.id, "update", "review", ids.join(","), JSON.stringify(patch));
    refresh();
  });
}
export async function deleteReviews(ids: string[]) {
  return guarded("reviews.manage", async (u) => {
    await db.review.deleteMany({ where: { id: { in: ids } } });
    await audit(u.id, "delete", "review", ids.join(","));
    refresh();
  });
}
