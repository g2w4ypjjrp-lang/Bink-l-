import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { reservationSlots, hoursForDate } from "@/lib/hours";
import { dateFromISO, todayISO, istanbulNow, timeToMinutes } from "@/lib/utils";

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ slots: [] });
  const s = await getSettings();
  const specials = await db.specialDay.findMany({ where: { date: dateFromISO(date) } });
  let slots = reservationSlots(date, s.hours.weekly, specials, s.reservation.slotMinutes, s.reservation.lastSeatingBeforeCloseMin);
  if (date === todayISO()) {
    const min = istanbulNow().minutes + s.reservation.minHoursAhead * 60;
    slots = slots.filter((t) => timeToMinutes(t) >= min);
  }
  const booked = await db.reservation.groupBy({ by: ["time"], _sum: { guests: true }, where: { date: dateFromISO(date), status: { in: ["pending", "confirmed"] } } });
  const full = new Set(booked.filter((b) => (b._sum.guests ?? 0) >= s.reservation.maxGuestsPerSlot).map((b) => b.time));
  const h = hoursForDate(date, s.hours.weekly, specials);
  return json({ slots: slots.map((t) => ({ time: t, available: !full.has(t) })), closed: h.closed, special: h.special ?? null }, { headers: { "Cache-Control": "no-store" } });
}
