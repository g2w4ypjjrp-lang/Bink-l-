import { db } from "@/lib/db";
import { guardPublic, json, readJson, withErrors } from "@/lib/api";
import { eventRequestSchema, zodErrors, EVENT_TYPES } from "@/lib/validation";
import { dateFromISO, randomCode, todayISO, formatDateTR } from "@/lib/utils";
import { notifyAdmin, sendMessage } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { track } from "@/lib/analytics";

export const POST = withErrors("api.events", async (req: Request) => {
  const blocked = await guardPublic(req, "event", 4);
  if (blocked) return blocked;
  const parsed = eventRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "Lütfen formu kontrol edin.", fields: zodErrors(parsed.error) }, 422);
  const d = parsed.data;
  if (d.date && d.date < todayISO()) return json({ error: "Geçmiş bir tarih seçilemez.", fields: { date: "Geçersiz tarih." } }, 422);
  const event = await db.event.findUnique({ where: { key: d.eventType } });
  const typeLabel = event?.name ?? EVENT_TYPES.find((t) => t.key === d.eventType)?.label ?? d.eventType;
  let code = "ORG-" + randomCode(5);
  while (await db.eventRequest.findUnique({ where: { code } })) code = "ORG-" + randomCode(5);
  const r = await db.eventRequest.create({
    data: { code, eventId: event?.id, eventType: typeLabel, name: d.name, phone: d.phone, email: d.email, date: d.date ? dateFromISO(d.date) : null, guests: d.guests ?? null, budget: d.budget, specialRequest: d.specialRequest, description: d.description },
  });
  await notifyAdmin("event", `Yeni organizasyon başvurusu: ${typeLabel}`, `${d.name}${d.date ? ` · ${formatDateTR(d.date)}` : ""}${d.guests ? ` · ${d.guests} kişi` : ""}`, `/admin/organizasyonlar?id=${r.id}`);
  const s = await getSettings();
  if (s.notifications.adminEmail && s.notifications.emailOnEvent)
    await sendMessage("email", s.notifications.adminEmail, `${d.name} (${d.phone}) ${typeLabel} için başvuru yaptı.\nTarih: ${d.date ?? "-"} · Kişi: ${d.guests ?? "-"} · Bütçe: ${d.budget ?? "-"}\n\n${d.description ?? ""}`, { subject: "Yeni organizasyon başvurusu", entity: "event_request", entityId: r.id });
  if (d.email && s.notifications.customerEmails)
    await sendMessage("email", d.email, `Sayın ${d.name},\n${typeLabel} organizasyonu için başvurunuzu aldık (Başvuru no: ${code}). Ekibimiz en geç 24 saat içinde sizinle iletişime geçecek.\n\n${s.business.name}`, { subject: "Organizasyon başvurunuz alındı", entity: "event_request", entityId: r.id });
  await track("event_request", { path: "/organizasyon", entityId: r.id, entityName: typeLabel, ua: req.headers.get("user-agent") || "" });
  return json({ ok: true, code });
});
