import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { UsersAdmin } from "./UsersAdmin";

export const metadata = { title: "Kullanıcılar" };

export default async function UsersPage() {
  const me = await requirePagePermission("users.manage");
  const [users, roles] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" }, include: { role: true, _count: { select: { sessions: true } } } }),
    db.role.findMany({ orderBy: { name: "asc" }, include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } } }),
  ]);
  return (
    <UsersAdmin
      meId={me.id}
      permissions={PERMISSIONS.map((p) => ({ ...p }))}
      users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, roleId: u.roleId, roleName: u.role.name, active: u.active, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, sessions: u._count.sessions }))}
      roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name, description: r.description ?? "", system: r.system, users: r._count.users, permissions: r.permissions.map((p) => p.permission.key) }))}
    />
  );
}
