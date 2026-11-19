"use client";
import { fmtDT } from "@/lib/format";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Phone, MessageCircle, Mail, Baby, Cake, CalendarDays, List, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Modal, F, inputCls, textareaCls, Badge, PageHeader, Tabs, useRun, useConfirm } from "@/components/admin/ui";
import { DataTable } from "@/components/admin/DataTable";
import { RES_STATUS, OCCASIONS } from "@/components/admin/status";
import { setReservationStatus, addReservationNote, saveReservation, deleteReservations } from "./actions";

type R = {
  id: string; code: string; name: string; phone: string; email: string; guests: number; children: number; date: string; time: string; seating: string; occasion: string; specialRequest: string; description: string;
  status: string; source: string; createdAt: string; notes: { id: string; body: string; user: string; at: string }[]; wa: { confirmed: string; rejected: string }; tel: string;
};
type View = "list" | "day" | "week" | "month";
const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);
const add = (s: string, n: number) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const monday = (s: string) => add(s, -((parse(s).getUTCDay() + 6) % 7));
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => parse(s).toLocaleDateString("tr-TR", { timeZone: "UTC", ...o });
const SOURCE: Record<string, string> = { web: "Web", phone: "Telefon", walk_in: "Gel-al", admin: "Panel" };

export function ReservationsAdmin({ rows, canManage, seating, today, openId, initialView, initialStatus }: { rows: R[]; canManage: boolean; seating: string[]; today: string; openId?: string; initialView: View; initialStatus?: string }) {
  const [view, setView] = useState<View>(initialView);
  const [cursor, setCursor] = useState(today);
  const [detailId, setDetailId] = useState<string | null>(openId ?? null);
  const [edit, setEdit] = useState<Partial<R> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus ?? "active");
  const detail = rows.find((r) => r.id === detailId) ?? null;
  const { run } = useRun();
  const confirm = useConfirm();

  const calRows = useMemo(() => rows.filter((r) => (statusFilter === "active" ? ["pending", "confirmed", "completed"].includes(r.status) : statusFilter === "all" ? true : r.status === statusFilter)), [rows, statusFilter]);
  const byDate = useMemo(() => {
    const m = new Map<string, R[]>();
    calRows.forEach((r) => m.set(r.date, [...(m.get(r.date) ?? []), r]));
    m.forEach((l) => l.sort((a, b) => a.time.localeCompare(b.time)));
    return m;
  }, [calRows]);

  const step = (n: number) => setCursor((c) => (view === "day" ? add(c, n) : view === "week" ? add(c, 7 * n) : (() => { const d = parse(c); d.setUTCMonth(d.getUTCMonth() + n, 1); return iso(d); })()));
  const title = view === "day" ? fmt(cursor, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : view === "week" ? `${fmt(monday(cursor), { day: "numeric", month: "short" })} – ${fmt(add(monday(cursor), 6), { day: "numeric", month: "short", year: "numeric" })}` : fmt(cursor, { month: "long", year: "numeric" });

  const Card = ({ r, compact }: { r: R; compact?: boolean }) => (
    <button onClick={() => setDetailId(r.id)} className={cn("w-full rounded-lg border-l-[3px] bg-white p-2 text-left text-xs shadow-sm transition hover:shadow-md", r.status === "pending" ? "border-amber-500" : r.status === "confirmed" ? "border-emerald-600" : r.status === "completed" ? "border-sky-600" : "border-charcoal/30 opacity-60")}>
      <span className="flex items-center justify-between gap-1 font-semibold"><span>{r.time}</span><span className="flex items-center gap-0.5 text-charcoal/60"><Users size={11} />{r.guests}</span></span>
      <span className="block truncate">{r.name}</span>
      {!compact && r.occasion && <span className="mt-0.5 block truncate text-[10px] text-gold-dark">{OCCASIONS[r.occasion] ?? r.occasion}</span>}
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Rezervasyonlar"
        description={`${rows.filter((r) => r.status === "pending").length} onay bekliyor · bugün ${(byDate.get(today) ?? []).filter((r) => r.status !== "cancelled").reduce((a, r) => a + r.guests, 0)} misafir`}
        actions={canManage && <Button onClick={() => setEdit({ date: cursor, time: "19:00", guests: 2, children: 0, status: "confirmed", source: "phone" })}><Plus size={15} /> Rezervasyon ekle</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={view} onChange={setView} tabs={[{ key: "list", label: <span className="flex items-center gap-1.5"><List size={14} /> Liste</span> }, { key: "day", label: "Gün" }, { key: "week", label: "Hafta" }, { key: "month", label: <span className="flex items-center gap-1.5"><CalendarDays size={14} /> Ay</span> }]} />
        {view !== "list" && (
          <div className="mb-5 ml-auto flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-charcoal/12 bg-white px-2 text-sm" aria-label="Durum filtresi">
              <option value="active">Aktif (iptal/red hariç)</option>
              <option value="all">Tümü</option>
              {Object.entries(RES_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Button size="sm" variant="ghost" onClick={() => setCursor(today)}>Bugün</Button>
            <Button size="sm" variant="ghost" onClick={() => step(-1)} aria-label="Önceki"><ChevronLeft size={15} /></Button>
            <span className="min-w-44 text-center text-sm font-semibold capitalize">{title}</span>
            <Button size="sm" variant="ghost" onClick={() => step(1)} aria-label="Sonraki"><ChevronRight size={15} /></Button>
            <input type="date" value={cursor} onChange={(e) => e.target.value && setCursor(e.target.value)} className="h-9 rounded-lg border border-charcoal/12 px-2 text-sm" aria-label="Tarihe git" />
          </div>
        )}
      </div>

      {view === "list" && (
        <DataTable
          rows={rows}
          exportName="rezervasyonlar"
          onRowClick={(r) => setDetailId(r.id)}
          searchKeys={(r) => `${r.name} ${r.phone} ${r.phone.replace(/\D/g, "")} ${r.email} ${r.code}`}
          initialSort={{ key: "date", dir: "asc" }}
          filters={[
            { key: "s", label: "Durum", options: Object.entries(RES_STATUS).map(([value, v]) => ({ value, label: v.label })), match: (r, v) => r.status === v },
            { key: "d", label: "Tarih", options: [{ value: "today", label: "Bugün" }, { value: "tomorrow", label: "Yarın" }, { value: "week", label: "Bu hafta" }, { value: "future", label: "Gelecek" }, { value: "past", label: "Geçmiş" }], match: (r, v) => (v === "today" ? r.date === today : v === "tomorrow" ? r.date === add(today, 1) : v === "week" ? r.date >= monday(today) && r.date <= add(monday(today), 6) : v === "future" ? r.date >= today : r.date < today) },
            { key: "o", label: "Özel gün", options: Object.entries(OCCASIONS).map(([value, label]) => ({ value, label })), match: (r, v) => r.occasion === v },
          ]}
          bulk={canManage ? [
            { label: "Onayla", run: (ids) => run(setReservationStatus(ids, "confirmed"), "Onaylandı") },
            { label: "Tamamlandı", run: (ids) => run(setReservationStatus(ids, "completed", false), "Güncellendi") },
            { label: "Gelmedi", run: (ids) => run(setReservationStatus(ids, "no_show", false), "Güncellendi") },
            { label: "Sil", danger: true, run: async (ids) => { if (await confirm({ title: `${ids.length} rezervasyon silinsin mi?`, danger: true })) await run(deleteReservations(ids), "Silindi"); } },
          ] : []}
          columns={[
            { key: "date", header: "Tarih", sortable: true, value: (r) => `${r.date} ${r.time}`, render: (r) => <span className="whitespace-nowrap"><b>{fmt(r.date, { day: "2-digit", month: "short" })}</b> {r.time}</span> },
            { key: "name", header: "Misafir", sortable: true, value: (r) => r.name, render: (r) => <div><p className="font-semibold">{r.name}</p><p className="text-xs text-charcoal/50">{r.phone}</p></div> },
            { key: "guests", header: "Kişi", sortable: true, value: (r) => r.guests, render: (r) => <span>{r.guests}{r.children > 0 && <span className="text-xs text-charcoal/50"> (+{r.children} çocuk)</span>}</span> },
            { key: "occ", header: "Not", hideOnMobile: true, value: (r) => [OCCASIONS[r.occasion], r.seating, r.specialRequest].filter(Boolean).join(" · "), render: (r) => <span className="line-clamp-1 max-w-[220px] text-xs text-charcoal/60">{[OCCASIONS[r.occasion], r.seating, r.specialRequest].filter(Boolean).join(" · ")}</span> },
            { key: "email", header: "E-posta", value: (r) => r.email, hideOnMobile: true, render: () => null, className: "hidden" },
            { key: "src", header: "Kaynak", hideOnMobile: true, value: (r) => SOURCE[r.source] ?? r.source },
            { key: "status", header: "Durum", sortable: true, value: (r) => RES_STATUS[r.status]?.label, render: (r) => <Badge tone={RES_STATUS[r.status]?.tone}>{RES_STATUS[r.status]?.label}</Badge> },
          ]}
        />
      )}

      {view === "day" && (
        <div className="rounded-2xl border border-charcoal/8 bg-white p-4">
          {(byDate.get(cursor) ?? []).length === 0 ? (
            <p className="py-16 text-center text-sm text-charcoal/50">Bu gün için rezervasyon yok.</p>
          ) : (
            <>
              <p className="mb-4 text-sm text-charcoal/60">{(byDate.get(cursor) ?? []).length} rezervasyon · {(byDate.get(cursor) ?? []).reduce((a, r) => a + r.guests, 0)} misafir</p>
              {Object.entries((byDate.get(cursor) ?? []).reduce<Record<string, R[]>>((acc, r) => ({ ...acc, [r.time]: [...(acc[r.time] ?? []), r] }), {})).map(([t, list]) => (
                <div key={t} className="flex gap-4 border-t border-charcoal/6 py-3">
                  <span className="w-14 shrink-0 pt-2 text-sm font-bold tabular-nums">{t}</span>
                  <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((r) => (
                      <button key={r.id} onClick={() => setDetailId(r.id)} className="flex items-center justify-between gap-3 rounded-xl border border-charcoal/8 p-3 text-left hover:bg-cream/40">
                        <span>
                          <span className="block font-semibold">{r.name}</span>
                          <span className="text-xs text-charcoal/55">{r.guests} kişi{r.children ? ` · ${r.children} çocuk` : ""}{r.seating ? ` · ${r.seating}` : ""}{r.occasion ? ` · ${OCCASIONS[r.occasion]}` : ""}</span>
                        </span>
                        <Badge tone={RES_STATUS[r.status]?.tone}>{RES_STATUS[r.status]?.label}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {view === "week" && (
        <div className="grid gap-2 overflow-x-auto md:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => add(monday(cursor), i)).map((d, i) => {
            const list = byDate.get(d) ?? [];
            return (
              <div key={d} className={cn("min-h-48 rounded-xl border bg-white/70 p-2", d === today ? "border-gold" : "border-charcoal/8")}>
                <button onClick={() => { setCursor(d); setView("day"); }} className="mb-2 flex w-full items-baseline justify-between px-1 text-left">
                  <span className="text-xs font-semibold text-charcoal/55">{DAYS[i]}</span>
                  <span className={cn("text-lg font-bold", d === today && "text-gold-dark")}>{parse(d).getUTCDate()}</span>
                </button>
                <p className="mb-2 px-1 text-[11px] text-charcoal/50">{list.length ? `${list.reduce((a, r) => a + r.guests, 0)} misafir` : "—"}</p>
                <div className="space-y-1.5">{list.map((r) => <Card key={r.id} r={r} />)}</div>
              </div>
            );
          })}
        </div>
      )}

      {view === "month" && (
        <div className="overflow-hidden rounded-2xl border border-charcoal/8 bg-white">
          <div className="grid grid-cols-7 border-b border-charcoal/8 bg-cream/40 text-center text-[11px] font-semibold uppercase text-charcoal/55">{DAYS.map((d) => <div key={d} className="py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7">
            {(() => {
              const first = `${cursor.slice(0, 7)}-01`;
              const start = monday(first);
              return Array.from({ length: 42 }, (_, i) => add(start, i)).map((d) => {
                const list = byDate.get(d) ?? [];
                const inMonth = d.slice(0, 7) === cursor.slice(0, 7);
                const pending = list.filter((r) => r.status === "pending").length;
                return (
                  <button key={d} onClick={() => { setCursor(d); setView("day"); }} className={cn("min-h-24 border-b border-r border-charcoal/6 p-1.5 text-left align-top transition hover:bg-cream/40 sm:min-h-28", !inMonth && "bg-charcoal/[0.02] text-charcoal/35")}>
                    <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", d === today && "bg-forest text-cream")}>{parse(d).getUTCDate()}</span>
                    {list.length > 0 && (
                      <span className="mt-1 block space-y-0.5 text-[10.5px]">
                        <span className="block rounded bg-forest/10 px-1.5 py-0.5 font-semibold text-forest">{list.length} rez · {list.reduce((a, r) => a + r.guests, 0)} kişi</span>
                        {pending > 0 && <span className="block rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">{pending} bekliyor</span>}
                        <span className="hidden sm:block">{list.slice(0, 2).map((r) => <span key={r.id} className="block truncate text-charcoal/60">{r.time} {r.name}</span>)}</span>
                      </span>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      {detail && <Detail r={detail} canManage={canManage} onClose={() => setDetailId(null)} onEdit={() => { setEdit(detail); setDetailId(null); }} />}
      {edit && <Editor r={edit} seating={seating} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Detail({ r, canManage, onClose, onEdit }: { r: R; canManage: boolean; onClose: () => void; onEdit: () => void }) {
  const [note, setNote] = useState("");
  const { run, pending } = useRun();
  const confirm = useConfirm();
  const setStatus = async (s: string) => {
    const res = await run(setReservationStatus([r.id], s as never), `Durum: ${RES_STATUS[s].label}`);
    if (res.ok && (s === "confirmed" || s === "rejected") && !r.email && (await confirm({ title: "Misafire WhatsApp ile bildirilsin mi?", text: "Hazır mesaj WhatsApp'ta açılacak.", confirm: "WhatsApp'ı aç" }))) window.open(s === "confirmed" ? r.wa.confirmed : r.wa.rejected, "_blank");
  };
  return (
    <Modal side title={`${r.name} · ${r.code}`} onClose={onClose} footer={canManage && <><Button variant="ghost" onClick={onEdit}>Düzenle</Button>{r.status === "pending" && <><Button variant="danger" onClick={() => setStatus("rejected")}>Reddet</Button><Button onClick={() => setStatus("confirmed")}>Onayla</Button></>}</>}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={RES_STATUS[r.status]?.tone}>{RES_STATUS[r.status]?.label}</Badge>
          <span className="text-xs text-charcoal/50">Kaynak: {SOURCE[r.source]} · Oluşturma {fmtDT(r.createdAt)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-cream/60 p-4 text-sm">
          <div><p className="text-xs text-charcoal/50">Tarih</p><p className="font-semibold">{fmt(r.date, { weekday: "long", day: "numeric", month: "long" })}</p></div>
          <div><p className="text-xs text-charcoal/50">Saat</p><p className="font-semibold">{r.time}</p></div>
          <div><p className="text-xs text-charcoal/50">Kişi</p><p className="font-semibold">{r.guests} {r.children > 0 && <span className="inline-flex items-center gap-1 text-xs font-normal"><Baby size={12} /> {r.children} çocuk</span>}</p></div>
          <div><p className="text-xs text-charcoal/50">Masa tercihi</p><p className="font-semibold">{r.seating || "—"}</p></div>
          {r.occasion && <div className="col-span-2"><p className="text-xs text-charcoal/50">Özel gün</p><p className="flex items-center gap-1.5 font-semibold text-gold-dark"><Cake size={14} /> {OCCASIONS[r.occasion] ?? r.occasion}</p></div>}
          {r.specialRequest && <div className="col-span-2"><p className="text-xs text-charcoal/50">Özel istek</p><p>{r.specialRequest}</p></div>}
          {r.description && <div className="col-span-2"><p className="text-xs text-charcoal/50">Açıklama</p><p>{r.description}</p></div>}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-charcoal/60">Müşteri</p>
          <p className="text-sm">{r.phone}{r.email && ` · ${r.email}`}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={`tel:${r.tel}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-charcoal/12 px-3 text-sm font-semibold"><Phone size={14} /> Ara</a>
            <a href={r.wa.confirmed} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1d7a46] px-3 text-sm font-semibold text-white"><MessageCircle size={14} /> WhatsApp (onay mesajı)</a>
            <a href={`sms:${r.tel}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-charcoal/12 px-3 text-sm font-semibold">SMS</a>
            {r.email && <a href={`mailto:${r.email}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-charcoal/12 px-3 text-sm font-semibold"><Mail size={14} /> E-posta</a>}
          </div>
        </div>
        {canManage && (
          <div>
            <p className="mb-2 text-xs font-semibold text-charcoal/60">Durumu değiştir</p>
            <div className="flex flex-wrap gap-1.5">{Object.entries(RES_STATUS).map(([k, v]) => <button key={k} onClick={() => setStatus(k)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", r.status === k ? "border-forest bg-forest text-cream" : "border-charcoal/12")}>{v.label}</button>)}</div>
            <p className="mt-2 text-[11px] text-charcoal/45">Onay/red/iptalde misafirin e-postası varsa otomatik bilgilendirme gönderilir (SMTP ayarlıysa).</p>
          </div>
        )}
        <div>
          <p className="mb-2 text-xs font-semibold text-charcoal/60">Notlar</p>
          {canManage && (
            <div className="flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="İç not ekle (misafir görmez)" className={inputCls} onKeyDown={async (e) => { if (e.key === "Enter" && note.trim()) { const x = await run(addReservationNote(r.id, note), "Not eklendi"); if (x.ok) setNote(""); } }} />
              <Button loading={pending} disabled={!note.trim()} onClick={async () => { const x = await run(addReservationNote(r.id, note), "Not eklendi"); if (x.ok) setNote(""); }}>Ekle</Button>
            </div>
          )}
          <ul className="mt-3 space-y-2">
            {r.notes.map((n) => <li key={n.id} className="rounded-lg bg-cream/60 p-3 text-sm"><p>{n.body}</p><p className="mt-1 text-[11px] text-charcoal/45">{n.user} · {fmtDT(n.at)}</p></li>)}
            {!r.notes.length && <li className="text-xs text-charcoal/45">Henüz not yok.</li>}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

function Editor({ r, seating, onClose }: { r: Partial<R>; seating: string[]; onClose: () => void }) {
  const [f, setF] = useState({ id: r.id, name: r.name ?? "", phone: r.phone ?? "", email: r.email ?? "", guests: r.guests ?? 2, children: r.children ?? 0, date: r.date ?? "", time: r.time ?? "19:00", seating: r.seating ?? seating[0] ?? "", occasion: r.occasion ?? "", specialRequest: r.specialRequest ?? "", description: r.description ?? "", status: r.status ?? "confirmed", source: r.source ?? "phone" });
  const [err, setErr] = useState<Record<string, string>>({});
  const { run, pending } = useRun();
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal title={r.id ? "Rezervasyonu düzenle" : "Yeni rezervasyon"} size="lg" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const x = await run(saveReservation(f), "Kaydedildi"); if (x.ok) onClose(); else setErr(("fields" in x && x.fields) || {}); }}>Kaydet</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Ad soyad *" error={err.name}><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} /></F>
        <F label="Telefon *" error={err.phone}><input className={inputCls} value={f.phone} onChange={(e) => set("phone", e.target.value)} /></F>
        <F label="E-posta" error={err.email}><input className={inputCls} value={f.email} onChange={(e) => set("email", e.target.value)} /></F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Kişi"><input type="number" min={1} className={inputCls} value={f.guests} onChange={(e) => set("guests", +e.target.value)} /></F>
          <F label="Çocuk"><input type="number" min={0} className={inputCls} value={f.children} onChange={(e) => set("children", +e.target.value)} /></F>
        </div>
        <F label="Tarih *" error={err.date}><input type="date" className={inputCls} value={f.date} onChange={(e) => set("date", e.target.value)} /></F>
        <F label="Saat *" error={err.time}><input type="time" className={inputCls} value={f.time} onChange={(e) => set("time", e.target.value)} /></F>
        <F label="Masa tercihi"><select className={inputCls} value={f.seating} onChange={(e) => set("seating", e.target.value)}>{seating.map((s) => <option key={s}>{s}</option>)}</select></F>
        <F label="Özel gün"><select className={inputCls} value={f.occasion} onChange={(e) => set("occasion", e.target.value)}><option value="">Yok</option>{Object.entries(OCCASIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
        <F label="Durum"><select className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(RES_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></F>
        {!r.id && <F label="Kaynak"><select className={inputCls} value={f.source} onChange={(e) => set("source", e.target.value)}>{Object.entries(SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>}
        <F label="Özel istek" className="sm:col-span-2"><input className={inputCls} value={f.specialRequest} onChange={(e) => set("specialRequest", e.target.value)} /></F>
        <F label="Açıklama" className="sm:col-span-2"><textarea className={textareaCls} value={f.description} onChange={(e) => set("description", e.target.value)} /></F>
      </div>
    </Modal>
  );
}
