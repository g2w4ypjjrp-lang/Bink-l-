"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui";

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  /** sıralama ve CSV için düz değer */
  value?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  className?: string;
  hideOnMobile?: boolean;
  csv?: boolean;
};
export type FilterDef<T> = { key: string; label: string; options: { value: string; label: string }[]; match: (row: T, v: string) => boolean };
export type BulkAction = { label: string; run: (ids: string[]) => Promise<unknown> | void; danger?: boolean };

function toCsv<T>(rows: T[], cols: Column<T>[]) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const c = cols.filter((x) => x.csv !== false && (x.value || x.render));
  const head = c.map((x) => esc(x.header)).join(";");
  const body = rows.map((r) => c.map((x) => esc(x.value ? x.value(r) : "")).join(";")).join("\n");
  return "﻿" + head + "\n" + body; // BOM: Excel Türkçe karakter uyumu
}

export function downloadText(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataTable<T extends { id: string }>({
  rows, columns, searchKeys, filters = [], bulk = [], onRowClick, pageSize = 20, exportName, empty = "Kayıt bulunamadı.", toolbar, initialSort, rowClassName,
}: {
  rows: T[]; columns: Column<T>[]; searchKeys?: (row: T) => string; filters?: FilterDef<T>[]; bulk?: BulkAction[]; onRowClick?: (row: T) => void; pageSize?: number;
  exportName?: string; empty?: string; toolbar?: React.ReactNode; initialSort?: { key: string; dir: "asc" | "desc" }; rowClassName?: (row: T) => string;
}) {
  const [q, setQ] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSize);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    let out = rows.filter((r) => (!needle || (searchKeys ? searchKeys(r) : JSON.stringify(r)).toLocaleLowerCase("tr").includes(needle)) && filters.every((f) => !fv[f.key] || f.match(r, fv[f.key])));
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.value) {
        out = [...out].sort((a, b) => {
          const va = col.value!(a) ?? "";
          const vb = col.value!(b) ?? "";
          const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "tr", { numeric: true });
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, q, fv, sort, filters, columns, searchKeys]);

  useEffect(() => setPage(0), [q, fv, size]);
  useEffect(() => setSel((s) => new Set([...s].filter((id) => rows.some((r) => r.id === id)))), [rows]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const cur = filtered.slice(page * size, page * size + size);
  const allOnPage = cur.length > 0 && cur.every((r) => sel.has(r.id));

  return (
    <div className="rounded-2xl border border-charcoal/8 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-charcoal/6 p-3">
        <label className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara…" aria-label="Tabloda ara" className="h-9 w-full rounded-lg border border-charcoal/12 pl-9 pr-3 text-sm outline-none focus:border-forest" />
        </label>
        {filters.map((f) => (
          <select key={f.key} aria-label={f.label} value={fv[f.key] ?? ""} onChange={(e) => setFv((s) => ({ ...s, [f.key]: e.target.value }))} className="h-9 rounded-lg border border-charcoal/12 bg-white px-2.5 text-sm">
            <option value="">{f.label}: Tümü</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        {(q || Object.values(fv).some(Boolean)) && (
          <button onClick={() => { setQ(""); setFv({}); }} className="flex h-9 items-center gap-1 rounded-lg px-2 text-xs text-charcoal/60 hover:bg-cream">
            <X size={13} /> Temizle
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {toolbar}
          {exportName && (
            <Button size="sm" variant="ghost" onClick={() => downloadText(`${exportName}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(filtered, columns))}>
              <Download size={14} /> Excel/CSV
            </Button>
          )}
        </div>
      </div>
      {sel.size > 0 && bulk.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-charcoal/6 bg-forest/5 px-3 py-2 text-sm">
          <span className="font-semibold text-forest">{sel.size} seçili</span>
          {bulk.map((b) => (
            <Button
              key={b.label}
              size="sm"
              variant={b.danger ? "danger" : "soft"}
              onClick={async () => {
                await b.run([...sel]);
                setSel(new Set());
              }}
            >
              {b.label}
            </Button>
          ))}
          <button onClick={() => setSel(new Set())} className="ml-auto text-xs text-charcoal/60">
            Seçimi kaldır
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal/6 text-[11.5px] uppercase tracking-wider text-charcoal/50">
              {bulk.length > 0 && (
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" aria-label="Sayfadakileri seç" checked={allOnPage} onChange={(e) => setSel((s) => { const n = new Set(s); cur.forEach((r) => (e.target.checked ? n.add(r.id) : n.delete(r.id))); return n; })} className="accent-forest" />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={cn("whitespace-nowrap px-3 py-2.5 font-semibold", c.hideOnMobile && "hidden md:table-cell", c.className)}>
                  {c.sortable && c.value ? (
                    <button onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "asc" }))} className="inline-flex items-center gap-1 hover:text-charcoal">
                      {c.header}
                      {sort?.key === c.key ? sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <ArrowUpDown size={12} className="opacity-40" />}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cur.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-14 text-center text-charcoal/50">
                  {empty}
                </td>
              </tr>
            )}
            {cur.map((r) => (
              <tr key={r.id} onClick={() => onRowClick?.(r)} className={cn("border-b border-charcoal/5 last:border-0", onRowClick && "cursor-pointer hover:bg-cream/50", sel.has(r.id) && "bg-forest/5", rowClassName?.(r))}>
                {bulk.length > 0 && (
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label="Seç" checked={sel.has(r.id)} onChange={(e) => setSel((s) => { const n = new Set(s); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n; })} className="accent-forest" />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-2.5 align-middle", c.hideOnMobile && "hidden md:table-cell", c.className)}>
                    {c.render ? c.render(r) : String(c.value?.(r) ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/6 px-3 py-2.5 text-xs text-charcoal/60">
        <span>
          {filtered.length} kayıt{filtered.length !== rows.length && ` (toplam ${rows.length})`}
        </span>
        <div className="flex items-center gap-2">
          <select value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Sayfa boyutu" className="h-8 rounded-md border border-charcoal/12 bg-white px-1.5">
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / sayfa
              </option>
            ))}
          </select>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded-md p-1.5 hover:bg-cream disabled:opacity-30" aria-label="Önceki sayfa">
            <ChevronLeft size={16} />
          </button>
          <span className="tabular-nums">
            {page + 1} / {pages}
          </span>
          <button disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className="rounded-md p-1.5 hover:bg-cream disabled:opacity-30" aria-label="Sonraki sayfa">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
