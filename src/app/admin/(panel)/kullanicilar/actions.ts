"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded, UserError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { hashPassword, validatePasswordStrength } from "@/lib/auth";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { sanitizeText } from "@/lib/security";
import { slugify } from "@/lib/utils";

const refresh = () => revalidatePath("/admin/kullanicilar");

export async function saveUser(input: unknown) {
  return guarded("users.manage", async (u) => {
    const d = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email().max(160), roleId: z.string().min(1), active: z.boolean(), password: z.string().max(200).optional() }).parse(input);
    if (d.id === u.id && !d.active) throw new UserError("Kendi hesabınızı pasif yapamazsınız.");
    if (d.id === u.id) {
      const role = await db.role.findUnique({ where: { id: d.roleId } });
      if (role?.key !== "admin" && u.roleKey === "admin") throw new UserError("Kendi admin rolünüzü düşüremezsiniz.");
    }
    if (d.password) {
      const err = validatePasswordStrength(d.password);
      if (err) throw new UserError(err);
    } else if (!d.id) throw new UserError("Yeni kullanıcı için şifre belirleyin.");
    const data = { name: sanitizeText(d.name, 80), email: d.email, roleId: d.roleId, active: d.active, ...(d.password ? { passwordHash: await hashPassword(d.password) } : {}) };
    const user = d.id ? await db.user.update({ where: { id: d.id }, data }) : await db.user.create({ data: data as typeof data & { passwordHash: string } });
    if (d.id && d.id !== u.id && (!d.active || d.password)) await db.session.deleteMany({ where: { userId: d.id } });
    await audit(u.id, d.id ? "update" : "create", "user", user.id, `${user.email}${d.password ? " (şifre değişti)" : ""}`);
    refresh();
  });
}

export async function deleteUser(id: string) {
  return guarded("users.manage", async (u) => {
    if (id === u.id) throw new UserError("Kendi hesabınızı silemezsiniz.");
    const target = await db.user.findUniqueOrThrow({ where: { id }, include: { role: true } });
    if (target.role.key === "admin" && (await db.user.count({ where: { role: { key: "admin" }, active: true } })) <= 1) throw new UserError("Son admin silinemez.");
    await db.user.delete({ where: { id } });
    await audit(u.id, "delete", "user", id, target.email);
    refresh();
  });
}

export async function saveRole(input: unknown) {
  return guarded("users.manage", async (u) => {
    const d = z.object({ id: z.string().optional(), name: z.string().trim().min(2).max(60), description: z.string().max(200), permissions: z.array(z.enum(ALL_PERMISSION_KEYS as [string, ...string[]])) }).parse(input);
    const existing = d.id ? await db.role.findUnique({ where: { id: d.id } }) : null;
    if (existing?.key === "admin" && d.permissions.length !== ALL_PERMISSION_KEYS.length) throw new UserError("Admin rolü her zaman tüm yetkilere sahiptir.");
    const role = d.id
      ? await db.role.update({ where: { id: d.id }, data: { name: sanitizeText(d.name, 60), description: sanitizeText(d.description, 200) } })
      : await db.role.create({ data: { key: `${slugify(d.name)}-${Date.now().toString(36)}`, name: sanitizeText(d.name, 60), description: sanitizeText(d.description, 200) } });
    const perms = await db.permission.findMany({ where: { key: { in: d.permissions } } });
    await db.$transaction([db.rolePermission.deleteMany({ where: { roleId: role.id } }), db.rolePermission.createMany({ data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })) })]);
    await audit(u.id, d.id ? "update" : "create", "role", role.id, `${role.name}: ${d.permissions.length} yetki`);
    refresh();
  });
}

export async function deleteRole(id: string) {
  return guarded("users.manage", async (u) => {
    const r = await db.role.findUniqueOrThrow({ where: { id }, include: { _count: { select: { users: true } } } });
    if (r.system) throw new UserError("Sistem rolleri silinemez.");
    if (r._count.users) throw new UserError("Bu role atanmış kullanıcılar var.");
    await db.role.delete({ where: { id } });
    await audit(u.id, "delete", "role", id, r.name);
    refresh();
  });
}

export async function revokeSessions(userId: string) {
  return guarded("users.manage", async (u) => {
    const n = await db.session.deleteMany({ where: { userId } });
    await audit(u.id, "update", "user", userId, `${n.count} oturum sonlandırıldı`);
    refresh();
  });
}
