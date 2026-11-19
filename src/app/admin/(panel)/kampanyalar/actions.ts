"use server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { guarded } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/security";

const refresh = () => { revalidateTag("menu"); revalidatePath("/admin/kampanyalar"); revalidatePath("/kampanyalar"); revalidatePath("/"); };
const schema = z.object({
  id: z.string().optional(), title: z.string().trim().min(2).max(120), description: z.string().max(1000), image: z.string().max(300),
  startsAt: z.string().optional(), endsAt: z.string().optional(), price: z.union([z.number(), z.string()]).optional(), discountRate: z.union([z.number(), z.string()]).optional(),
  categoryId: z.string().optional().nullable(), active: z.boolean(), showOnHome: z.boolean(), showOnMenu: z.boolean(),
});
const num = (v: unknown) => (v === "" || v === undefined || v === null ? null : Number(v));

export async function saveCampaign(input: unknown) {
  return guarded("campaigns.manage", async (u) => {
    const d = schema.parse(input);
    const price = num(d.price);
    const rate = num(d.discountRate);
    if (rate !== null && (rate < 0 || rate > 100)) throw new Error("İndirim oranı 0-100 olmalı");
    const startsAt = d.startsAt ? new Date(`${d.startsAt}T00:00:00+03:00`) : null;
    const endsAt = d.endsAt ? new Date(`${d.endsAt}T23:59:59+03:00`) : null;
    if (startsAt && endsAt && endsAt < startsAt) throw new Error("Bitiş tarihi başlangıçtan önce olamaz");
    const data = { title: sanitizeText(d.title, 120), description: sanitizeText(d.description, 1000) || null, image: d.image || null, startsAt, endsAt, price: price === null ? null : new Prisma.Decimal(price), discountRate: rate === null ? null : Math.round(rate), categoryId: d.categoryId || null, active: d.active, showOnHome: d.showOnHome, showOnMenu: d.showOnMenu };
    const c = d.id ? await db.campaign.update({ where: { id: d.id }, data }) : await db.campaign.create({ data: { ...data, sortOrder: await db.campaign.count() } });
    await audit(u.id, d.id ? "update" : "create", "campaign", c.id, c.title);
    refresh();
  });
}
export async function toggleCampaigns(ids: string[], active: boolean) {
  return guarded("campaigns.manage", async (u) => {
    await db.campaign.updateMany({ where: { id: { in: ids } }, data: { active } });
    await audit(u.id, "update", "campaign", ids.join(","), active ? "aktif" : "pasif");
    refresh();
  });
}
export async function deleteCampaigns(ids: string[]) {
  return guarded("campaigns.manage", async (u) => {
    await db.campaign.deleteMany({ where: { id: { in: ids } } });
    await audit(u.id, "delete", "campaign", ids.join(","));
    refresh();
  });
}
