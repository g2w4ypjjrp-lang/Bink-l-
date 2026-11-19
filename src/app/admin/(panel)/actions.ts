"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const prefSchema = z.object({ hidden: z.array(z.string().max(40)).max(40), order: z.array(z.string().max(40)).max(40) });

export async function saveDashboardPrefs(input: unknown) {
  const user = await requireUser();
  const p = prefSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Geçersiz tercih" };
  await db.user.update({ where: { id: user.id }, data: { preferences: { ...(user.preferences as object), dashboard: p.data } } });
  return { ok: true };
}
