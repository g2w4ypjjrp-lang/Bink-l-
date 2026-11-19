"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Settings, SettingsKey } from "@/lib/settings";
import { DAY_NAMES } from "@/lib/hours";
import { cn } from "@/lib/utils";
import { Button, F, inputCls, textareaCls, Toggle, ImageInput, Card, PageHeader, Tabs, Badge, Modal, useRun, useConfirm } from "@/components/admin/ui";
import { saveSettings, saveSpecialDay, deleteSpecialDay } from "./actions";

type Special = { id: string; date: string; type: string; title: string; closed: boolean; open: string; close: string };
const TYPES: Record<string, string> = { holiday: "Resmî tatil", special: "Özel gün", closure: "Geçici kapanış" };

export function SettingsAdmin({ settings, specials, smtp }: { settings: Settings; specials: Special[]; smtp: boolean }) {
  const [tab, setTab] = useState<SettingsKey>("business");
  const [s, setS] = useState(settings);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const { run, pending } = useRun();
  const set = <K extends SettingsKey>(k: K, field: keyof Settings[K], v: unknown) => setS((x) => ({ ...x, [k]: { ...x[k], [field]: v } }));
  const save = async (k: SettingsKey) => { setErrs({}); const r = await run(saveSettings(k, s[k]), "Ayarlar kaydedildi"); if (!r.ok && "fields" in r && r.fields) setErrs(r.fields); };
  const Txt = ({ k, f, label, hint, area }: { k: SettingsKey; f: string; label: string; hint?: string; area?: boolean }) => (
    <F label={label} hint={hint} error={errs[f]} className={area ? "sm:col-span-2" : ""}>
      {area ? <textarea className={textareaCls} value={String((s[k] as Record<string, unknown>)[f] ?? "")} onChange={(e) => set(k, f as never, e.target.value)} /> : <input className={inputCls} value={String((s[k] as Record<string, unknown>)[f] ?? "")} onChange={(e) => set(k, f as never, e.target.value)} />}
    </F>
  );
  const SaveBtn = ({ k }: { k: SettingsKey }) => <div className="mt-5"><Button loading={pending} onClick={() => save(k)}>Kaydet</Button></div>;
  const b = s.business;

  return (
    <div>
      <PageHeader title="Ayarlar" description="İşletme bilgileri, çalışma saatleri, menü, rezervasyon ve bildirim ayarları." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "business", label: "İşletme" }, { key: "hours", label: "Çalışma saatleri" }, { key: "social", label: "Sosyal medya" }, { key: "menu", label: "Menü & vergi" }, { key: "reservation", label: "Rezervasyon" }, { key: "notifications", label: "Bildirimler" }, { key: "site", label: "Site" }]} />

      {tab === "business" && (
        <Card title="İşletme bilgileri">
          <div className="grid gap-4 sm:grid-cols-2">
            {Txt({ k: "business", f: "name", label: "İşletme adı" })}
            {Txt({ k: "business", f: "slogan", label: "Slogan" })}
            {Txt({ k: "business", f: "phone", label: "Telefon", hint: "Sitede görünen numara" })}
            {Txt({ k: "business", f: "whatsapp", label: "WhatsApp numarası", hint: "Ülke koduyla, yalnız rakam: 905XXXXXXXXX" })}
            {Txt({ k: "business", f: "email", label: "E-posta" })}
            {Txt({ k: "business", f: "priceRange", label: "Fiyat aralığı (₺₺)" })}
            {Txt({ k: "business", f: "description", label: "Kısa tanıtım (footer & SEO)", area: true })}
            {Txt({ k: "business", f: "address", label: "Açık adres", area: true })}
            {Txt({ k: "business", f: "streetAddress", label: "Sokak adresi (schema)" })}
            {Txt({ k: "business", f: "locality", label: "İlçe" })}
            {Txt({ k: "business", f: "region", label: "İl" })}
            {Txt({ k: "business", f: "postalCode", label: "Posta kodu" })}
            {Txt({ k: "business", f: "mapsQuery", label: "Harita arama metni", hint: "Google Maps'te işletmeyi bulan metin" })}
            {Txt({ k: "business", f: "googleMapsUrl", label: "Google Maps işletme bağlantısı", hint: "Yol tarifi için doğrudan bağlantı (opsiyonel)" })}
            {Txt({ k: "business", f: "lat", label: "Enlem (lat)", hint: "Ör. 41.2934 — konum hassasiyeti için" })}
            {Txt({ k: "business", f: "lng", label: "Boylam (lng)" })}
            {Txt({ k: "business", f: "googleReviewsUrl", label: "Google yorumları bağlantısı" })}
            {Txt({ k: "business", f: "servesCuisine", label: "Mutfak türleri (virgülle)" })}
            <F label="Logo (boş = varsayılan yazı logosu)"><ImageInput value={b.logo} onChange={(v) => set("business", "logo", v)} aspect="aspect-[3/1]" /></F>
            <F label="Varsayılan paylaşım görseli (OG)"><ImageInput value={b.ogImage} onChange={(v) => set("business", "ogImage", v)} /></F>
          </div>
          <SaveBtn k="business" />
        </Card>
      )}

      {tab === "hours" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Haftalık çalışma saatleri">
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const w = s.hours.weekly.find((x) => x.day === day)!;
                const upd = (p: Partial<typeof w>) => setS((x) => ({ ...x, hours: { ...x.hours, weekly: x.hours.weekly.map((y) => (y.day === day ? { ...y, ...p } : y)) } }));
                return (
                  <div key={day} className="flex flex-wrap items-center gap-3 rounded-xl bg-cream/40 px-3 py-2">
                    <span className="w-24 text-sm font-semibold">{DAY_NAMES[day]}</span>
                    <Toggle checked={!w.closed} onChange={(v) => upd({ closed: !v })} label={w.closed ? "Kapalı" : "Açık"} />
                    {!w.closed && (
                      <span className="ml-auto flex items-center gap-2">
                        <input type="time" value={w.open} onChange={(e) => upd({ open: e.target.value })} className={cn(inputCls, "w-28")} aria-label={`${DAY_NAMES[day]} açılış`} />
                        –
                        <input type="time" value={w.close === "24:00" ? "00:00" : w.close} onChange={(e) => upd({ close: e.target.value === "00:00" ? "24:00" : e.target.value })} className={cn(inputCls, "w-28")} aria-label={`${DAY_NAMES[day]} kapanış`} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4"><F label="Saat notu (sitede görünür)"><input className={inputCls} value={s.hours.note} onChange={(e) => set("hours", "note", e.target.value)} /></F></div>
            <p className="mt-2 text-xs text-charcoal/50">Gece yarısını geçen kapanışlar (ör. 01:00) otomatik olarak ertesi güne sayılır. &quot;Şu an açık/kapalı&quot; durumu İstanbul saatine göre otomatik hesaplanır.</p>
            <SaveBtn k="hours" />
          </Card>
          <SpecialDays specials={specials} />
        </div>
      )}

      {tab === "social" && (
        <Card title="Sosyal medya hesapları">
          <div className="grid gap-4 sm:grid-cols-2">
            {(["instagram", "facebook", "tiktok", "youtube", "x"] as const).map((k) => <div key={k}>{Txt({ k: "social", f: k, label: k[0].toUpperCase() + k.slice(1), hint: "https://…" })}</div>)}
          </div>
          <SaveBtn k="social" />
        </Card>
      )}

      {tab === "menu" && (
        <Card title="Menü, para birimi ve vergi">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Para birimi"><select className={inputCls} value={s.menu.currency} onChange={(e) => set("menu", "currency", e.target.value)}><option value="TRY">Türk lirası (₺)</option><option value="EUR">Euro (€)</option><option value="USD">Dolar ($)</option></select></F>
            <F label="Varsayılan menü dili"><select className={inputCls} value={s.menu.defaultLocale} onChange={(e) => set("menu", "defaultLocale", e.target.value)}><option value="tr">Türkçe</option><option value="en">English</option><option value="de">Deutsch</option></select></F>
            <F label="Etkin menü dilleri">
              <div className="flex gap-3">{(["tr", "en", "de"] as const).map((l) => <label key={l} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-forest" checked={s.menu.locales.includes(l)} onChange={(e) => set("menu", "locales", e.target.checked ? [...s.menu.locales, l] : s.menu.locales.filter((x) => x !== l))} /> {l.toUpperCase()}</label>)}</div>
            </F>
            <F label="KDV oranı (%)"><input type="number" min={0} max={50} className={inputCls} value={s.menu.taxRate} onChange={(e) => set("menu", "taxRate", Number(e.target.value))} /></F>
            <Toggle checked={s.menu.pricesIncludeTax} onChange={(v) => set("menu", "pricesIncludeTax", v)} label="Fiyatlara KDV dahil" />
            <Toggle checked={s.menu.showPrices} onChange={(v) => set("menu", "showPrices", v)} label="Menüde fiyatları göster" />
            <Toggle checked={s.menu.orderingEnabled} onChange={(v) => set("menu", "orderingEnabled", v)} label="QR menüden sipariş al" />
            <F label="Menü alt notu" className="sm:col-span-2"><input className={inputCls} value={s.menu.footerNote} onChange={(e) => set("menu", "footerNote", e.target.value)} /></F>
          </div>
          <SaveBtn k="menu" />
        </Card>
      )}

      {tab === "reservation" && (
        <Card title="Rezervasyon kuralları">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3"><Toggle checked={s.reservation.enabled} onChange={(v) => set("reservation", "enabled", v)} label="Online rezervasyon açık" /></div>
            <F label="Saat aralığı"><select className={inputCls} value={s.reservation.slotMinutes} onChange={(e) => set("reservation", "slotMinutes", Number(e.target.value))}><option value={15}>15 dk</option><option value={30}>30 dk</option><option value={60}>60 dk</option></select></F>
            <F label="Min. kişi"><input type="number" className={inputCls} value={s.reservation.minGuests} onChange={(e) => set("reservation", "minGuests", Number(e.target.value))} /></F>
            <F label="Online maks. kişi"><input type="number" className={inputCls} value={s.reservation.maxGuests} onChange={(e) => set("reservation", "maxGuests", Number(e.target.value))} /></F>
            <F label="Kaç gün ileriye kadar"><input type="number" className={inputCls} value={s.reservation.maxDaysAhead} onChange={(e) => set("reservation", "maxDaysAhead", Number(e.target.value))} /></F>
            <F label="En az kaç saat önceden"><input type="number" className={inputCls} value={s.reservation.minHoursAhead} onChange={(e) => set("reservation", "minHoursAhead", Number(e.target.value))} /></F>
            <F label="Kapanıştan önce son kabul (dk)"><input type="number" className={inputCls} value={s.reservation.lastSeatingBeforeCloseMin} onChange={(e) => set("reservation", "lastSeatingBeforeCloseMin", Number(e.target.value))} /></F>
            <F label="Saat başına maks. misafir (kapasite)"><input type="number" className={inputCls} value={s.reservation.maxGuestsPerSlot} onChange={(e) => set("reservation", "maxGuestsPerSlot", Number(e.target.value))} /></F>
            <F label="Masa tercihleri (virgülle)" className="sm:col-span-2"><input className={inputCls} value={s.reservation.seatingOptions.join(", ")} onChange={(e) => set("reservation", "seatingOptions", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></F>
            <F label="Başarı mesajı" className="sm:col-span-3"><input className={inputCls} value={s.reservation.successMessage} onChange={(e) => set("reservation", "successMessage", e.target.value)} /></F>
          </div>
          <SaveBtn k="reservation" />
        </Card>
      )}

      {tab === "notifications" && (
        <Card title="Bildirimler">
          <div className="mb-4 flex items-center gap-2 text-sm">E-posta altyapısı (SMTP): {smtp ? <Badge tone="green">Yapılandırıldı</Badge> : <Badge tone="yellow">Yapılandırılmadı — sunucu ortam değişkenlerinden (SMTP_HOST…) ayarlanır</Badge>}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Bildirim e-postası (yönetici)" error={errs.adminEmail}><input className={inputCls} value={s.notifications.adminEmail} onChange={(e) => set("notifications", "adminEmail", e.target.value)} /></F>
            <div />
            <Toggle checked={s.notifications.emailOnReservation} onChange={(v) => set("notifications", "emailOnReservation", v)} label="Yeni rezervasyonda e-posta" />
            <Toggle checked={s.notifications.emailOnEvent} onChange={(v) => set("notifications", "emailOnEvent", v)} label="Yeni organizasyon başvurusunda e-posta" />
            <Toggle checked={s.notifications.emailOnMessage} onChange={(v) => set("notifications", "emailOnMessage", v)} label="Yeni mesajda e-posta" />
            <Toggle checked={s.notifications.customerEmails} onChange={(v) => set("notifications", "customerEmails", v)} label="Müşterilere otomatik e-posta (talep alındı / onay)" />
          </div>
          <p className="mt-4 text-xs text-charcoal/55">Panel içi bildirim merkezi her zaman aktiftir. SMS ve WhatsApp Business API sağlayıcıları (Netgsm, Twilio, Meta Cloud API) <code>src/lib/notify.ts</code> içindeki sağlayıcı arayüzüne eklenerek etkinleştirilir; o zamana kadar panelden tek tıkla hazır WhatsApp/SMS mesajı gönderilebilir.</p>
          <SaveBtn k="notifications" />
        </Card>
      )}

      {tab === "site" && (
        <Card title="Site ayarları">
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle checked={s.site.whatsappFloating} onChange={(v) => set("site", "whatsappFloating", v)} label="Sabit WhatsApp butonu" />
            <Toggle checked={s.site.analyticsEnabled} onChange={(v) => set("site", "analyticsEnabled", v)} label="Ziyaret istatistiklerini topla (çerezsiz)" />
            <Toggle checked={s.site.announcementActive} onChange={(v) => set("site", "announcementActive", v)} label="Duyuru şeridini göster" />
            <F label="Duyuru metni"><input className={inputCls} value={s.site.announcement} onChange={(e) => set("site", "announcement", e.target.value)} placeholder="Ör. Bayramda her gün açığız!" /></F>
          </div>
          <SaveBtn k="site" />
        </Card>
      )}
    </div>
  );
}

function SpecialDays({ specials }: { specials: Special[] }) {
  const [edit, setEdit] = useState<Special | null>(null);
  const { run, pending } = useRun();
  const confirm = useConfirm();
  return (
    <Card title="Özel günler, tatiller, geçici kapanış" actions={<Button size="sm" onClick={() => setEdit({ id: "", date: new Date().toISOString().slice(0, 10), type: "holiday", title: "", closed: true, open: "", close: "" })}><Plus size={14} /> Ekle</Button>}>
      <ul className="space-y-2">
        {specials.map((x) => (
          <li key={x.id} className="flex items-center gap-3 rounded-xl border border-charcoal/8 px-3 py-2 text-sm">
            <button className="flex-1 text-left" onClick={() => setEdit(x)}>
              <span className="font-semibold">{new Date(`${x.date}T00:00:00Z`).toLocaleDateString("tr-TR", { timeZone: "UTC", day: "numeric", month: "long", weekday: "short" })}</span> · {x.title}
              <span className="block text-xs text-charcoal/55">{TYPES[x.type]} · {x.closed ? "Kapalı" : `${x.open || "?"}–${x.close || "?"}`}</span>
            </button>
            <button onClick={async () => { if (await confirm({ title: "Silinsin mi?", danger: true })) run(deleteSpecialDay(x.id), "Silindi"); }} className="rounded p-1.5 hover:bg-cream" aria-label="Sil"><Trash2 size={14} /></button>
          </li>
        ))}
        {!specials.length && <li className="py-8 text-center text-sm text-charcoal/50">Kayıtlı özel gün yok.</li>}
      </ul>
      {edit && (
        <Modal title={edit.id ? "Özel günü düzenle" : "Özel gün ekle"} onClose={() => setEdit(null)} footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Vazgeç</Button><Button loading={pending} onClick={async () => { const r = await run(saveSpecialDay({ ...edit, id: edit.id || undefined }), "Kaydedildi"); if (r.ok) setEdit(null); }}>Kaydet</Button></>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Tarih"><input type="date" className={inputCls} value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></F>
            <F label="Tür"><select className={inputCls} value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
            <F label="Başlık" className="sm:col-span-2"><input className={inputCls} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="Ör. Kurban Bayramı 1. gün" /></F>
            <div className="sm:col-span-2"><Toggle checked={edit.closed} onChange={(v) => setEdit({ ...edit, closed: v })} label="Tüm gün kapalı" /></div>
            {!edit.closed && <><F label="Açılış"><input type="time" className={inputCls} value={edit.open} onChange={(e) => setEdit({ ...edit, open: e.target.value })} /></F><F label="Kapanış"><input type="time" className={inputCls} value={edit.close} onChange={(e) => setEdit({ ...edit, close: e.target.value })} /></F></>}
          </div>
        </Modal>
      )}
    </Card>
  );
}
