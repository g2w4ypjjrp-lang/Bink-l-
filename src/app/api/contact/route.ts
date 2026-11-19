import { db } from "@/lib/db";
import { guardPublic, json, readJson, withErrors } from "@/lib/api";
import { contactSchema, zodErrors } from "@/lib/validation";
import { notifyAdmin, sendMessage } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { clientIp, hashValue } from "@/lib/security";
import { track } from "@/lib/analytics";

export const POST = withErrors("api.contact", async (req: Request) => {
  const blocked = await guardPublic(req, "contact", 5);
  if (blocked) return blocked;
  const parsed = contactSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "Lütfen formu kontrol edin.", fields: zodErrors(parsed.error) }, 422);
  const d = parsed.data;
  const m = await db.contactMessage.create({ data: { name: d.name, phone: d.phone || null, email: d.email, subject: d.subject, message: d.message, ip: hashValue(await clientIp()) } });
  await notifyAdmin("message", `Yeni mesaj: ${d.name}`, d.subject || d.message.slice(0, 120), `/admin/mesajlar?id=${m.id}`);
  const s = await getSettings();
  if (s.notifications.adminEmail && s.notifications.emailOnMessage)
    await sendMessage("email", s.notifications.adminEmail, `${d.name} (${d.phone || "-"} / ${d.email || "-"}) mesaj gönderdi:\n\n${d.message}`, { subject: `İletişim formu: ${d.subject || d.name}`, entity: "contact", entityId: m.id });
  await track("contact", { path: "/iletisim", entityId: m.id, ua: req.headers.get("user-agent") || "" });
  return json({ ok: true });
});
