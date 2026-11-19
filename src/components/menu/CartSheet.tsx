"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Loader2, Minus, Plus, Trash2, CheckCircle2 } from "lucide-react";
import type { MenuProduct } from "@/lib/menu";
import type { Dict } from "@/lib/i18n";
import { Sheet } from "./Sheet";
import { fmt, priceInfo } from "./shared";

export type CartItem = { productId: string; quantity: number; note: string };

export function CartSheet(props: {
  items: CartItem[]; setItems: (fn: (c: CartItem[]) => CartItem[]) => void; products: MenuProduct[]; t: Dict; L: (o: Record<string, string>) => string; locale: string; currency: string;
  table: { number: number; token: string }; onClose: () => void; onSent: (publicId: string) => void;
}) {
  const { t, L, locale, currency } = props;
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ id: string; number: number } | null>(null);
  const rows = props.items.map((i) => ({ ...i, p: props.products.find((x) => x.id === i.productId) })).filter((r) => r.p);
  const total = rows.reduce((a, r) => a + priceInfo(r.p!).current * r.quantity, 0);
  const update = (idx: number, delta: number) =>
    props.setItems((c) => c.map((x, i) => (i === idx ? { ...x, quantity: Math.max(0, Math.min(50, x.quantity + delta)) } : x)).filter((x) => x.quantity > 0));

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: props.table.number, token: props.table.token, note: note || null, customerName: name || null, items: props.items.map((i) => ({ productId: i.productId, quantity: i.quantity, note: i.note || null })) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Hata");
      setSent({ id: d.publicId, number: d.number });
      props.onSent(d.publicId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  }

  if (sent)
    return (
      <Sheet onClose={props.onClose} label={t.orderSent}>
        <div className="flex flex-col items-center px-6 pb-10 pt-14 text-center">
          <CheckCircle2 size={56} className="text-forest" />
          <h2 className="mt-5 font-display text-4xl text-forest">{t.orderSent}</h2>
          <p className="mt-2 text-sm text-charcoal/60">
            {t.orderNumber} #{sent.number} · {t.table} {props.table.number}
          </p>
          <Link href={`/menu/siparis/${sent.id}`} className="btn-primary mt-8 w-full">
            {t.orderStatus}
          </Link>
          <button onClick={props.onClose} className="mt-3 text-sm font-semibold text-forest">
            {t.backToMenu}
          </button>
        </div>
      </Sheet>
    );

  return (
    <Sheet
      onClose={props.onClose}
      label={t.yourOrder}
      footer={
        rows.length ? (
          <div>
            {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}
            <button onClick={send} disabled={busy} className="flex h-14 w-full items-center justify-between rounded-full bg-forest px-6 font-semibold text-cream disabled:opacity-60">
              <span className="flex items-center gap-2">
                {busy && <Loader2 size={16} className="animate-spin" />} {t.sendOrder}
              </span>
              <span>{fmt(total, currency, locale)}</span>
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="p-6 pt-8">
        <h2 className="font-display text-4xl text-forest">{t.yourOrder}</h2>
        <p className="text-sm text-charcoal/55">
          {t.table} {props.table.number}
        </p>
        {rows.length === 0 ? (
          <p className="py-16 text-center text-charcoal/60">{t.empty}</p>
        ) : (
          <ul className="mt-6 divide-y divide-beige">
            {rows.map((r, idx) => (
              <li key={`${r.productId}-${idx}`} className="flex gap-3 py-4">
                {r.p!.images[0] && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                    <Image src={r.p!.images[0].url} alt="" fill sizes="64px" className="object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{L(r.p!.name)}</p>
                  {r.note && <p className="text-xs text-charcoal/55">“{r.note}”</p>}
                  <p className="mt-1 text-sm text-forest">{fmt(priceInfo(r.p!).current * r.quantity, currency, locale)}</p>
                </div>
                <div className="flex items-center gap-1 self-center rounded-full border border-beige">
                  <button onClick={() => update(idx, -1)} className="flex h-10 w-9 items-center justify-center" aria-label={r.quantity === 1 ? t.remove : "-"}>
                    {r.quantity === 1 ? <Trash2 size={15} /> : <Minus size={15} />}
                  </button>
                  <span className="w-5 text-center text-sm font-semibold tabular-nums">{r.quantity}</span>
                  <button onClick={() => update(idx, 1)} className="flex h-10 w-9 items-center justify-center" aria-label="+">
                    <Plus size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && (
          <div className="mt-4 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t.yourName} className="h-12 w-full rounded-2xl border border-beige bg-cream/40 px-4 text-[15px] outline-none focus:border-forest" />
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t.orderNote} className="min-h-20 w-full rounded-2xl border border-beige bg-cream/40 px-4 py-3 text-[15px] outline-none focus:border-forest" />
          </div>
        )}
      </div>
    </Sheet>
  );
}
