"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser, hashPassword, validatePasswordStrength } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function changePassword(input: unknown) {
  const u = await requireUser();
  const p = z.object({ current: z.string().min(1).max(200), next: z.string().max(200) }).safeParse(input);
  if (!p.success) return { ok: false, error: "Alanları doldurun." };
  const err = validatePasswordStrength(p.data.next);
  if (err) return { ok: false, error: err };
  const user = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!(await bcrypt.compare(p.data.current, user.passwordHash))) return { ok: false, error: "Mevcut şifre hatalı." };
  await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(p.data.next) } });
  await audit(u.id, "update", "user", u.id, "Şifre değiştirildi");
  return { ok: true };
}
