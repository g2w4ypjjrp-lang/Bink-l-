import { db } from "@/lib/db";
import { guardPublic, json, readJson, withErrors } from "@/lib/api";
import { reservationSchema, zodErrors } from "@/lib/validation";
import { getSettings } from "@/lib/settings";
import { reservationSlots } from "@/lib/hours";
import { dateFromISO, randomCode, todayISO, timeToMinutes, istanbulNow, addDaysISO, formatDateTR } from "@/lib/utils";
import { notifyAdmin, sendMessage } from "@/lib/notify";
import { track } from "@/lib/analytics";

const OCCASIONS: Record<string, string> = { none: "", birthday: "Doğum günü", celebration: "Kutlama", anniversary: "Yıl dönümü", proposal: "Evlilik teklifi", business: "İş yemeği", other: "Diğer" };

export const POST = withErrors("api.reservations", async (req: Request) => {
  const blocked = await guardPublic(req, "reservation", 5);
  if (blocked) return blocked;
  const parsed = reservationSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "Lütfen formu kontrol edin.", fields: zodErrors(parsed.error) }, 422);
  const d = parsed.data;
  const s = await getSettings();
  if (!s.reservation.enabled) return json({ error: "Online rezervasyon şu an kapalı. Lütfen bizi arayın." }, 400);
  if (d.guests < s.reservation.minGuests || d.guests > s.reservation.maxGuests)
    return json({ error: `Online rezervasyon ${s.reservation.minGuests}–${s.reservation.maxGuests} kişi arası yapılabilir. Daha kalabalık gruplar için bizi arayın.`, fields: { guests: "Kişi sayısı aralık dışında." } }, 422);

  const today = todayISO();
  if (d.date < today || d.date > addDaysISO(today, s.reservation.maxDaysAhead)) return json({ error: "Seçilen tarih için rezervasyon alınamıyor.", fields: { date: "Geçersiz tarih." } }, 422);

  const specials = await db.specialDay.findMany({ where: { date: dateFromISO(d.date) } });
  const slots = reservationSlots(d.date, s.hours.weekly, specials, s.reservation.slotMinutes, s.reservation.lastSeatingBeforeCloseMin);
  if (!slots.includes(d.time)) return json({ error: "Seçilen saat uygun değil.", fields: { time: "Lütfen listeden bir saat seçin." } }, 422);
  if (d.date === today && timeToMinutes(d.time) < istanbulNow().minutes + s.reservation.minHoursAhead * 60)
    return json({ error: `Aynı gün rezervasyonları en az ${s.reservation.minHoursAhead} saat önceden yapılmalıdır.`, fields: { time: "Saat çok yakın." } }, 422);

  // Kapasite kontrolü (aynı saat dilimi)
  const agg = await db.reservation.aggregate({ _sum: { guests: true }, where: { date: dateFromISO(d.date), time: d.time, status: { in: ["pending", "confirmed"] } } });
  if ((agg._sum.guests ?? 0) + d.guests > s.reservation.maxGuestsPerSlot)
    return json({ error: "Bu saat dilimi dolu. Lütfen farklı bir saat seçin.", fields: { time: "Bu saat dolu." } }, 409);

  // Aynı telefondan aynı güne mükerrer talep
  const dup = await db.reservation.findFirst({ where: { phone: d.phone, date: dateFromISO(d.date), status: { in: ["pending", "confirmed"] } } });
  if (dup) return json({ error: `Bu tarih için zaten bir rezervasyon talebiniz var (Kod: ${dup.code}).` }, 409);

  let code = randomCode(6);
  while (await db.reservation.findUnique({ where: { code } })) code = randomCode(6);

  const r = await db.reservation.create({
    data: {
      code, name: d.name, phone: d.phone, email: d.email, guests: d.guests, children: d.children, date: dateFromISO(d.date), time: d.time,
      seating: d.seating, occasion: d.occasion === "none" ? null : d.occasion, specialRequest: d.specialRequest, description: d.description,
    },
  });
  const occ = OCCASIONS[d.occasion] ? ` · ${OCCASIONS[d.occasion]}` : "";
  await notifyAdmin("reservation", `Yeni rezervasyon: ${d.name}`, `${formatDateTR(d.date)} ${d.time} · ${d.guests} kişi${occ}`, `/admin/rezervasyonlar?id=${r.id}`);
  if (s.notifications.adminEmail && s.notifications.emailOnReservation)
    await sendMessage("email", s.notifications.adminEmail, `${d.name} (${d.phone}) ${formatDateTR(d.date)} ${d.time} için ${d.guests} kişilik rezervasyon talebi oluşturdu.${occ}\n\nPanel: ${process.env.APP_URL}/admin/rezervasyonlar`, { subject: "Yeni rezervasyon talebi", entity: "reservation", entityId: r.id });
  if (d.email && s.notifications.customerEmails)
    await sendMessage("email", d.email, `Sayın ${d.name},\n${formatDateTR(d.date)} ${d.time} için ${d.guests} kişilik rezervasyon talebinizi aldık. Rezervasyon kodunuz: ${code}\nEkibimiz en kısa sürede sizinle iletişime geçerek onaylayacaktır.\n\n${s.business.name}\n${s.business.phone}`, { subject: "Rezervasyon talebiniz alındı", entity: "reservation", entityId: r.id });
  await track("reservation", { path: "/rezervasyon", entityId: r.id, ua: req.headers.get("user-agent") || "" });

  return json({ ok: true, code, message: s.reservation.successMessage });
});
