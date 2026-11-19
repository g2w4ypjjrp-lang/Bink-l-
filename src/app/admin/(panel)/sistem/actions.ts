"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded } from "@/lib/actions";
import { audit } from "@/lib/audit";

export async function cleanup(kind: "sessions" | "errors" | "analytics" | "notifications") {
  return guarded("system.manage", async (u) => {
    z.enum(["sessions", "errors", "analytics", "notifications"]).parse(kind);
    let n = 0;
    if (kind === "sessions") n = (await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })).count;
    if (kind === "errors") n = (await db.errorLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 30 * 864e5) } } })).count;
    if (kind === "analytics") n = (await db.analyticsEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 730 * 864e5) } } })).count;
    if (kind === "notifications") n = (await db.notification.deleteMany({ where: { read: true, createdAt: { lt: new Date(Date.now() - 90 * 864e5) } } })).count;
    await audit(u.id, "delete", "system", kind, `${n} kayıt temizlendi`);
    revalidatePath("/admin/sistem");
    return n;
  });
}
