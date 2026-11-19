"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Errors = Record<string, string>;

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin." } };
  }
}

function Field({ label, name, error, children, className }: { label: string; name: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${name}-err`} className="mt-1.5 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Kvkk({ error }: { error?: string }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-charcoal/70">
        <input type="checkbox" name="kvkk" className="mt-1 h-4 w-4 shrink-0 accent-forest" required />
        <span>
          <Link href="/kvkk" target="_blank" className="font-semibold text-forest underline underline-offset-2">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni okudum; talebimin işlenmesi için bilgilerimin kullanılmasını onaylıyorum.
        </span>
      </label>
      {error && <p className="mt-1.5 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}

/** Bot tuzağı alanı (ekranda görünmez) */
const Honeypot = () => (
  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
    <label>
      Web sitesi <input type="text" name="website" tabIndex={-1} autoComplete="off" />
    </label>
  </div>
);

function Success({ title, text, onReset }: { title: string; text: string; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center py-10 text-center" role="status">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-forest text-cream">
        <Check size={30} />
      </span>
      <h3 className="mt-6 font-display text-3xl text-forest">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-charcoal/70">{text}</p>
      <button onClick={onReset} className="btn-ghost mt-8 text-forest">
        Yeni talep oluştur
      </button>
    </div>
  );
}

function formObject(form: HTMLFormElement) {
  const fd = new FormData(form);
  const o: Record<string, unknown> = {};
  fd.forEach((v, k) => (o[k] = v));
  o.kvkk = fd.get("kvkk") === "on";
  return o;
}

const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());

/* ─────────────── Rezervasyon ─────────────── */
export function ReservationForm({ seatingOptions, maxGuests, maxDaysAhead, compact = false }: { seatingOptions: string[]; maxGuests: number; maxDaysAhead: number; compact?: boolean }) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<{ time: string; available: boolean }[] | null>(null);
  const [closedInfo, setClosedInfo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string; message: string } | null>(null);
  const min = todayIso();
  const max = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + maxDaysAhead);
    return d.toISOString().slice(0, 10);
  }, [maxDaysAhead]);

  useEffect(() => {
    if (!date) return;
    setSlots(null);
    let alive = true;
    fetch(`/api/reservations/slots?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setSlots(d.slots || []);
        setClosedInfo(d.closed ? (d.special ? `Bu tarihte kapalıyız (${d.special}).` : "Bu tarihte kapalıyız.") : d.special ? `Özel gün: ${d.special}` : null);
      })
      .catch(() => alive && setSlots([]));
    return () => {
      alive = false;
    };
  }, [date]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    const body = formObject(e.currentTarget);
    const { ok, data } = await postJson("/api/reservations", body);
    setBusy(false);
    if (ok) setDone({ code: String(data.code), message: String(data.message) });
    else {
      setErrors((data.fields as Errors) || {});
      setMsg(String(data.error || "Bir hata oluştu."));
    }
  }

  if (done) return <Success title="Talebiniz alındı" text={`${done.message} Rezervasyon kodunuz: ${done.code}`} onReset={() => setDone(null)} />;

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5">
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Ad Soyad *" name="r-name" error={errors.name}>
          <input id="r-name" name="name" className="field" autoComplete="name" required maxLength={120} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Telefon *" name="r-phone" error={errors.phone}>
          <input id="r-phone" name="phone" type="tel" inputMode="tel" className="field" autoComplete="tel" placeholder="05XX XXX XX XX" required aria-invalid={!!errors.phone} />
        </Field>
        <Field label="E-posta" name="r-email" error={errors.email} className={compact ? "sm:col-span-2" : ""}>
          <input id="r-email" name="email" type="email" className="field" autoComplete="email" aria-invalid={!!errors.email} />
        </Field>
        <div className={cn("grid grid-cols-2 gap-5", compact && "sm:col-span-2")}>
          <Field label="Kişi *" name="r-guests" error={errors.guests}>
            <select id="r-guests" name="guests" className="field" defaultValue="2">
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Çocuk" name="r-children" error={errors.children}>
            <select id="r-children" name="children" className="field" defaultValue="0">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Tarih *" name="r-date" error={errors.date}>
          <input id="r-date" name="date" type="date" className="field" min={min} max={max} value={date} onChange={(e) => setDate(e.target.value)} required aria-invalid={!!errors.date} />
        </Field>
        <Field label="Saat *" name="r-time" error={errors.time}>
          <select id="r-time" name="time" className="field" required disabled={!date || !slots?.length} defaultValue="" aria-invalid={!!errors.time}>
            <option value="" disabled>
              {!date ? "Önce tarih seçin" : slots === null ? "Yükleniyor…" : slots.length ? "Saat seçin" : "Uygun saat yok"}
            </option>
            {slots?.map((s) => (
              <option key={s.time} value={s.time} disabled={!s.available}>
                {s.time}
                {!s.available ? " (dolu)" : ""}
              </option>
            ))}
          </select>
          {closedInfo && <p className="mt-1.5 text-xs text-gold-dark">{closedInfo}</p>}
        </Field>
        <Field label="Masa tercihi" name="r-seating">
          <select id="r-seating" name="seating" className="field" defaultValue={seatingOptions[0]}>
            {seatingOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field label="Özel gün / Kutlama" name="r-occasion">
          <select id="r-occasion" name="occasion" className="field" defaultValue="none">
            <option value="none">Yok</option>
            <option value="birthday">Doğum günü</option>
            <option value="celebration">Kutlama</option>
            <option value="anniversary">Yıl dönümü</option>
            <option value="proposal">Evlilik teklifi</option>
            <option value="business">İş yemeği</option>
            <option value="other">Diğer</option>
          </select>
        </Field>
      </div>
      <Field label="Özel istek" name="r-special" error={errors.specialRequest}>
        <input id="r-special" name="specialRequest" className="field" maxLength={1000} placeholder="Mama sandalyesi, alerji, pasta sürprizi…" />
      </Field>
      {!compact && (
        <Field label="Açıklama" name="r-desc" error={errors.description}>
          <textarea id="r-desc" name="description" className="field min-h-24" maxLength={1000} />
        </Field>
      )}
      <Kvkk error={errors.kvkk} />
      {msg && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {msg}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full !py-4 sm:w-auto">
        {busy && <Loader2 size={16} className="animate-spin" />} Rezervasyon talebi gönder
      </button>
    </form>
  );
}

/* ─────────────── Organizasyon ─────────────── */
export function EventForm({ types, budgets, initialType }: { types: { key: string; name: string }[]; budgets: string[]; initialType?: string }) {
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [type, setType] = useState(initialType || "");
  // Statik sayfa: ?tur= tarayıcıda okunur
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tur");
    if (t && types.some((x) => x.key === t)) setType(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const h = (e: Event) => setType((e as CustomEvent<string>).detail);
    window.addEventListener("select-event-type", h);
    return () => window.removeEventListener("select-event-type", h);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    const body = formObject(e.currentTarget);
    if (!body.guests) delete body.guests;
    const { ok, data } = await postJson("/api/events", body);
    setBusy(false);
    if (ok) setDone(String(data.code));
    else {
      setErrors((data.fields as Errors) || {});
      setMsg(String(data.error || "Bir hata oluştu."));
    }
  }
  if (done) return <Success title="Başvurunuz alındı" text={`Başvuru numaranız ${done}. Organizasyon ekibimiz en geç 24 saat içinde sizinle iletişime geçecek.`} onReset={() => setDone(null)} />;

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5">
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Ad Soyad *" name="e-name" error={errors.name}>
          <input id="e-name" name="name" className="field" autoComplete="name" required />
        </Field>
        <Field label="Telefon *" name="e-phone" error={errors.phone}>
          <input id="e-phone" name="phone" type="tel" inputMode="tel" className="field" autoComplete="tel" required />
        </Field>
        <Field label="E-posta" name="e-email" error={errors.email}>
          <input id="e-email" name="email" type="email" className="field" autoComplete="email" />
        </Field>
        <Field label="Organizasyon türü *" name="e-type" error={errors.eventType}>
          <select id="e-type" name="eventType" className="field" required value={type} onChange={(e) => setType(e.target.value)}>
            <option value="" disabled>
              Seçin
            </option>
            {types.map((t) => (
              <option key={t.key} value={t.key}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tarih" name="e-date" error={errors.date}>
          <input id="e-date" name="date" type="date" className="field" min={todayIso()} />
        </Field>
        <Field label="Tahmini kişi sayısı" name="e-guests" error={errors.guests}>
          <input id="e-guests" name="guests" type="number" min={1} max={2000} inputMode="numeric" className="field" />
        </Field>
        <Field label="Bütçe aralığı" name="e-budget" className="sm:col-span-2">
          <select id="e-budget" name="budget" className="field" defaultValue="">
            <option value="">Seçin</option>
            {budgets.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Özel istekler" name="e-special" error={errors.specialRequest}>
        <input id="e-special" name="specialRequest" className="field" placeholder="Süsleme, müzik, pasta, menü tercihi…" />
      </Field>
      <Field label="Açıklama" name="e-desc" error={errors.description}>
        <textarea id="e-desc" name="description" className="field min-h-28" placeholder="Hayalinizdeki organizasyonu kısaca anlatın" />
      </Field>
      <Kvkk error={errors.kvkk} />
      {msg && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {msg}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full !py-4 sm:w-auto">
        {busy && <Loader2 size={16} className="animate-spin" />} Başvuruyu gönder
      </button>
    </form>
  );
}

/* ─────────────── İletişim ─────────────── */
export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    const { ok, data } = await postJson("/api/contact", formObject(e.currentTarget));
    setBusy(false);
    if (ok) setDone(true);
    else {
      setErrors((data.fields as Errors) || {});
      setMsg(String(data.error || "Bir hata oluştu."));
    }
  }
  if (done) return <Success title="Mesajınız iletildi" text="Teşekkür ederiz. En kısa sürede size dönüş yapacağız." onReset={() => setDone(false)} />;
  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5">
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Adınız *" name="c-name" error={errors.name}>
          <input id="c-name" name="name" className="field" autoComplete="name" required />
        </Field>
        <Field label="Telefon" name="c-phone" error={errors.phone}>
          <input id="c-phone" name="phone" type="tel" inputMode="tel" className="field" autoComplete="tel" />
        </Field>
        <Field label="E-posta" name="c-email" error={errors.email}>
          <input id="c-email" name="email" type="email" className="field" autoComplete="email" />
        </Field>
        <Field label="Konu" name="c-subject" error={errors.subject}>
          <input id="c-subject" name="subject" className="field" />
        </Field>
      </div>
      <Field label="Mesajınız *" name="c-message" error={errors.message}>
        <textarea id="c-message" name="message" className="field min-h-36" required />
      </Field>
      <Kvkk error={errors.kvkk} />
      {msg && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {msg}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full !py-4 sm:w-auto">
        {busy && <Loader2 size={16} className="animate-spin" />} Mesajı gönder
      </button>
    </form>
  );
}
