import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { getSettings } from "./settings";
import { computeOpenStatus, type SpecialDayLite } from "./hours";
import { dateFromISO, todayISO, addDaysISO } from "./utils";

export const getSpecialDays = unstable_cache(
  async (): Promise<SpecialDayLite[]> => {
    const rows = await db.specialDay.findMany({ where: { date: { gte: dateFromISO(addDaysISO(todayISO(), -1)) } }, orderBy: { date: "asc" }, take: 60 });
    return rows.map((r) => ({ date: r.date, type: r.type, title: r.title, closed: r.closed, open: r.open, close: r.close }));
  },
  ["special-days-v1"],
  { tags: ["hours"], revalidate: 3600 }
);

export async function getSiteData() {
  const [settings, specials] = await Promise.all([getSettings(), getSpecialDays()]);
  // unstable_cache Date'leri string olarak döndürebilir
  const sp = specials.map((s) => ({ ...s, date: new Date(s.date) }));
  return { settings, specials: sp, status: computeOpenStatus(settings.hours.weekly, sp) };
}
