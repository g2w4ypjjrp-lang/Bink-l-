"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded, UserError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { sendMessage } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { sanitizeText } from "@/lib/security";
import { dateFromISO, randomCode } from "@/lib/utils";
import { customerMessage } from "@/lib/messages";
import { phoneSchema } from "@/lib/validation";

const STATUSES = ["pending", "confirmed", "rejected", "cancelled", "completed", "no_show"] as const;
const refresh = () => revalidatePath("/admin/rezervasyonlar");

export async function setReservationStatus(ids: string[], status: (typeof STATUSES)[number], notify = true) {
  return guarded("reservations.manage", async (u) => {
    z.enum(STATUSES).parse(status);
    const list = await db.reservation.findMany({ where: { id: { in: ids } } });
    await db.reservation.updateMany({ where: { id: { in: ids } }, data: { status } });
    const s = await getSettings();
    let emailed = 0;
    if (notify && s.notifications.customerEmails) {
      for (const r of list) {
        const msg = await customerMessage(r, status);
        if (msg && r.email) {
          await sendMessage("email", r.email, msg, { subject: status === "confirmed" ? "Rezervasyonunuz onaylandı" : "Rezervasyon bilgilendirmesi", entity: "reservation", entityId: r.id });
          emailed++;
        }
      }
    }
    await audit(u.id, "status", "reservation", ids.join(","), `Rezervasyon durumu: ${status}`);
    refresh();
    return { emailed };
  });
}

export async function addReservationNote(id: string, body: string) {
  return guarded("reservations.manage", async (u) => {
    const text = sanitizeText(z.string().min(1).max(2000).parse(body), 2000);
    await db.reservationNote.create({ data: { reservationId: id, body: text, userId: u.id } });
    await audit(u.id, "update", "reservation", id, "Not eklendi");
    refresh();
  });
}

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  email: z.string().trim().email().optional().or(z.literal("")),
  guests: z.coerce.number().int().min(1).max(500),
  children: z.coerce.number().int().min(0).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  seating: z.string().max(60).optional(),
  occasion: z.string().max(30).optional(),
  specialRequest: z.string().max(1000).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(STATUSES),
  source: z.enum(["web", "phone", "walk_in", "admin"]).default("admin"),
});

export async function saveReservation(input: unknown) {
  return guarded("reservations.manage", async (u) => {
    const d = schema.parse(input);
    const data = {
      name: sanitizeText(d.name, 120), phone: d.phone, email: d.email || null, guests: d.guests, children: d.children, date: dateFromISO(d.date), time: d.time,
      seating: d.seating ? sanitizeText(d.seating, 60) : null, occasion: d.occasion || null, specialRequest: d.specialRequest ? sanitizeText(d.specialRequest, 1000) : null,
      description: d.description ? sanitizeText(d.description, 1000) : null, status: d.status,
    };
    if (d.id) {
      await db.reservation.update({ where: { id: d.id }, data });
      await audit(u.id, "update", "reservation", d.id, d.name);
    } else {
      let code = randomCode(6);
      while (await db.reservation.findUnique({ where: { code } })) code = randomCode(6);
      const r = await db.reservation.create({ data: { ...data, code, source: d.source } });
      await audit(u.id, "create", "reservation", r.id, d.name);
    }
    refresh();
  });
}

export async function deleteReservations(ids: string[]) {
  return guarded("reservations.manage", async (u) => {
    if (!ids.length) throw new UserError("Seçim yok");
    await db.reservation.deleteMany({ where: { id: { in: ids } } });
    await audit(u.id, "delete", "reservation", ids.join(","));
    refresh();
  });
}
