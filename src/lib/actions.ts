import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { requirePermission, ForbiddenError, type SessionUser } from "./auth";
import { logError } from "./audit";
import type { PermissionKey } from "./permissions";
import { zodErrors } from "./validation";

export type ActionResult<T = unknown> = { ok: true; data?: T; message?: string } | { ok: false; error: string; fields?: Record<string, string> };

/** Tüm admin server action'ları bu sarmalayıcıdan geçer: yetki + hata yönetimi + loglama.
 *  CSRF: Next.js server action'ları Origin/Host eşleşmesini zorunlu kılar. */
export async function guarded<T>(perm: PermissionKey | PermissionKey[], fn: (user: SessionUser) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const user = await requirePermission(perm);
    const data = await fn(user);
    return { ok: true, data };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ForbiddenError) return { ok: false, error: e.message };
    if (e instanceof ZodError) return { ok: false, error: "Lütfen alanları kontrol edin.", fields: zodErrors(e) };
    if (e instanceof UserError) return { ok: false, error: e.message };
    const code = (e as { code?: string })?.code;
    if (code === "P2002") return { ok: false, error: "Bu değer zaten kullanılıyor (benzersiz olmalı)." };
    if (code === "P2003") return { ok: false, error: "Bu kayıt başka kayıtlarla ilişkili olduğu için silinemez." };
    await logError("admin.action", e);
    return { ok: false, error: "İşlem sırasında bir hata oluştu." };
  }
}

export class UserError extends Error {}
