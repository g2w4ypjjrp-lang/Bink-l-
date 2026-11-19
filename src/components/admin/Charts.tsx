"use client";
import dynamic from "next/dynamic";

/** Grafikler yalnızca tarayıcıda yüklenir (sunucu paketini küçük tutar). */
export const SERIES = ["#2f8a5b", "#d08a1e", "#4a72b8"];
const Ph = ({ h = 240 }: { h?: number }) => <div style={{ height: h }} className="animate-pulse rounded-xl bg-charcoal/[0.04]" />;
export const SeriesChart = dynamic(() => import("./ChartsImpl").then((m) => m.SeriesChart), { ssr: false, loading: () => <Ph /> });
export const ColumnChart = dynamic(() => import("./ChartsImpl").then((m) => m.ColumnChart), { ssr: false, loading: () => <Ph h={200} /> });

/** Erişilebilir yatay çubuk listesi — değerler her zaman yazılı */
export function BarList({ items, empty = "Henüz veri yok" }: { items: { name: string; value: number }[]; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-8 text-center text-sm text-charcoal/45">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.name} className="group" title={`${i.name}: ${i.value}`}>
          <div className="flex justify-between gap-3 text-[13px]">
            <span className="truncate text-charcoal/80">{i.name}</span>
            <span className="font-semibold tabular-nums">{i.value.toLocaleString("tr-TR")}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-charcoal/6">
            <div className="h-full rounded-full transition-all group-hover:opacity-80" style={{ width: `${(i.value / max) * 100}%`, background: SERIES[0] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
