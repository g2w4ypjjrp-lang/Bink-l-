/**
 * Hafif istek karşılayıcı — Next.js'e ve Prisma'ya HİÇ girmeden çalışır.
 *
 * Cloudflare ücretsiz planında istek başına 10 ms işlemci sınırı var. Next.js + Prisma her istekte
 * 10–200 ms harcadığı için ziyaretçinin tetiklediği dinamik uçlar burada, doğrudan Neon HTTP
 * sürücüsüyle (tek SQL isteği ≈ ağ beklemesi, işlemci harcamaz) karşılanır:
 *
 *   GET  /q/:kod                 QR yönlendirmesi (+ tarama kaydı)
 *   POST /api/track              ziyaret sayacı
 *   GET  /api/reservations/slots rezervasyon saatleri
 *   POST /api/reservations       rezervasyon formu
 *   POST /api/contact            iletişim formu
 *   POST /api/events             organizasyon başvurusu
 *   POST /api/orders             QR menüden sipariş
 *   GET  /api/orders/:id         sipariş durumu
 *   POST /api/waiter             hesap isteme
 *   GET  /menu/siparis/:id       statik sipariş sayfası kabuğu
 *   GET  /uploads/*              yayından sonra eklenen (henüz statik olmayan) görseller
 *
 * Herkese açık sayfalar ve yayınlanmış görseller zaten statik dosya olarak sunulur; buraya hiç gelmez.
 * Bunların dışındaki her şey (yönetim paneli vb.) null döner ve Next.js'e (OpenNext) bırakılır.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { mergeSettings, type Settings } from "../lib/settings-defaults";
import { reservationSlots, hoursForDate, type SpecialDayLite } from "../lib/hours";
import { reservationSchema, contactSchema, eventRequestSchema, orderSchema, zodErrors, EVENT_TYPES } from "../lib/validation";
import { todayISO, addDaysISO, istanbulNow, timeToMinutes, randomCode, formatDateTR, formatPrice } from "../lib/utils";

export type FastEnv = { DATABASE_URL: string; SESSION_SECRET?: string; ASSETS: { fetch: (req: Request | string) => Promise<Response> } };
type Sql = NeonQueryFunction<false, false>;

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });

const id = () => "c" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);

// ── koruma (Next sürümüyle aynı kurallar)
const buckets = new Map<string, { count: number; reset: number }>();
function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return b.count > limit ? { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) } : { ok: true, retryAfter: 0 };
}
const ipOf = (req: Request) => (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "0.0.0.0").slice(0, 64);
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin") || req.headers.get("referer");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}
function guard(req: Request, bucket: string, limit = 5, windowMs = 10 * 60_000) {
  if (!sameOrigin(req)) return json({ error: "Geçersiz istek kaynağı." }, 403);
  const rl = rateLimit(`${bucket}:${ipOf(req)}`, limit, windowMs);
  if (!rl.ok) return json({ error: `Çok fazla istek gönderdiniz. Lütfen ${Math.ceil(rl.retryAfter / 60)} dakika sonra tekrar deneyin.` }, 429, { "Retry-After": String(rl.retryAfter) });
  return null;
}
async function body(req: Request): Promise<unknown> {
  const t = await req.text();
  if (t.length > 64 * 1024) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
async function hashValue(v: string, secret = "") {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v + secret));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
const deviceFromUA = (ua: string) => (/ipad|tablet|(android(?!.*mobile))/i.test(ua) ? "tablet" : /mobi|iphone|android/i.test(ua) ? "mobile" : "desktop");
const isBot = (ua: string) => /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit/i.test(ua);
function classifySource(referrer?: string | null, host?: string | null, utm?: string | null) {
  if (utm) return utm.toLowerCase().slice(0, 40);
  if (!referrer) return "direct";
  try {
    const h = new URL(referrer).hostname;
    if (host && h === host.split(":")[0]) return "internal";
    if (/google\./.test(h)) return "google";
    if (/instagram\./.test(h)) return "instagram";
    if (/facebook\.|fb\./.test(h)) return "facebook";
    if (/bing\.|yandex\.|duckduckgo/.test(h)) return "search";
    if (/t\.co|twitter|x\.com/.test(h)) return "x";
    if (/tiktok/.test(h)) return "tiktok";
    if (/whatsapp|wa\.me/.test(h)) return "whatsapp";
    return "referral";
  } catch {
    return "direct";
  }
}

async function settings(sql: Sql): Promise<Settings> {
  return mergeSettings((await sql`select key, value from settings`) as { key: string; value: unknown }[]);
}
async function specialsFor(sql: Sql, iso: string): Promise<SpecialDayLite[]> {
  const rows = await sql`select date, type, title, closed, open, close from special_days where date = ${iso}::date`;
  return rows.map((r) => ({ ...(r as SpecialDayLite), date: new Date(r.date as string) }));
}
function trackSql(sql: Sql, type: string, d: { path?: string; entityId?: string | null; entityName?: string | null; sessionId?: string | null; ua?: string; source?: string; referrer?: string | null }) {
  if (d.ua && isBot(d.ua)) return null;
  return sql`insert into analytics (id, type, path, "entityId", "entityName", "sessionId", device, source, referrer)
    values (${id()}, ${type}, ${d.path?.slice(0, 300) ?? null}, ${d.entityId ?? null}, ${d.entityName?.slice(0, 160) ?? null}, ${d.sessionId?.slice(0, 64) ?? null},
            ${d.ua ? deviceFromUA(d.ua) : null}, ${d.source ?? null}, ${d.referrer?.slice(0, 300) ?? null})`;
}
const notifySql = (sql: Sql, type: string, title: string, bodyText?: string | null, link?: string | null) =>
  sql`insert into notifications (id, type, title, body, link) values (${id()}, ${type}, ${title}, ${bodyText ?? null}, ${link ?? null})`;
/** Cloudflare'de e-posta (SMTP) yok: Next sürümündeki gibi giden mesaj "skipped" olarak kaydedilir, panelden elle gönderilebilir. */
const outboundSql = (sql: Sql, to: string, text: string, subject: string, entity: string, entityId: string) =>
  sql`insert into outbound_messages (id, channel, "to", body, subject, entity, "entityId", status, error)
    values (${id()}, 'email', ${to}, ${text}, ${subject}, ${entity}, ${entityId}, 'skipped', 'Sağlayıcı yapılandırılmamış')`;
const run = async (qs: (Promise<unknown> | null | undefined)[]) => {
  await Promise.all(qs.filter(Boolean));
};

// ── uçlar
async function qr(req: Request, sql: Sql, env: FastEnv, code: string) {
  const base = new URL(req.url).origin;
  const [q] = await sql`select q.id, q.code, q.label, q.active, q."targetPath", t.number, t.active as "tableActive", t."orderToken"
    from qr_codes q left join tables t on t.id = q."tableId" where q.code = ${code.slice(0, 60)}`;
  if (!q || !q.active) return Response.redirect(`${base}/menu`, 302);
  const ua = req.headers.get("user-agent") || "";
  if (!isBot(ua)) {
    const ip = ipOf(req);
    await sql.transaction([
      sql`insert into qr_scans (id, "qrCodeId", device, "userAgent", "ipHash") values (${id()}, ${q.id}, ${deviceFromUA(ua)}, ${ua.slice(0, 300)}, ${ip ? await hashValue(ip, env.SESSION_SECRET) : null})`,
      sql`update qr_codes set "scanCount" = "scanCount" + 1, "lastScanAt" = now() where id = ${q.id}`,
      sql`insert into analytics (id, type, path, "entityId", "entityName", device, source) values (${id()}, 'qr_scan', ${`/q/${q.code}`}, ${q.id}, ${q.label}, ${deviceFromUA(ua)}, 'qr')`,
    ]);
  }
  const url = new URL((q.targetPath as string) || "/menu", base);
  if (q.number != null && q.tableActive) {
    url.searchParams.set("table", String(q.number));
    url.searchParams.set("t", q.orderToken as string);
  }
  url.searchParams.set("src", "qr");
  return Response.redirect(url.toString(), 302);
}

const TRACK_TYPES = new Set(["pageview", "menu_view", "product_view", "category_view"]);
async function track(req: Request, sql: Sql) {
  const none = new Response(null, { status: 204 });
  if (!sameOrigin(req) || !rateLimit(`track:${ipOf(req)}`, 120, 60_000).ok) return none;
  const d = (await body(req)) as Record<string, unknown> | null;
  if (!d || typeof d.type !== "string" || !TRACK_TYPES.has(d.type)) return none;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
  const s = await settings(sql);
  if (!s.site.analyticsEnabled) return none;
  const entityId = str(d.entityId, 40);
  await run([
    trackSql(sql, d.type, {
      path: str(d.path, 300), entityId, entityName: str(d.entityName, 160), sessionId: str(d.sid, 64), ua: req.headers.get("user-agent") || "",
      source: d.qr === true ? "qr" : classifySource(str(d.ref, 300), new URL(req.url).host, str(d.utm, 40)), referrer: str(d.ref, 300),
    }),
    d.type === "product_view" && entityId ? sql`update products set "viewCount" = "viewCount" + 1 where id = ${entityId}` : null,
  ]);
  return none;
}

async function slots(req: Request, sql: Sql) {
  const date = new URL(req.url).searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ slots: [] });
  const [s, specials, booked] = await Promise.all([
    settings(sql),
    specialsFor(sql, date),
    sql`select time, sum(guests)::int as guests from reservations where date = ${date}::date and status in ('pending','confirmed') group by time`,
  ]);
  let list = reservationSlots(date, s.hours.weekly, specials, s.reservation.slotMinutes, s.reservation.lastSeatingBeforeCloseMin);
  if (date === todayISO()) {
    const min = istanbulNow().minutes + s.reservation.minHoursAhead * 60;
    list = list.filter((t) => timeToMinutes(t) >= min);
  }
  const full = new Set(booked.filter((b) => (b.guests as number) >= s.reservation.maxGuestsPerSlot).map((b) => b.time as string));
  const h = hoursForDate(date, s.hours.weekly, specials);
  return json({ slots: list.map((t) => ({ time: t, available: !full.has(t) })), closed: h.closed, special: h.special ?? null });
}

const OCCASIONS: Record<string, string> = { none: "", birthday: "Doğum günü", celebration: "Kutlama", anniversary: "Yıl dönümü", proposal: "Evlilik teklifi", business: "İş yemeği", other: "Diğer" };
async function reservation(req: Request, sql: Sql) {
  const blocked = guard(req, "reservation", 5);
  if (blocked) return blocked;
  const parsed = reservationSchema.safeParse(await body(req));
  if (!parsed.success) return json({ error: "Lütfen formu kontrol edin.", fields: zodErrors(parsed.error) }, 422);
  const d = parsed.data;
  const s = await settings(sql);
  if (!s.reservation.enabled) return json({ error: "Online rezervasyon şu an kapalı. Lütfen bizi arayın." }, 400);
  if (d.guests < s.reservation.minGuests || d.guests > s.reservation.maxGuests)
    return json({ error: `Online rezervasyon ${s.reservation.minGuests}–${s.reservation.maxGuests} kişi arası yapılabilir. Daha kalabalık gruplar için bizi arayın.`, fields: { guests: "Kişi sayısı aralık dışında." } }, 422);
  const today = todayISO();
  if (d.date < today || d.date > addDaysISO(today, s.reservation.maxDaysAhead)) return json({ error: "Seçilen tarih için rezervasyon alınamıyor.", fields: { date: "Geçersiz tarih." } }, 422);
  const [specials, [agg], [dup]] = await Promise.all([
    specialsFor(sql, d.date),
    sql`select coalesce(sum(guests),0)::int as g from reservations where date = ${d.date}::date and time = ${d.time} and status in ('pending','confirmed')`,
    sql`select code from reservations where phone = ${d.phone} and date = ${d.date}::date and status in ('pending','confirmed') limit 1`,
  ]);
  const list = reservationSlots(d.date, s.hours.weekly, specials, s.reservation.slotMinutes, s.reservation.lastSeatingBeforeCloseMin);
  if (!list.includes(d.time)) return json({ error: "Seçilen saat uygun değil.", fields: { time: "Lütfen listeden bir saat seçin." } }, 422);
  if (d.date === today && timeToMinutes(d.time) < istanbulNow().minutes + s.reservation.minHoursAhead * 60)
    return json({ error: `Aynı gün rezervasyonları en az ${s.reservation.minHoursAhead} saat önceden yapılmalıdır.`, fields: { time: "Saat çok yakın." } }, 422);
  if ((agg.g as number) + d.guests > s.reservation.maxGuestsPerSlot) return json({ error: "Bu saat dilimi dolu. Lütfen farklı bir saat seçin.", fields: { time: "Bu saat dolu." } }, 409);
  if (dup) return json({ error: `Bu tarih için zaten bir rezervasyon talebiniz var (Kod: ${dup.code}).` }, 409);

  const rid = id();
  let code = "";
  for (let i = 0; i < 5 && !code; i++) {
    const c = randomCode(6);
    const rows = await sql`insert into reservations (id, code, name, phone, email, guests, children, date, time, seating, occasion, "specialRequest", description, "updatedAt")
      values (${rid}, ${c}, ${d.name}, ${d.phone}, ${d.email}, ${d.guests}, ${d.children}, ${d.date}::date, ${d.time}, ${d.seating ?? null}, ${d.occasion === "none" ? null : d.occasion},
              ${d.specialRequest ?? null}, ${d.description ?? null}, now()) on conflict (code) do nothing returning code`;
    if (rows.length) code = c;
  }
  if (!code) return json({ error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." }, 500);
  const occ = OCCASIONS[d.occasion] ? ` · ${OCCASIONS[d.occasion]}` : "";
  const base = new URL(req.url).origin;
  await run([
    notifySql(sql, "reservation", `Yeni rezervasyon: ${d.name}`, `${formatDateTR(d.date)} ${d.time} · ${d.guests} kişi${occ}`, `/admin/rezervasyonlar?id=${rid}`),
    s.notifications.adminEmail && s.notifications.emailOnReservation
      ? outboundSql(sql, s.notifications.adminEmail, `${d.name} (${d.phone}) ${formatDateTR(d.date)} ${d.time} için ${d.guests} kişilik rezervasyon talebi oluşturdu.${occ}\n\nPanel: ${base}/admin/rezervasyonlar`, "Yeni rezervasyon talebi", "reservation", rid)
      : null,
    d.email && s.notifications.customerEmails
      ? outboundSql(sql, d.email, `Sayın ${d.name},\n${formatDateTR(d.date)} ${d.time} için ${d.guests} kişilik rezervasyon talebinizi aldık. Rezervasyon kodunuz: ${code}\nEkibimiz en kısa sürede sizinle iletişime geçerek onaylayacaktır.\n\n${s.business.name}\n${s.business.phone}`, "Rezervasyon talebiniz alındı", "reservation", rid)
      : null,
    trackSql(sql, "reservation", { path: "/rezervasyon", entityId: rid, ua: req.headers.get("user-agent") || "" }),
  ]);
  return json({ ok: true, code, message: s.reservation.successMessage });
}

async function contact(req: Request, sql: Sql, env: FastEnv) {
  const blocked = guard(req, "contact", 5);
  if (blocked) return blocked;
  const parsed = contactSchema.safeParse(await body(req));
  if (!parsed.success) return json({ error: "Lütfen formu kontrol edin.", fields: zodErrors(parsed.error) }, 422);
  const d = parsed.data;
  const mid = id();
  const [s] = await Promise.all([
    settings(sql),
    sql`insert into contact_messages (id, name, phone, email, subject, message, ip) values (${mid}, ${d.name}, ${d.phone || null}, ${d.email}, ${d.subject}, ${d.message}, ${await hashValue(ipOf(req), env.SESSION_SECRET)})`,
  ]);
  await run([
    notifySql(sql, "message", `Yeni mesaj: ${d.name}`, d.subject || d.message.slice(0, 120), `/admin/mesajlar?id=${mid}`),
    s.notifications.adminEmail && s.notifications.emailOnMessage
      ? outboundSql(sql, s.notifications.adminEmail, `${d.name} (${d.phone || "-"} / ${d.email || "-"}) mesaj gönderdi:\n\n${d.message}`, `İletişim formu: ${d.subject || d.name}`, "contact", mid)
      : null,
    trackSql(sql, "contact", { path: "/iletisim", entityId: mid, ua: req.headers.get("user-agent") || "" }),
  ]);
  return json({ ok: true });
}

async function eventRequest(req: Request, sql: Sql) {
  const blocked = guard(req, "event", 4);
  if (blocked) return blocked;
  const parsed = eventRequestSchema.safeParse(await body(req));
  if (!parsed.success) return json({ error: "Lütfen formu kontrol edin.", fields: zodErrors(parsed.error) }, 422);
  const d = parsed.data;
  if (d.date && d.date < todayISO()) return json({ error: "Geçmiş bir tarih seçilemez.", fields: { date: "Geçersiz tarih." } }, 422);
  const [[ev], s] = await Promise.all([sql`select id, name from events where key = ${d.eventType}`, settings(sql)]);
  const typeLabel = (ev?.name as string) ?? EVENT_TYPES.find((t) => t.key === d.eventType)?.label ?? d.eventType;
  const rid = id();
  let code = "";
  for (let i = 0; i < 5 && !code; i++) {
    const c = "ORG-" + randomCode(5);
    const rows = await sql`insert into event_requests (id, code, "eventId", "eventType", name, phone, email, date, guests, budget, "specialRequest", description, "updatedAt")
      values (${rid}, ${c}, ${ev?.id ?? null}, ${typeLabel}, ${d.name}, ${d.phone}, ${d.email}, ${d.date ?? null}::date, ${d.guests ?? null}, ${d.budget ?? null},
              ${d.specialRequest ?? null}, ${d.description ?? null}, now()) on conflict (code) do nothing returning code`;
    if (rows.length) code = c;
  }
  if (!code) return json({ error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." }, 500);
  await run([
    notifySql(sql, "event", `Yeni organizasyon başvurusu: ${typeLabel}`, `${d.name}${d.date ? ` · ${formatDateTR(d.date)}` : ""}${d.guests ? ` · ${d.guests} kişi` : ""}`, `/admin/organizasyonlar?id=${rid}`),
    s.notifications.adminEmail && s.notifications.emailOnEvent
      ? outboundSql(sql, s.notifications.adminEmail, `${d.name} (${d.phone}) ${typeLabel} için başvuru yaptı.\nTarih: ${d.date ?? "-"} · Kişi: ${d.guests ?? "-"} · Bütçe: ${d.budget ?? "-"}\n\n${d.description ?? ""}`, "Yeni organizasyon başvurusu", "event_request", rid)
      : null,
    d.email && s.notifications.customerEmails
      ? outboundSql(sql, d.email, `Sayın ${d.name},\n${typeLabel} organizasyonu için başvurunuzu aldık (Başvuru no: ${code}). Ekibimiz en geç 24 saat içinde sizinle iletişime geçecek.\n\n${s.business.name}`, "Organizasyon başvurunuz alındı", "event_request", rid)
      : null,
    trackSql(sql, "event_request", { path: "/organizasyon", entityId: rid, entityName: typeLabel, ua: req.headers.get("user-agent") || "" }),
  ]);
  return json({ ok: true, code });
}

const num = (v: unknown) => (v == null ? 0 : Number(v));
async function order(req: Request, sql: Sql) {
  const blocked = guard(req, "order", 12, 10 * 60_000);
  if (blocked) return blocked;
  const s = await settings(sql);
  if (!s.menu.orderingEnabled) return json({ error: "QR sipariş şu an kapalı. Lütfen siparişinizi ekibimize iletin." }, 400);
  const parsed = orderSchema.safeParse(await body(req));
  if (!parsed.success) return json({ error: "Sipariş bilgileri geçersiz.", fields: zodErrors(parsed.error) }, 422);
  const d = parsed.data;
  const ids = [...new Set(d.items.map((i) => i.productId))];
  const [[table], products] = await Promise.all([
    sql`select id, number, active, "orderToken" from tables where number = ${d.table}`,
    sql`select id, name, price, "campaignPrice", "inStock" from products where id = any(${ids}) and active = true`,
  ]);
  if (!table || !table.active || table.orderToken !== d.token) return json({ error: "Masa doğrulanamadı. Lütfen masanızdaki QR kodu tekrar okutun." }, 403);
  const byId = new Map(products.map((p) => [p.id as string, p]));
  const unavailable = d.items.filter((i) => !byId.get(i.productId)?.inStock);
  if (unavailable.length) return json({ error: "Sepetinizdeki bazı ürünler şu an tükenmiş. Lütfen sepetinizi güncelleyin.", unavailable: unavailable.map((u) => u.productId) }, 409);
  const items = d.items.map((i) => {
    const p = byId.get(i.productId)!;
    const cp = num(p.campaignPrice);
    const price = cp > 0 && cp < num(p.price) ? cp : num(p.price);
    return { productId: p.id as string, productName: p.name as string, unitPrice: price, quantity: i.quantity, note: i.note ?? null, lineTotal: price * i.quantity };
  });
  const total = items.reduce((a, i) => a + i.lineTotal, 0);
  const rate = s.menu.taxRate / 100;
  const tax = s.menu.pricesIncludeTax ? total - total / (1 + rate) : total * rate;
  const grand = s.menu.pricesIncludeTax ? total : total + tax;
  const oid = id();
  const publicId = id();
  const results = await sql.transaction([
    sql`insert into orders (id, "publicId", "tableId", "tableNumber", note, "customerName", subtotal, "taxAmount", total, currency, "updatedAt")
      values (${oid}, ${publicId}, ${table.id}, ${table.number}, ${d.note ?? null}, ${d.customerName ?? null}, ${total.toFixed(2)}, ${tax.toFixed(2)}, ${grand.toFixed(2)}, ${s.menu.currency}, now())
      returning number`,
    ...items.map(
      (i) => sql`insert into order_items (id, "orderId", "productId", "productName", "unitPrice", quantity, note, "lineTotal")
        values (${id()}, ${oid}, ${i.productId}, ${i.productName}, ${i.unitPrice.toFixed(2)}, ${i.quantity}, ${i.note}, ${i.lineTotal.toFixed(2)})`
    ),
  ]);
  const number = (results[0] as { number: number }[])[0].number;
  await run([
    notifySql(sql, "order", `Yeni sipariş · Masa ${table.number}`, `#${number} · ${items.length} kalem · ${formatPrice(grand, s.menu.currency)}`, `/admin/siparisler?id=${oid}`),
    trackSql(sql, "order", { path: "/menu", entityId: oid, entityName: `Masa ${table.number}`, ua: req.headers.get("user-agent") || "", source: "qr" }),
  ]);
  return json({ ok: true, publicId, number });
}

async function orderStatus(sql: Sql, publicId: string) {
  const [o] = await sql`select id, number, status, "tableNumber", total, currency, note, "createdAt", "updatedAt" from orders where "publicId" = ${publicId.slice(0, 40)}`;
  if (!o) return json({ error: "Sipariş bulunamadı." }, 404);
  const items = await sql`select "productName", quantity, "unitPrice", "lineTotal", note from order_items where "orderId" = ${o.id}`;
  return json({
    number: o.number, status: o.status, tableNumber: o.tableNumber, total: num(o.total), currency: o.currency, note: o.note, createdAt: o.createdAt, updatedAt: o.updatedAt,
    items: items.map((i) => ({ name: i.productName, quantity: i.quantity, unitPrice: num(i.unitPrice), lineTotal: num(i.lineTotal), note: i.note })),
  });
}

async function waiter(req: Request, sql: Sql) {
  const blocked = guard(req, "waiter", 3, 5 * 60_000);
  if (blocked) return blocked;
  const s = await settings(sql);
  if (!s.menu.orderingEnabled) return json({ error: "Bu özellik şu an kapalı. Lütfen ekibimize doğrudan seslenin." }, 400);
  const d = (await body(req)) as { table?: unknown; token?: unknown; reason?: unknown } | null;
  const n = Number(d?.table);
  const token = typeof d?.token === "string" ? d.token : "";
  if (!Number.isInteger(n) || n < 1 || token.length < 10 || token.length > 60 || (d?.reason !== undefined && d.reason !== "bill")) return json({ error: "Geçersiz istek." }, 422);
  const [t] = await sql`select number, active, area, "orderToken" from tables where number = ${n}`;
  if (!t || !t.active || t.orderToken !== token) return json({ error: "Masa doğrulanamadı." }, 403);
  await notifySql(sql, "order", `Masa ${t.number} hesap istiyor`, (t.area as string) ?? null, "/admin/siparisler");
  return json({ ok: true });
}

const MIME: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", avif: "image/avif", mp4: "video/mp4", webm: "video/webm" };
/** Yayından sonra yüklenmiş, henüz statik olmayan görsel: veritabanından (base64 → yerel çözüm, hızlı) */
async function upload(sql: Sql, rel: string) {
  if (rel.includes("..") || rel.includes("\\")) return new Response("Not found", { status: 404 });
  const mime = MIME[rel.split(".").pop()?.toLowerCase() ?? ""];
  if (!mime) return new Response("Not found", { status: 404 });
  let [f] = await sql`select encode(data, 'base64') as b64 from files where path = ${rel}`;
  if (!f && rel.endsWith("_s.webp")) [f] = await sql`select encode(data, 'base64') as b64 from files where path = ${rel.replace(/_s\.webp$/, ".webp")}`;
  if (!f) return new Response("Not found", { status: 404 });
  const bytes = Buffer.from(f.b64 as string, "base64");
  return new Response(bytes, { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
}

/** Hafif yol eşleşirse yanıtı döndürür; eşleşmezse null (istek Next.js'e gider). */
export async function fast(req: Request, env: FastEnv): Promise<Response | null> {
  const { pathname } = new URL(req.url);
  const m = req.method;
  const sql = () => neon(env.DATABASE_URL);
  try {
    if (m === "GET" && pathname.startsWith("/q/")) return await qr(req, sql(), env, decodeURIComponent(pathname.slice(3)));
    if (m === "GET" && pathname.startsWith("/menu/siparis/")) {
      const r = await env.ASSETS.fetch(new Request(new URL("/menu/siparis", req.url)));
      return new Response(r.body, { status: r.ok ? 200 : r.status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
    }
    if (m === "GET" && pathname.startsWith("/uploads/")) return await upload(sql(), decodeURIComponent(pathname.slice(9)));
    if (!pathname.startsWith("/api/") || pathname.startsWith("/api/admin")) return null;
    if (m === "POST" && pathname === "/api/track") return await track(req, sql());
    if (m === "GET" && pathname === "/api/reservations/slots") return await slots(req, sql());
    if (m === "POST" && pathname === "/api/reservations") return await reservation(req, sql());
    if (m === "POST" && pathname === "/api/contact") return await contact(req, sql(), env);
    if (m === "POST" && pathname === "/api/events") return await eventRequest(req, sql());
    if (m === "POST" && pathname === "/api/orders") return await order(req, sql());
    if (m === "GET" && pathname.startsWith("/api/orders/")) return await orderStatus(sql(), decodeURIComponent(pathname.slice(12)));
    if (m === "POST" && pathname === "/api/waiter") return await waiter(req, sql());
    return null;
  } catch (e) {
    console.error("[fast]", pathname, e);
    return json({ error: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin." }, 500);
  }
}
