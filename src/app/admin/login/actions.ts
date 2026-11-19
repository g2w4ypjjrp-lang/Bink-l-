"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { login, logout } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/security";

const schema = z.object({ email: z.string().email().max(160), password: z.string().min(1).max(200) });

export async function loginAction(_: unknown, fd: FormData): Promise<{ error?: string }> {
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 30, 10 * 60_000).ok) return { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." };
  const p = schema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) return { error: "E-posta ve şifrenizi girin." };
  const r = await login(p.data.email, p.data.password);
  if (!r.ok) return { error: r.error };
  const next = String(fd.get("next") || "/admin");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}
