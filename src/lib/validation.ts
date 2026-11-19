import { z } from "zod";
import { sanitizeText } from "./security";

const clean = (max: number) => z.string().trim().max(max).transform((v) => sanitizeText(v, max));
const optClean = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? sanitizeText(v, max) : null));

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Geçerli bir telefon numarası girin.")
  .max(25)
  .regex(/^[+()\d\s-]+$/, "Telefon numarası yalnızca rakam içermeli.")
  .refine((v) => v.replace(/\D/g, "").length >= 10, "Geçerli bir telefon numarası girin.");

const emailOpt = z
  .string()
  .trim()
  .max(160)
  .optional()
  .nullable()
  .transform((v) => (v ? v.toLowerCase() : null))
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Geçerli bir e-posta adresi girin.");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih seçin.");
const hhmm = z.string().regex(/^([01]\d|2[0-4]):[0-5]\d$/, "Geçerli bir saat seçin.");

/** Bot tuzağı: bu alan doluysa istek reddedilir */
const honeypot = z.string().max(0, "spam").optional().or(z.literal(""));

export const reservationSchema = z.object({
  name: clean(120).pipe(z.string().min(2, "Ad soyad girin.")),
  phone: phoneSchema,
  email: emailOpt,
  guests: z.coerce.number().int().min(1).max(200),
  children: z.coerce.number().int().min(0).max(50).default(0),
  date: isoDate,
  time: hhmm,
  seating: optClean(60),
  occasion: z.enum(["none", "birthday", "celebration", "anniversary", "proposal", "business", "other"]).default("none"),
  specialRequest: optClean(1000),
  description: optClean(1000),
  kvkk: z.literal(true, { errorMap: () => ({ message: "Kişisel verilerin işlenmesine onay vermelisiniz." }) }),
  website: honeypot,
});

export const EVENT_TYPES = [
  { key: "birthday", label: "Doğum günü" },
  { key: "engagement", label: "Nişan" },
  { key: "promise", label: "Söz" },
  { key: "proposal", label: "Evlilik teklifi" },
  { key: "wedding", label: "Düğün" },
  { key: "henna", label: "Kına" },
  { key: "private", label: "Özel davet" },
  { key: "corporate", label: "Kurumsal etkinlik" },
  { key: "family", label: "Aile buluşması" },
  { key: "photoshoot", label: "Fotoğraf çekimi" },
  { key: "other", label: "Diğer" },
] as const;

export const BUDGETS = ["10.000 ₺ altı", "10.000 – 25.000 ₺", "25.000 – 50.000 ₺", "50.000 – 100.000 ₺", "100.000 ₺ üzeri", "Henüz belirlemedim"];

export const eventRequestSchema = z.object({
  name: clean(120).pipe(z.string().min(2, "Ad soyad girin.")),
  phone: phoneSchema,
  email: emailOpt,
  eventType: z.string().trim().min(1, "Organizasyon türü seçin.").max(60),
  date: isoDate.optional().nullable().or(z.literal("").transform(() => null)),
  guests: z.coerce.number().int().min(1).max(2000).optional().nullable(),
  budget: optClean(60),
  specialRequest: optClean(2000),
  description: optClean(2000),
  kvkk: z.literal(true, { errorMap: () => ({ message: "Kişisel verilerin işlenmesine onay vermelisiniz." }) }),
  website: honeypot,
});

export const contactSchema = z
  .object({
    name: clean(120).pipe(z.string().min(2, "Adınızı girin.")),
    phone: z.string().trim().max(25).optional().nullable().or(z.literal("")),
    email: emailOpt,
    subject: optClean(160),
    message: clean(4000).pipe(z.string().min(5, "Mesajınızı yazın.")),
    kvkk: z.literal(true, { errorMap: () => ({ message: "Kişisel verilerin işlenmesine onay vermelisiniz." }) }),
    website: honeypot,
  })
  .refine((v) => (v.phone && v.phone.replace(/\D/g, "").length >= 10) || v.email, { message: "Telefon veya e-posta adresinden en az birini girin.", path: ["phone"] });

export const orderSchema = z.object({
  table: z.coerce.number().int().min(1).max(10000),
  token: z.string().min(10).max(60),
  customerName: optClean(80),
  note: optClean(500),
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(50), note: optClean(200) }))
    .min(1, "Sepetiniz boş.")
    .max(60),
});

export function zodErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path.join(".") || "_";
    if (!out[k]) out[k] = i.message === "spam" ? "Geçersiz istek." : i.message;
  }
  return out;
}
