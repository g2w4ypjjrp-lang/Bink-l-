import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { clientIp, clientUA } from "./security";
import { hasPermission, type PermissionKey } from "./permissions";

export const SESSION_COOKIE = "sb_session";
const SESSION_DAYS = 7;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 12);
}

export function validatePasswordStrength(pw: string): string | null {
  if (pw.length < 10) return "Şifre en az 10 karakter olmalı.";
  if (!/[a-zçğıöşü]/.test(pw) || !/[A-ZÇĞİÖŞÜ]/.test(pw) || !/\d/.test(pw)) return "Şifre büyük harf, küçük harf ve rakam içermeli.";
  return null;
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
  preferences: Record<string, unknown>;
};

/** Giriş — hesap kilitleme + giriş kaydı */
export async function login(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = await clientIp();
  const ua = await clientUA();
  const normalized = email.trim().toLowerCase();
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);

  const [failedByEmail, failedByIp] = await Promise.all([
    db.loginLog.count({ where: { email: normalized, success: false, createdAt: { gte: since } } }),
    db.loginLog.count({ where: { ip, success: false, createdAt: { gte: since } } }),
  ]);
  if (failedByEmail >= MAX_FAILED || failedByIp >= MAX_FAILED * 4) {
    await db.loginLog.create({ data: { email: normalized, success: false, reason: "locked", ip, userAgent: ua } });
    return { ok: false, error: `Çok fazla hatalı deneme. Lütfen ${LOCK_MINUTES} dakika sonra tekrar deneyin.` };
  }

  const user = await db.user.findUnique({ where: { email: normalized } });
  // Zamanlama saldırılarına karşı kullanıcı yoksa da hash karşılaştırması yap
  const valid = await bcrypt.compare(password, user?.passwordHash ?? "$2a$12$CwTycUXWue0Thq9StjUM0uJ8T8YQ0rG5Q8sX2bH3s6h1b8vY0r8uS");
  if (!user || !valid || !user.active) {
    await db.loginLog.create({ data: { email: normalized, success: false, reason: !user ? "unknown_user" : !user.active ? "inactive" : "bad_password", ip, userAgent: ua } });
    return { ok: false, error: "E-posta veya şifre hatalı." };
  }

  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.session.create({
      data: { tokenHash: sha256(token), userId: user.id, ip, userAgent: ua, expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5) },
    }),
    db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    db.loginLog.create({ data: { email: normalized, success: true, ip, userAgent: ua } }),
    db.auditLog.create({ data: { userId: user.id, action: "login", entity: "session", ip, summary: "Panele giriş yapıldı" } }),
  ]);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const s = await db.session.findUnique({ where: { tokenHash: sha256(token) } });
    if (s) {
      await db.session.delete({ where: { id: s.id } }).catch(() => {});
      await db.auditLog.create({ data: { userId: s.userId, action: "logout", entity: "session", summary: "Çıkış yapıldı" } });
    }
  }
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) return null;
  // Kayan oturum: son görülme 1 saatten eskiyse süreyi uzat
  if (Date.now() - session.lastSeenAt.getTime() > 3600_000) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5) } }).catch(() => {});
  }
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    roleKey: u.role.key,
    roleName: u.role.name,
    permissions: u.role.permissions.map((rp) => rp.permission.key),
    preferences: (u.preferences as Record<string, unknown>) ?? {},
  };
});

/** Sayfa/aksiyon koruması — yetkisizse login'e yönlendirir */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

export class ForbiddenError extends Error {
  constructor() {
    super("Bu işlem için yetkiniz yok.");
  }
}

export async function requirePermission(perm: PermissionKey | PermissionKey[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user.permissions, perm)) throw new ForbiddenError();
  return user;
}

/** Sayfa düzeyinde: yetkisizse panel ana sayfasına yönlendir */
export async function requirePagePermission(perm: PermissionKey | PermissionKey[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasPermission(user.permissions, perm)) redirect("/admin?denied=1");
  return user;
}

/** API route'ları için: kullanıcı yoksa null döner */
export async function apiUser(perm?: PermissionKey | PermissionKey[]): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (perm && !hasPermission(user.permissions, perm)) return null;
  return user;
}
