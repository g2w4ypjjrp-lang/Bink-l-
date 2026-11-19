"use client";
import Image from "next/image";
import { useState } from "react";
import { Heart, Minus, Plus, Timer, Scale, Zap } from "lucide-react";
import type { MenuProduct, MenuAllergen } from "@/lib/menu";
import type { Dict } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Sheet } from "./Sheet";
import { DietIcons, Price, Tags, fmt, priceInfo } from "./shared";

export function ProductSheet(props: {
  p: MenuProduct; t: Dict; locale: string; L: (o: Record<string, string>) => string; currency: string; showPrices: boolean; allergens: MenuAllergen[];
  canOrder: boolean; isFav: boolean; onFav: () => void; onClose: () => void; onAdd: (qty: number, note: string) => void;
}) {
  const { p, t, L, locale } = props;
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [slide, setSlide] = useState(0);
  const allergens = props.allergens.filter((a) => p.allergens.includes(a.key));
  const facts = [
    p.portion && { icon: Scale, label: t.portion, value: p.portion },
    p.calories && { icon: Zap, label: t.calories, value: `${p.calories} kcal` },
    p.prepMinutes && { icon: Timer, label: t.prepTime, value: `${p.prepMinutes} ${t.minutes}` },
  ].filter(Boolean) as { icon: typeof Scale; label: string; value: string }[];

  return (
    <Sheet
      onClose={props.onClose}
      label={L(p.name)}
      footer={
        props.canOrder && p.inStock ? (
          <div className="flex items-center gap-3">
            <div className="flex h-14 items-center rounded-full border border-beige">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-14 w-12 items-center justify-center" aria-label="-">
                <Minus size={16} />
              </button>
              <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(50, q + 1))} className="flex h-14 w-12 items-center justify-center" aria-label="+">
                <Plus size={16} />
              </button>
            </div>
            <button onClick={() => props.onAdd(qty, note.trim())} className="flex h-14 flex-1 items-center justify-between rounded-full bg-forest px-5 font-semibold text-cream">
              {t.addToCart} <span>{fmt(priceInfo(p).current * qty, props.currency, locale)}</span>
            </button>
          </div>
        ) : !p.inStock ? (
          <p className="text-center text-sm font-semibold text-charcoal/60">{t.unavailable}</p>
        ) : undefined
      }
    >
      {p.images.length > 0 ? (
        <div className="relative">
          <div
            className="no-scrollbar flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto"
            onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          >
            {p.images.map((img, i) => (
              <div key={img.url} className="relative h-full w-full shrink-0 snap-center">
                <Image src={img.url} alt={img.alt || L(p.name)} fill sizes="(max-width:640px) 100vw, 512px" className="object-cover" priority={i === 0} />
              </div>
            ))}
          </div>
          {p.images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {p.images.map((_, i) => (
                <span key={i} className={cn("h-1.5 rounded-full bg-ivory transition-all", i === slide ? "w-5" : "w-1.5 opacity-60")} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="h-14" />
      )}
      <div className="p-6">
        <Tags p={p} t={t} />
        <div className="mt-2 flex items-start justify-between gap-4">
          <h2 className="font-display text-[2rem] leading-tight text-forest">{L(p.name)}</h2>
          <button onClick={props.onFav} aria-pressed={props.isFav} aria-label={t.favorites} className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-beige">
            <Heart size={18} className={props.isFav ? "fill-[#c0532f] text-[#c0532f]" : "text-charcoal/60"} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {props.showPrices && <Price p={p} currency={props.currency} locale={locale} size="lg" />}
          <DietIcons p={p} t={t} />
        </div>
        {L(p.description) && <p className="mt-4 text-[15px] leading-relaxed text-charcoal/75">{L(p.description)}</p>}
        {facts.length > 0 && (
          <dl className="mt-6 grid grid-cols-3 gap-2">
            {facts.map((f) => (
              <div key={f.label} className="rounded-2xl bg-cream p-3 text-center">
                <f.icon size={16} className="mx-auto text-gold-dark" />
                <dt className="mt-1 text-[10px] uppercase tracking-wider text-charcoal/50">{f.label}</dt>
                <dd className="text-sm font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {L(p.ingredients) && (
          <div className="mt-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dark">{t.ingredients}</h3>
            <p className="mt-2 text-sm leading-relaxed text-charcoal/70">{L(p.ingredients)}</p>
          </div>
        )}
        <div className="mt-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dark">{t.allergens}</h3>
          {allergens.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {allergens.map((a) => (
                <li key={a.key} className="rounded-full border border-beige px-3 py-1.5 text-[13px]">
                  {a.icon} {a.name[locale] ?? a.name.tr}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-charcoal/55">—</p>
          )}
        </div>
        {props.canOrder && p.inStock && (
          <label className="mt-6 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dark">{t.note}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t.itemNote} className="mt-2 h-12 w-full rounded-2xl border border-beige bg-cream/40 px-4 text-[15px] outline-none focus:border-forest" />
          </label>
        )}
      </div>
    </Sheet>
  );
}
