"use client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";

/** Doğrulanmış grafik paleti (dataviz validator: CVD + kontrast geçti) */
export const SERIES = ["#2f8a5b", "#d08a1e", "#4a72b8"];
const axis = { fontSize: 11, fill: "rgba(36,39,34,0.55)" };

function Tip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-charcoal/10 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-charcoal">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-charcoal/75">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <b className="tabular-nums text-charcoal">{p.value.toLocaleString("tr-TR")}</b>
        </p>
      ))}
    </div>
  );
}

export function SeriesChart({ data, series, height = 260 }: { data: Record<string, string | number>[]; series: { key: string; name: string }[]; height?: number }) {
  return (
    <div>
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-charcoal/70">
          {series.map((s, i) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i] }} /> {s.name}
            </span>
          ))}
        </div>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES[i]} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={SERIES[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(36,39,34,0.07)" />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={18} />
            <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<Tip />} cursor={{ stroke: "rgba(36,39,34,0.25)", strokeWidth: 1 }} />
            {series.map((s, i) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={SERIES[i]} strokeWidth={2} fill={`url(#g-${s.key})`} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ColumnChart({ data, dataKey, name, height = 220 }: { data: Record<string, string | number>[]; dataKey: string; name: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="rgba(36,39,34,0.07)" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={18} />
          <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(36,39,34,0.05)" }} />
          <Bar dataKey={dataKey} name={name} fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

