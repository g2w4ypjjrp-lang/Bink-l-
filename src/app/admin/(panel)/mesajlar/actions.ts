"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { sendMessage } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { sanitizeText } from "@/lib/security";

const refresh = () => revalidatePath("/admin/mesajlar");

export async function setMessageStatus(ids: string[], patch: { status?: "unread" | "read" | "replied"; archived?: boolean }) {
  return guarded("messages.manage", async (u) => {
    const p = z.object({ status: z.enum(["unread", "read", "replied"]).optional(), archived: z.boolean().optional() }).parse(patch);
    await db.contactMessage.updateMany({ where: { id: { in: ids } }, data: { ...p, repliedAt: p.status === "replied" ? new Date() : undefined } });
    await audit(u.id, "update", "contact_message", ids.join(","), JSON.stringify(p));
    refresh();
  });
}

export async function replyMessage(id: string, body: string) {
  return guarded("messages.manage", async (u) => {
    const text = sanitizeText(z.string().min(2).max(5000).parse(body), 5000);
    const m = await db.contactMessage.findUniqueOrThrow({ where: { id } });
    if (m.email) {
      const s = await getSettings();
      await sendMessage("email", m.email, `${text}\n\n— ${s.business.name}\n${s.business.phone}`, { subject: `Re: ${m.subject || "Mesajınız"}`, entity: "contact", entityId: id });
    }
    await db.contactMessage.update({ where: { id }, data: { status: "replied", repliedAt: new Date() } });
    await audit(u.id, "update", "contact_message", id, "Yanıtlandı");
    refresh();
  });
}

export async function deleteMessages(ids: string[]) {
  return guarded("messages.manage", async (u) => {
    await db.contactMessage.deleteMany({ where: { id: { in: ids } } });
    await audit(u.id, "delete", "contact_message", ids.join(","));
    refresh();
  });
}
