"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChefHat, BellRing, UtensilsCrossed, XCircle } from "lucide-react";
import { getDict } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { fmt, readLS } from "./shared";

type O = { number: number; status: string; tableNumber: number | null; total: number; note: string | null; createdAt: string; items: { name: string; quantity: number; lineTotal: number; note: string | null }[] };
const STEPS = [
  { key: "new", icon: Check },
  { key: "preparing", icon: ChefHat },
  { key: "ready", icon: BellRing },
  { key: "delivered", icon: UtensilsCrossed },
];

export function OrderStatus({ publicId: pid, initial, currency }: { publicId?: string; initial?: O | null; currency: string }) {
  // Statik sayfa: sipariş kimliği adresten (/menu/siparis/<id>) tarayıcıda okunur
  const [publicId, setPublicId] = useState(pid ?? "");
  const [o, setO] = useState<O | null>(initial ?? null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (pid) return;
    const id = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "");
    if (!id || id === "siparis") return setMissing(true);
    setPublicId(id);
    fetch(`/api/orders/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d ? setO(d) : setMissing(true)))
      .catch(() => setMissing(true));
  }, [pid]);
  const [locale, setLocale] = useState("tr");
  const [back, setBack] = useState("/menu");
  useEffect(() => {
    setLocale(readLS("sb_locale", "tr"));
    setBack(readLS("sb_menu_url", "/menu"));
  }, []);
  const t = getDict(locale) as unknown as Record<string, string>;
  useEffect(() => {
    if (!o || !publicId || o.status === "delivered" || o.status === "cancelled") return;
    const i = setInterval(async () => {
      const r = await fetch(`/api/orders/${publicId}`).catch(() => null);
      if (r?.ok) setO(await r.json());
    }, 5000);
    return () => clearInterval(i);
  }, [publicId, o?.status]);
  if (missing)
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
        <p className="font-display text-3xl text-forest">Sipariş bulunamadı</p>
        <Link href={back} className="btn-primary mt-6">Menüye dön</Link>
      </main>
    );
  if (!o) return <main className="flex min-h-screen items-center justify-center text-sm text-charcoal/60">Yükleniyor…</main>;
  const idx = STEPS.findIndex((s) => s.key === o.status);
  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-16 pt-10">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-dark">
        {t.table} {o.tableNumber}
      </p>
      <h1 className="mt-2 font-display text-5xl text-forest">
        {t.orderNumber} #{o.number}
      </h1>
      {o.status === "cancelled" ? (
        <div className="mt-8 flex items-center gap-3 rounded-2xl bg-red-50 p-5 text-red-800">
          <XCircle /> {t.status_cancelled}
        </div>
      ) : (
        <ol className="mt-10 space-y-0" aria-label={t.orderStatus}>
          {STEPS.map((s, i) => (
            <li key={s.key} className="relative flex gap-4 pb-8 last:pb-0">
              {i < STEPS.length - 1 && <span className={cn("absolute left-[22px] top-12 h-[calc(100%-3rem)] w-0.5", i < idx ? "bg-forest" : "bg-beige")} />}
              <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition", i <= idx ? "bg-forest text-cream" : "bg-beige/60 text-charcoal/40", i === idx && "ring-4 ring-forest/15")}>
                <s.icon size={18} />
              </span>
              <span className={cn("pt-2.5 font-semibold", i <= idx ? "text-forest" : "text-charcoal/40")}>
                {t[`status_${s.key}`]}
                {i === idx && <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-gold" />}
              </span>
            </li>
          ))}
        </ol>
      )}
      <section className="mt-10 rounded-3xl bg-ivory p-5">
        <ul className="divide-y divide-beige">
          {o.items.map((i, k) => (
            <li key={k} className="flex justify-between gap-3 py-3 text-sm">
              <span>
                <b>{i.quantity}×</b> {i.name}
                {i.note && <span className="block text-xs text-charcoal/50">“{i.note}”</span>}
              </span>
              <span className="tabular-nums">{fmt(i.lineTotal, currency, locale)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-beige pt-3 font-semibold">
          <span>{t.total}</span>
          <span>{fmt(o.total, currency, locale)}</span>
        </p>
      </section>
      <Link href={back} className="btn-primary mt-8 w-full">
        {t.backToMenu}
      </Link>
    </main>
  );
}
