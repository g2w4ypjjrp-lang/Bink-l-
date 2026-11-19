"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Button, Modal, F, inputCls, textareaCls, Toggle, Badge, PageHeader, ImageInput, useRun, useConfirm } from "@/components/admin/ui";
import { DataTable } from "@/components/admin/DataTable";
import { saveCampaign, toggleCampaigns, deleteCampaigns } from "./actions";

type C = { id: string; title: string; description: string; image: string; startsAt: string; endsAt: string; price: number | string; discountRate: number | string; categoryId: string | null; active: boolean; showOnHome: boolean; showOnMenu: boolean };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
function state(c: C) {
  if (!c.active) return { label: "Pasif", tone: "gray" as const };
  if (c.startsAt && c.startsAt > today()) return { label: "Planlandı", tone: "blue" as const };
  if (c.endsAt && c.endsAt < today()) return { label: "Süresi doldu", tone: "red" as const };
  return { label: "Yayında", tone: "green" as const };
}

export function CampaignsAdmin({ rows, categories }: { rows: C[]; categories: { id: string; name: string }[] }) {
  const [edit, setEdit] = useState<C | "new" | null>(null);
  const { run } = useRun();
  const confirm = useConfirm();
  return (
    <div>
      <PageHeader title="Kampanyalar" description={`${rows.filter((r) => state(r).label === "Yayında").length} kampanya yayında`} actions={<Button onClick={() => setEdit("new")}><Plus size={15} /> Kampanya oluştur</Button>} />
      <DataTable
        rows={rows}
        exportName="kampanyalar"
        onRowClick={(c) => setEdit(c)}
        searchKeys={(c) => `${c.title} ${c.description}`}
        filters={[{ key: "s", label: "Durum", options: ["Yayında", "Planlandı", "Süresi doldu", "Pasif"].map((v) => ({ value: v, label: v })), match: (c, v) => state(c).label === v }]}
        bulk={[
          { label: "Aktif yap", run: (ids) => run(toggleCampaigns(ids, true), "Güncellendi") },
          { label: "Pasif yap", run: (ids) => run(toggleCampaigns(ids, false), "Güncellendi") },
          { label: "Sil", danger: true, run: async (ids) => { if (await confirm({ title: `${ids.length} kampanya silinsin mi?`, danger: true })) await run(deleteCampaigns(ids), "Silindi"); } },
        ]}
        columns={[
          { key: "img", header: "", csv: false, render: (c) => (c.image ? <img src={c.image} alt="" className="h-11 w-16 rounded-lg object-cover" /> : <span className="block h-11 w-16 rounded-lg bg-cream" />) },
          { key: "t", header: "Kampanya", sortable: true, value: (c) => c.title, render: (c) => <div><p className="font-semibold">{c.title}</p><p className="line-clamp-1 text-xs text-charcoal/50">{c.description}</p></div> },
          { key: "v", header: "Fırsat", value: (c) => (c.discountRate ? `%${c.discountRate}` : c.price ? formatPrice(c.price) : ""), render: (c) => (c.discountRate ? <Badge tone="gold">%{c.discountRate}</Badge> : c.price ? formatPrice(c.price) : "—") },
          { key: "d", header: "Tarih", sortable: true, value: (c) => c.startsAt, render: (c) => <span className="text-xs">{c.startsAt || "—"} → {c.endsAt || "süresiz"}</span>, hideOnMobile: true },
          { key: "w", header: "Gösterim", value: (c) => [c.showOnHome && "Ana sayfa", c.showOnMenu && "QR menü"].filter(Boolean).join(", "), hideOnMobile: true },
          { key: "s", header: "Durum", value: (c) => state(c).label, render: (c) => <Badge tone={state(c).tone}>{state(c).label}</Badge> },
        ]}
      />
      {edit && <Editor c={edit === "new" ? null : edit} categories={categories} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Editor({ c, categories, onClose }: { c: C | null; categories: { id: string; name: string }[]; onClose: () => void }) {
  const [f, setF] = useState<C>(c ?? { id: "", title: "", description: "", image: "", startsAt: today(), endsAt: "", price: "", discountRate: "", categoryId: null, active: true, showOnHome: true, showOnMenu: true });
  const [err, setErr] = useState<Record<string, string>>({});
  const { run, pending } = useRun();
  const set = (k: keyof C, v: unknown) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal title={c ? "Kampanyayı düzenle" : "Yeni kampanya"} size="lg" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const x = await run(saveCampaign({ ...f, id: f.id || undefined }), "Kampanya kaydedildi"); if (x.ok) onClose(); else setErr(("fields" in x && x.fields) || {}); }}>Kaydet</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Başlık *" error={err.title} className="sm:col-span-2"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} /></F>
        <F label="Açıklama" className="sm:col-span-2"><textarea className={textareaCls} value={f.description} onChange={(e) => set("description", e.target.value)} /></F>
        <F label="Başlangıç"><input type="date" className={inputCls} value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></F>
        <F label="Bitiş" hint="Boş = süresiz"><input type="date" className={inputCls} value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></F>
        <F label="Kampanya fiyatı (₺)"><input type="number" min={0} className={inputCls} value={f.price} onChange={(e) => set("price", e.target.value)} /></F>
        <F label="İndirim oranı (%)"><input type="number" min={0} max={100} className={inputCls} value={f.discountRate} onChange={(e) => set("discountRate", e.target.value)} /></F>
        <F label="Kampanya kategorisi" hint="Menüde ilgili kategoriye bağlanır" className="sm:col-span-2"><select className={inputCls} value={f.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)}><option value="">— Yok —</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></F>
        <F label="Görsel" className="sm:col-span-2"><ImageInput value={f.image} onChange={(v) => set("image", v)} /></F>
        <div className="flex flex-wrap gap-5 sm:col-span-2">
          <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Aktif" />
          <Toggle checked={f.showOnHome} onChange={(v) => set("showOnHome", v)} label="Ana sayfada göster" />
          <Toggle checked={f.showOnMenu} onChange={(v) => set("showOnMenu", v)} label="QR menüde göster" />
        </div>
      </div>
    </Modal>
  );
}
