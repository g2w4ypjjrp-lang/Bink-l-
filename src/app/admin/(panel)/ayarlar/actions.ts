"use server";
import { z } from "zod";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { guarded, UserError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { saveSetting, DEFAULT_SETTINGS, type SettingsKey } from "@/lib/settings";
import { sanitizeText } from "@/lib/security";
import { dateFromISO } from "@/lib/utils";

const hhmm = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, "SS:DD formatında olmalı");
const url = z.string().max(500).refine((v) => !v || /^https:\/\//.test(v), "https:// ile başlamalı");

const schemas: Record<SettingsKey, z.ZodTypeAny> = {
  business: z.object({
    name: z.string().min(2).max(100), shortName: z.string().max(60), slogan: z.string().max(160), description: z.string().max(500), phone: z.string().min(7).max(30),
    whatsapp: z.string().regex(/^\d{10,15}$/, "WhatsApp numarası ülke koduyla, yalnız rakam (ör. 905321234567)"), email: z.string().email().max(160),
    address: z.string().max(300), streetAddress: z.string().max(200), locality: z.string().max(80), region: z.string().max(80), postalCode: z.string().max(10),
    mapsQuery: z.string().max(200), lat: z.string().max(20), lng: z.string().max(20), googleReviewsUrl: url, googleMapsUrl: url, logo: z.string().max(300), ogImage: z.string().max(300),
    priceRange: z.string().max(6), servesCuisine: z.string().max(200),
  }),
  social: z.object({ instagram: url, facebook: url, tiktok: url, youtube: url, x: url }),
  hours: z.object({ weekly: z.array(z.object({ day: z.number().int().min(0).max(6), open: hhmm, close: hhmm, closed: z.boolean() })).length(7), note: z.string().max(300) }),
  menu: z.object({ currency: z.enum(["TRY", "EUR", "USD"]), locales: z.array(z.enum(["tr", "en", "de"])).min(1), defaultLocale: z.enum(["tr", "en", "de"]), orderingEnabled: z.boolean(), showPrices: z.boolean(), taxRate: z.number().min(0).max(50), pricesIncludeTax: z.boolean(), footerNote: z.string().max(300) }),
  reservation: z.object({
    enabled: z.boolean(), slotMinutes: z.number().int().refine((v) => [15, 30, 60].includes(v)), minGuests: z.number().int().min(1), maxGuests: z.number().int().min(1).max(500), maxDaysAhead: z.number().int().min(1).max(365),
    minHoursAhead: z.number().min(0).max(72), lastSeatingBeforeCloseMin: z.number().int().min(0).max(300), maxGuestsPerSlot: z.number().int().min(1).max(5000), seatingOptions: z.array(z.string().max(40)).min(1).max(20), successMessage: z.string().max(300),
  }),
  notifications: z.object({ adminEmail: z.string().email().or(z.literal("")), emailOnReservation: z.boolean(), emailOnEvent: z.boolean(), emailOnMessage: z.boolean(), customerEmails: z.boolean() }),
  site: z.object({ whatsappFloating: z.boolean(), announcement: z.string().max(200), announcementActive: z.boolean(), language: z.string().max(5), maintenance: z.boolean(), analyticsEnabled: z.boolean() }),
};

function deepSanitize(v: unknown): unknown {
  if (typeof v === "string") return sanitizeText(v, 1000);
  if (Array.isArray(v)) return v.map(deepSanitize);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deepSanitize(x)]));
  return v;
}

export async function saveSettings(key: SettingsKey, value: unknown) {
  return guarded("settings.manage", async (u) => {
    if (!(key in DEFAULT_SETTINGS)) throw new UserError("Geçersiz ayar");
    const parsed = schemas[key].parse(deepSanitize(value));
    if (key === "menu" && !parsed.locales.includes(parsed.defaultLocale)) throw new UserError("Varsayılan dil, etkin diller arasında olmalı");
    await saveSetting(key, parsed);
    await audit(u.id, "update", "settings", key, `${key} ayarları güncellendi`);
    revalidatePath("/", "layout");
  });
}

export async function saveSpecialDay(input: unknown) {
  return guarded("settings.manage", async (u) => {
    const d = z.object({ id: z.string().optional(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), type: z.enum(["holiday", "special", "closure"]), title: z.string().trim().min(2).max(80), closed: z.boolean(), open: z.string().optional(), close: z.string().optional() }).parse(input);
    const data = { date: dateFromISO(d.date), type: d.type, title: sanitizeText(d.title, 80), closed: d.closed, open: d.closed ? null : d.open || null, close: d.closed ? null : d.close || null };
    if (d.id) await db.specialDay.update({ where: { id: d.id }, data });
    else await db.specialDay.upsert({ where: { date: data.date }, update: data, create: data });
    await audit(u.id, "update", "special_day", d.date, d.title);
    revalidateTag("hours");
    revalidatePath("/", "layout");
  });
}

export async function deleteSpecialDay(id: string) {
  return guarded("settings.manage", async (u) => {
    await db.specialDay.delete({ where: { id } });
    await audit(u.id, "delete", "special_day", id);
    revalidateTag("hours");
    revalidatePath("/", "layout");
  });
}
