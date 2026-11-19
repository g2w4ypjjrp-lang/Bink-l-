import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { isEmailConfigured } from "@/lib/notify";
import { dateFromISO, todayISO, addDaysISO } from "@/lib/utils";
import { SettingsAdmin } from "./SettingsAdmin";

export const metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  await requirePagePermission("settings.manage");
  const [s, specials] = await Promise.all([getSettings(), db.specialDay.findMany({ where: { date: { gte: dateFromISO(addDaysISO(todayISO(), -30)) } }, orderBy: { date: "asc" } })]);
  return <SettingsAdmin settings={s} smtp={isEmailConfigured()} specials={specials.map((x) => ({ id: x.id, date: x.date.toISOString().slice(0, 10), type: x.type, title: x.title, closed: x.closed, open: x.open ?? "", close: x.close ?? "" }))} />;
}
