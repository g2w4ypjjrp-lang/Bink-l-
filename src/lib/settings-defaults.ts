/** Varsayılan ayarlar — sunucu/istemci/Worker ortak (Next veya veritabanı bağımlılığı yok). */
export type WeeklyHour = { day: number; open: string; close: string; closed: boolean };

export const DEFAULT_SETTINGS = {
  business: {
    name: "BinKılıç Saklı Bahçe",
    shortName: "Saklı Bahçe",
    slogan: "Doğanın İçinde, Lezzetin Kalbinde",
    description:
      "Çatalca Binkılıç'ta ormanın kalbinde, aile sıcaklığıyla hazırlanan serpme kahvaltılar, ızgaralar ve unutulmaz organizasyonlar için saklı bir bahçe.",
    phone: "0538 505 34 59",
    whatsapp: "905385053459",
    email: "info@binkilicsaklibahce.com",
    address: "Binkılıç Saray Yolu, Binkılıç Atatürk Mahallesi, Saklı Bahçe Çıkmazı Sokak, 34540 Çatalca / İstanbul",
    streetAddress: "Binkılıç Atatürk Mah., Saklı Bahçe Çıkmazı Sk., Binkılıç Saray Yolu",
    locality: "Çatalca",
    region: "İstanbul",
    postalCode: "34540",
    mapsQuery: "BinKılıç Saklı Bahçe, Binkılıç, Çatalca, İstanbul",
    lat: "",
    lng: "",
    googleReviewsUrl: "",
    googleMapsUrl: "",
    logo: "",
    ogImage: "/uploads/venue/teras.webp",
    priceRange: "₺₺",
    servesCuisine: "Türk Mutfağı, Kahvaltı, Izgara",
  },
  social: { instagram: "https://www.instagram.com/binkilic_sakli_bahce/", facebook: "", tiktok: "", youtube: "", x: "" },
  hours: {
    weekly: [
      { day: 1, open: "09:00", close: "23:00", closed: false },
      { day: 2, open: "09:00", close: "23:00", closed: false },
      { day: 3, open: "09:00", close: "23:00", closed: false },
      { day: 4, open: "09:00", close: "23:00", closed: false },
      { day: 5, open: "09:00", close: "24:00", closed: false },
      { day: 6, open: "08:30", close: "24:00", closed: false },
      { day: 0, open: "08:30", close: "23:00", closed: false },
    ] as WeeklyHour[],
    note: "Kahvaltı servisimiz her gün 14:00'e kadardır.",
  },
  menu: {
    currency: "TRY",
    locales: ["tr", "en", "de"] as string[],
    defaultLocale: "tr",
    orderingEnabled: false,
    showPrices: true,
    taxRate: 10,
    pricesIncludeTax: true,
    footerNote: "Fiyatlarımıza KDV dahildir. Alerjen bilgisi için lütfen ekibimize danışın.",
  },
  reservation: {
    enabled: true,
    slotMinutes: 30,
    minGuests: 1,
    maxGuests: 30,
    maxDaysAhead: 60,
    minHoursAhead: 2,
    lastSeatingBeforeCloseMin: 90,
    maxGuestsPerSlot: 80,
    seatingOptions: ["Fark etmez", "Bahçe", "Çardak", "Kamelya", "Kapalı salon"] as string[],
    successMessage: "Rezervasyon talebiniz alındı. En kısa sürede sizi arayarak onaylayacağız.",
  },
  notifications: {
    adminEmail: "",
    emailOnReservation: true,
    emailOnEvent: true,
    emailOnMessage: true,
    customerEmails: true,
  },
  site: {
    whatsappFloating: true,
    announcement: "",
    announcementActive: false,
    language: "tr",
    maintenance: false,
    analyticsEnabled: true,
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingsKey = keyof Settings;

/** Veritabanındaki ayar satırlarını varsayılanlarla birleştirir. */
export function mergeSettings(rows: { key: string; value: unknown }[]): Settings {
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_SETTINGS) as SettingsKey[]) {
    const v = map[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...DEFAULT_SETTINGS[k], ...(v as object) } : DEFAULT_SETTINGS[k];
  }
  return out as Settings;
}
