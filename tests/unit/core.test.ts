import { describe, it, expect } from "vitest";
import { slugify, normalizePhone, waLink, addDaysISO, timeToMinutes, formatPrice } from "../../src/lib/utils";
import { computeOpenStatus, reservationSlots, hoursForDate } from "../../src/lib/hours";
import { reservationSchema, contactSchema, orderSchema } from "../../src/lib/validation";
import { hasPermission, DEFAULT_ROLES, ALL_PERMISSION_KEYS } from "../../src/lib/permissions";
import { sanitizeText, deviceFromUA, isBot } from "../../src/lib/security";

const weekly = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "09:00", close: day === 5 ? "01:00" : "23:00", closed: day === 1 }));

describe("utils", () => {
  it("Türkçe karakterleri slug'a çevirir", () => expect(slugify("Şefin Özel Çorbası & Güveç")).toBe("sefin-ozel-corbasi-guvec"));
  it("telefonları normalize eder", () => {
    expect(normalizePhone("0532 111 22 33")).toBe("905321112233");
    expect(normalizePhone("+90 (532) 111-2233")).toBe("905321112233");
    expect(waLink("05321112233", "Merhaba")).toBe("https://wa.me/905321112233?text=Merhaba");
  });
  it("tarih/saat yardımcıları", () => {
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(timeToMinutes("19:30")).toBe(1170);
    expect(formatPrice(1450)).toContain("1.450");
  });
});

describe("çalışma saatleri", () => {
  it("pazartesi kapalı gün", () => expect(hoursForDate("2026-11-16", weekly, []).closed).toBe(true));
  it("özel gün kapanışı haftalık saati ezer", () => {
    const sp = [{ date: new Date("2026-11-18T00:00:00Z"), type: "closure", title: "Bakım", closed: true, open: null, close: null }];
    expect(hoursForDate("2026-11-18", weekly, sp)).toMatchObject({ closed: true, special: "Bakım" });
  });
  it("açık/kapalı durumunu İstanbul saatine göre hesaplar", () => {
    expect(computeOpenStatus(weekly, [], new Date("2026-11-18T12:00:00+03:00")).open).toBe(true);
    expect(computeOpenStatus(weekly, [], new Date("2026-11-18T23:30:00+03:00")).open).toBe(false);
    expect(computeOpenStatus(weekly, [], new Date("2026-11-18T07:00:00+03:00")).detail).toContain("09:00");
  });
  it("gece yarısını geçen cuma vardiyası cumartesi 00:30'da açık sayılır", () => {
    expect(computeOpenStatus(weekly, [], new Date("2026-11-21T00:30:00+03:00")).open).toBe(true);
  });
  it("rezervasyon saatleri kapanıştan önce kesilir", () => {
    const slots = reservationSlots("2026-11-18", weekly, [], 30, 90);
    expect(slots[0]).toBe("09:00");
    expect(slots.at(-1)).toBe("21:30");
    expect(reservationSlots("2026-11-16", weekly, [], 30, 90)).toEqual([]);
  });
});

describe("doğrulama", () => {
  const base = { name: "Ayşe Yılmaz", phone: "0532 111 22 33", guests: 2, date: "2026-12-01", time: "19:00", kvkk: true };
  it("geçerli rezervasyon", () => expect(reservationSchema.safeParse(base).success).toBe(true));
  it("KVKK onayı zorunlu", () => expect(reservationSchema.safeParse({ ...base, kvkk: false }).success).toBe(false));
  it("bot tuzağı dolu ise reddeder", () => expect(reservationSchema.safeParse({ ...base, website: "spam" }).success).toBe(false));
  it("HTML etiketlerini temizler (XSS)", () => {
    const r = reservationSchema.parse({ ...base, specialRequest: '<script>alert(1)</script>Pencere kenarı <b>lütfen</b>' });
    expect(r.specialRequest).toBe("alert(1)Pencere kenarı lütfen");
    expect(sanitizeText("<img src=x onerror=alert(1)>Merhaba")).toBe("Merhaba");
  });
  it("iletişimde telefon veya e-postadan biri zorunlu", () => {
    expect(contactSchema.safeParse({ name: "Ali", message: "Merhaba dünya", kvkk: true }).success).toBe(false);
    expect(contactSchema.safeParse({ name: "Ali", email: "a@b.co", message: "Merhaba dünya", kvkk: true }).success).toBe(true);
  });
  it("sipariş adetleri sınırlı", () => expect(orderSchema.safeParse({ table: 1, token: "x".repeat(20), items: [{ productId: "p", quantity: 999 }] }).success).toBe(false));
});

describe("yetkiler", () => {
  const staff = DEFAULT_ROLES.find((r) => r.key === "staff")!.permissions;
  const manager = DEFAULT_ROLES.find((r) => r.key === "manager")!.permissions;
  it("personel yalnızca rezervasyon ve sipariş", () => {
    expect(hasPermission(staff, "reservations.manage")).toBe(true);
    expect(hasPermission(staff, "orders.manage")).toBe(true);
    expect(hasPermission(staff, "menu.manage")).toBe(false);
    expect(hasPermission(staff, "users.manage")).toBe(false);
  });
  it("yönetici kullanıcı/sistem yönetemez", () => {
    expect(hasPermission(manager, "users.manage")).toBe(false);
    expect(hasPermission(manager, "system.manage")).toBe(false);
    expect(hasPermission(manager, "menu.manage")).toBe(true);
  });
  it("admin tüm yetkilere sahip", () => expect(DEFAULT_ROLES[0].permissions).toEqual(ALL_PERMISSION_KEYS));
});

describe("analitik yardımcıları", () => {
  it("cihaz ve bot tespiti", () => {
    expect(deviceFromUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("mobile");
    expect(deviceFromUA("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(isBot("Googlebot/2.1")).toBe(true);
  });
});
