/** İstemci + sunucuda aynı sonucu veren (hydration güvenli) tarih biçimlendirme — her zaman İstanbul saati */
const TZ = "Europe/Istanbul";
type D = Date | string | number;
const d = (v: D) => (v instanceof Date ? v : new Date(v));
export const fmtDT = (v: D, o: Intl.DateTimeFormatOptions = {}) => d(v).toLocaleString("tr-TR", { timeZone: TZ, ...o });
export const fmtD = (v: D, o: Intl.DateTimeFormatOptions = {}) => d(v).toLocaleDateString("tr-TR", { timeZone: TZ, ...o });
export const fmtT = (v: D, o: Intl.DateTimeFormatOptions = {}) => d(v).toLocaleTimeString("tr-TR", { timeZone: TZ, ...o });
export const istanbulHour = (v: D = new Date()) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d(v))) % 24;
