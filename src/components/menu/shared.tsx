"use client";
import { Flame, Leaf, Sprout, WheatOff } from "lucide-react";
import type { MenuProduct } from "@/lib/menu";
import type { Dict } from "@/lib/i18n";

export function fmt(n: number, currency: string, locale: string) {
  const loc = locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB";
  return new Intl.NumberFormat(loc, { style: "currency", currency, minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n);
}

export function priceInfo(p: MenuProduct) {
  const hasCampaign = !!p.campaignPrice && p.campaignPrice > 0 && p.campaignPrice < p.price;
  const current = hasCampaign ? p.campaignPrice! : p.price;
  const was = hasCampaign ? p.price : p.oldPrice && p.oldPrice > p.price ? p.oldPrice : null;
  return { current, was, hasCampaign };
}

export function Price({ p, currency, locale, size = "md" }: { p: MenuProduct; currency: string; locale: string; size?: "md" | "lg" }) {
  const { current, was } = priceInfo(p);
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={size === "lg" ? "text-2xl font-semibold tabular-nums text-forest" : "text-[15px] font-semibold text-forest"}>{fmt(current, currency, locale)}</span>
      {was && <s className="text-xs text-charcoal/45">{fmt(was, currency, locale)}</s>}
    </span>
  );
}

export function Spice({ level, t }: { level: number; t: Dict }) {
  if (!level) return null;
  return (
    <span className="inline-flex items-center text-[#c0532f]" title={`${t.spicy}: ${level}/3`} aria-label={`${t.spicy}: ${level}/3`}>
      {Array.from({ length: level }, (_, i) => (
        <Flame key={i} size={13} fill="currentColor" />
      ))}
    </span>
  );
}

export function DietIcons({ p, t }: { p: MenuProduct; t: Dict }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {p.vegan ? (
        <span title={t.vegan} aria-label={t.vegan} className="inline-flex h-5 items-center gap-1 rounded-full bg-emerald-700/10 px-1.5 text-[10px] font-bold text-emerald-800">
          <Sprout size={11} /> VG
        </span>
      ) : p.vegetarian ? (
        <span title={t.vegetarian} aria-label={t.vegetarian} className="inline-flex h-5 items-center gap-1 rounded-full bg-emerald-700/10 px-1.5 text-[10px] font-bold text-emerald-800">
          <Leaf size={11} /> V
        </span>
      ) : null}
      {p.glutenFree && (
        <span title={t.glutenFree} aria-label={t.glutenFree} className="inline-flex h-5 items-center rounded-full bg-gold/15 px-1.5 text-gold-dark">
          <WheatOff size={11} />
        </span>
      )}
      <Spice level={p.spiceLevel} t={t} />
    </span>
  );
}

export function Tags({ p, t }: { p: MenuProduct; t: Dict }) {
  const tags: [string, string][] = [];
  if (!p.inStock) tags.push([t.soldOut, "bg-charcoal text-cream"]);
  if (p.campaignPrice && p.campaignPrice < p.price) tags.push([t.campaign, "bg-[#c0532f] text-white"]);
  if (p.featured) tags.push([t.featured, "bg-gold text-deep"]);
  if (p.daily) tags.push([t.daily, "bg-sage text-white"]);
  if (p.isNew) tags.push([t.new, "bg-forest text-cream"]);
  if (p.popular) tags.push([t.popular, "bg-beige text-forest"]);
  if (!tags.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.slice(0, 3).map(([label, cls]) => (
        <span key={label} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
          {label}
        </span>
      ))}
    </span>
  );
}

export function normalize(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

export function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeLS(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* gizli mod vb. */
  }
}
