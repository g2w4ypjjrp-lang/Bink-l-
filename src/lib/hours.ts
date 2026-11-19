import { istanbulNow, timeToMinutes, addDaysISO, dateFromISO } from "./utils";
import type { WeeklyHour } from "./settings";

export type SpecialDayLite = { date: Date; type: string; title: string; closed: boolean; open: string | null; close: string | null };

export const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export type DayHours = { closed: boolean; open: string; close: string; special?: string };

export function hoursForDate(iso: string, weekly: WeeklyHour[], specials: SpecialDayLite[]): DayHours {
  const sp = specials.find((s) => s.date.toISOString().slice(0, 10) === iso);
  const weekday = dateFromISO(iso).getUTCDay();
  const w = weekly.find((x) => x.day === weekday);
  if (sp) {
    if (sp.closed) return { closed: true, open: "", close: "", special: sp.title };
    return { closed: false, open: sp.open || w?.open || "09:00", close: sp.close || w?.close || "23:00", special: sp.title };
  }
  if (!w || w.closed) return { closed: true, open: "", close: "" };
  return { closed: false, open: w.open, close: w.close };
}

/** Kapanış "24:00" veya açılıştan küçükse gece yarısını geçen saat olarak değerlendirilir */
function closeMinutes(open: string, close: string) {
  const o = timeToMinutes(open);
  let c = timeToMinutes(close);
  if (c <= o) c += 24 * 60;
  return c;
}

export type OpenStatus = { open: boolean; label: string; detail: string };

export function computeOpenStatus(weekly: WeeklyHour[], specials: SpecialDayLite[], now = new Date()): OpenStatus {
  const { minutes, iso } = istanbulNow(now);
  const today = hoursForDate(iso, weekly, specials);
  // Dünün gece yarısını geçen vardiyası
  const yIso = addDaysISO(iso, -1);
  const y = hoursForDate(yIso, weekly, specials);
  if (!y.closed && closeMinutes(y.open, y.close) > 24 * 60 && minutes < closeMinutes(y.open, y.close) - 24 * 60) {
    return { open: true, label: "Şu an açık", detail: `Bugün ${y.close === "24:00" ? "00:00" : y.close}'a kadar açığız` };
  }
  if (!today.closed) {
    const o = timeToMinutes(today.open);
    const c = closeMinutes(today.open, today.close);
    if (minutes >= o && minutes < c) {
      return { open: true, label: "Şu an açık", detail: `Bugün ${today.close === "24:00" ? "00:00" : today.close}'a kadar açığız${today.special ? ` · ${today.special}` : ""}` };
    }
    if (minutes < o) return { open: false, label: "Şu an kapalı", detail: `Bugün ${today.open}'da açılıyoruz` };
  }
  // Sonraki açılış
  for (let i = 1; i <= 7; i++) {
    const d = addDaysISO(iso, i);
    const h = hoursForDate(d, weekly, specials);
    if (!h.closed) {
      const name = i === 1 ? "Yarın" : DAY_NAMES[dateFromISO(d).getUTCDay()];
      return { open: false, label: today.special && today.closed ? `Bugün kapalı · ${today.special}` : "Şu an kapalı", detail: `${name} ${h.open}'da açılıyoruz` };
    }
  }
  return { open: false, label: "Geçici olarak kapalı", detail: "Yeni çalışma saatlerimiz yakında duyurulacak" };
}

/** Rezervasyon için uygun saat dilimleri */
export function reservationSlots(iso: string, weekly: WeeklyHour[], specials: SpecialDayLite[], slotMinutes: number, lastSeatingBeforeCloseMin: number): string[] {
  const h = hoursForDate(iso, weekly, specials);
  if (h.closed) return [];
  const o = timeToMinutes(h.open);
  const c = closeMinutes(h.open, h.close) - lastSeatingBeforeCloseMin;
  const out: string[] = [];
  const start = Math.ceil(o / slotMinutes) * slotMinutes;
  for (let m = start; m <= c && m < 24 * 60; m += slotMinutes) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}
