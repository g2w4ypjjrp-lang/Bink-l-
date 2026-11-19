"use client";
import { fmtDT, fmtD } from "@/lib/format";
import { useState } from "react";
import { Phone, MessageCircle, Mail, Plus, ArrowUp, ArrowDown, Pencil, Trash2 } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { Button, Modal, F, inputCls, textareaCls, Badge, PageHeader, Tabs, Toggle, ImageInput, Card, useRun, useConfirm } from "@/components/admin/ui";
import { DataTable } from "@/components/admin/DataTable";
import { EVENT_STATUS } from "@/components/admin/status";
import { setEventStatus, saveQuote, addEventNote, deleteEventRequests, saveEventType, moveEventType, deleteEventType } from "./actions";

type Req = { id: string; code: string; eventType: string; name: string; phone: string; email: string; date: string; guests: number | null; budget: string; specialRequest: string; description: string; status: string; quoteAmount: number | null; quoteDetails: string; createdAt: string; notes: { id: string; body: string; user: string; at: string }[]; tel: string; wa: string };
type Type = { id: string; key: string; name: string; description: string; image: string; active: boolean; count: number };
const d = (s: string) => (s ? new Date(`${s}T00:00:00Z`).toLocaleDateString("tr-TR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }) : "—");

export function EventsAdmin({ requests, types, openId }: { requests: Req[]; types: Type[]; openId?: string }) {
  const [tab, setTab] = useState<"req" | "pipeline" | "types">("req");
  const [openReq, setOpenReq] = useState<string | null>(openId ?? null);
  const [editType, setEditType] = useState<Type | "new" | null>(null);
  const { run } = useRun();
  const confirm = useConfirm();
  const cur = requests.find((r) => r.id === openReq);
  return (
    <div>
      <PageHeader title="Organizasyonlar" description={`${requests.filter((r) => r.status === "new").length} yeni başvuru · ${requests.filter((r) => r.status === "approved").length} onaylı`} actions={tab === "types" && <Button onClick={() => setEditType("new")}><Plus size={15} /> Organizasyon türü</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "req", label: "Başvurular" }, { key: "pipeline", label: "Süreç panosu" }, { key: "types", label: "Organizasyon türleri" }]} />
      {tab === "req" && (
        <DataTable
          rows={requests}
          exportName="organizasyon-basvurulari"
          onRowClick={(r) => setOpenReq(r.id)}
          searchKeys={(r) => `${r.name} ${r.phone} ${r.email} ${r.code} ${r.eventType}`}
          filters={[
            { key: "s", label: "Durum", options: Object.entries(EVENT_STATUS).map(([value, v]) => ({ value, label: v.label })), match: (r, v) => r.status === v },
            { key: "t", label: "Tür", options: [...new Set(requests.map((r) => r.eventType))].map((v) => ({ value: v, label: v })), match: (r, v) => r.eventType === v },
          ]}
          bulk={[
            { label: "Görüşüldü", run: (ids) => run(setEventStatus(ids, "contacted"), "Güncellendi") },
            { label: "Tamamlandı", run: (ids) => run(setEventStatus(ids, "completed"), "Güncellendi") },
            { label: "Sil", danger: true, run: async (ids) => { if (await confirm({ title: `${ids.length} başvuru silinsin mi?`, danger: true })) await run(deleteEventRequests(ids), "Silindi"); } },
          ]}
          columns={[
            { key: "c", header: "Başvuru", sortable: true, value: (r) => r.createdAt, render: (r) => <div><p className="font-semibold">{r.name}</p><p className="text-xs text-charcoal/50">{r.code} · {fmtD(r.createdAt)}</p></div> },
            { key: "t", header: "Tür", sortable: true, value: (r) => r.eventType },
            { key: "d", header: "Tarih", sortable: true, value: (r) => r.date, render: (r) => d(r.date) },
            { key: "g", header: "Kişi", sortable: true, value: (r) => r.guests ?? 0, hideOnMobile: true },
            { key: "b", header: "Bütçe", value: (r) => r.budget, hideOnMobile: true },
            { key: "p", header: "Telefon", value: (r) => r.phone, hideOnMobile: true },
            { key: "q", header: "Teklif", value: (r) => r.quoteAmount ?? "", render: (r) => (r.quoteAmount ? formatPrice(r.quoteAmount) : "—"), hideOnMobile: true },
            { key: "s", header: "Durum", value: (r) => EVENT_STATUS[r.status]?.label, render: (r) => <Badge tone={EVENT_STATUS[r.status]?.tone}>{EVENT_STATUS[r.status]?.label}</Badge> },
          ]}
        />
      )}
      {tab === "pipeline" && (
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-4">
          {Object.entries(EVENT_STATUS).map(([k, v]) => {
            const list = requests.filter((r) => r.status === k);
            return (
              <section key={k} className="w-72 shrink-0 rounded-2xl bg-charcoal/[0.035] p-3" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("id"); if (id) run(setEventStatus([id], k as never), `→ ${v.label}`); }}>
                <h2 className="mb-3 flex items-center justify-between px-1 font-sans text-sm font-semibold tracking-normal">{v.label} <Badge tone={v.tone}>{list.length}</Badge></h2>
                <div className="space-y-2">
                  {list.map((r) => (
                    <button key={r.id} draggable onDragStart={(e) => e.dataTransfer.setData("id", r.id)} onClick={() => setOpenReq(r.id)} className="block w-full rounded-xl border border-charcoal/8 bg-white p-3 text-left text-sm shadow-sm hover:shadow-md">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-charcoal/55">{r.eventType} · {d(r.date)}</p>
                      <p className="text-xs text-charcoal/55">{r.guests ? `${r.guests} kişi` : ""} {r.quoteAmount ? `· ${formatPrice(r.quoteAmount)}` : ""}</p>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {tab === "types" && (
        <Card pad={false}>
          <ul className="divide-y divide-charcoal/6">
            {types.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex flex-col"><button onClick={() => run(moveEventType(t.id, -1))} aria-label="Yukarı" className="p-0.5"><ArrowUp size={14} /></button><button onClick={() => run(moveEventType(t.id, 1))} aria-label="Aşağı" className="p-0.5"><ArrowDown size={14} /></button></div>
                {t.image ? <img src={t.image} alt="" className="h-12 w-16 rounded-lg object-cover" /> : <span className="h-12 w-16 rounded-lg bg-cream" />}
                <div className="min-w-0 flex-1"><p className="font-semibold">{t.name}</p><p className="truncate text-xs text-charcoal/50">{t.description}</p></div>
                <span className="text-xs text-charcoal/50">{t.count} başvuru</span>
                {!t.active && <Badge>Pasif</Badge>}
                <Button size="sm" variant="ghost" onClick={() => setEditType(t)} aria-label="Düzenle"><Pencil size={14} /></Button>
                <Button size="sm" variant="ghost" onClick={async () => { if (await confirm({ title: `"${t.name}" silinsin mi?`, text: "Geçmiş başvurular korunur.", danger: true })) run(deleteEventType(t.id), "Silindi"); }} aria-label="Sil"><Trash2 size={14} /></Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {cur && <ReqDetail r={cur} onClose={() => setOpenReq(null)} />}
      {editType && <TypeEditor t={editType === "new" ? null : editType} onClose={() => setEditType(null)} />}
    </div>
  );
}

function ReqDetail({ r, onClose }: { r: Req; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [q, setQ] = useState({ amount: r.quoteAmount, details: r.quoteDetails, sendEmail: !!r.email });
  const { run, pending } = useRun();
  return (
    <Modal side title={`${r.eventType} · ${r.name}`} onClose={onClose}>
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(EVENT_STATUS).map(([k, v]) => <button key={k} onClick={() => run(setEventStatus([r.id], k as never), `Durum: ${v.label}`)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", r.status === k ? "border-forest bg-forest text-cream" : "border-charcoal/12")}>{v.label}</button>)}
        </div>
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-cream/60 p-4">
          {[["Başvuru no", r.code], ["Tarih", d(r.date)], ["Kişi sayısı", r.guests ?? "—"], ["Bütçe", r.budget || "—"], ["Telefon", r.phone], ["E-posta", r.email || "—"]].map(([k, v]) => <div key={String(k)}><dt className="text-xs text-charcoal/50">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
          {r.specialRequest && <div className="col-span-2"><dt className="text-xs text-charcoal/50">Özel istek</dt><dd>{r.specialRequest}</dd></div>}
          {r.description && <div className="col-span-2"><dt className="text-xs text-charcoal/50">Açıklama</dt><dd className="whitespace-pre-line">{r.description}</dd></div>}
        </dl>
        <div className="flex flex-wrap gap-2">
          <a href={`tel:${r.tel}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-charcoal/12 px-3 font-semibold"><Phone size={14} /> Ara</a>
          <a href={r.wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1d7a46] px-3 font-semibold text-white"><MessageCircle size={14} /> WhatsApp</a>
          {r.email && <a href={`mailto:${r.email}?subject=${encodeURIComponent(`${r.eventType} organizasyonu — ${r.code}`)}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-charcoal/12 px-3 font-semibold"><Mail size={14} /> E-posta</a>}
        </div>
        <section className="rounded-xl border border-charcoal/10 p-4">
          <h3 className="mb-3 font-sans text-sm font-semibold tracking-normal">Teklif</h3>
          <div className="space-y-3">
            <F label="Tutar (₺)"><input type="number" min={0} className={inputCls} value={q.amount ?? ""} onChange={(e) => setQ({ ...q, amount: e.target.value === "" ? null : +e.target.value })} /></F>
            <F label="Teklif içeriği"><textarea className={textareaCls} value={q.details} onChange={(e) => setQ({ ...q, details: e.target.value })} placeholder="Menü, süsleme, müzik, süre…" /></F>
            {r.email && <Toggle checked={q.sendEmail} onChange={(v) => setQ({ ...q, sendEmail: v })} label="Teklifi müşteriye e-postayla gönder" />}
            <Button loading={pending} onClick={() => run(saveQuote(r.id, q), "Teklif kaydedildi")}>Teklifi kaydet</Button>
          </div>
        </section>
        <section>
          <h3 className="mb-2 font-sans text-sm font-semibold tracking-normal">Notlar</h3>
          <div className="flex gap-2"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Görüşme notu ekle" /><Button disabled={!note.trim()} onClick={async () => { const x = await run(addEventNote(r.id, note), "Not eklendi"); if (x.ok) setNote(""); }}>Ekle</Button></div>
          <ul className="mt-3 space-y-2">{r.notes.map((n) => <li key={n.id} className="rounded-lg bg-cream/60 p-3"><p>{n.body}</p><p className="mt-1 text-[11px] text-charcoal/45">{n.user} · {fmtDT(n.at)}</p></li>)}</ul>
        </section>
      </div>
    </Modal>
  );
}

function TypeEditor({ t, onClose }: { t: Type | null; onClose: () => void }) {
  const [f, setF] = useState({ id: t?.id, name: t?.name ?? "", description: t?.description ?? "", image: t?.image ?? "", active: t?.active ?? true });
  const { run, pending } = useRun();
  return (
    <Modal title={t ? "Türü düzenle" : "Yeni organizasyon türü"} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const x = await run(saveEventType(f), "Kaydedildi"); if (x.ok) onClose(); }}>Kaydet</Button></>}>
      <div className="space-y-3">
        <F label="Ad"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></F>
        <F label="Açıklama"><textarea className={textareaCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></F>
        <F label="Görsel"><ImageInput value={f.image} onChange={(v) => setF({ ...f, image: v })} /></F>
        <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Sitede göster" />
      </div>
    </Modal>
  );
}
