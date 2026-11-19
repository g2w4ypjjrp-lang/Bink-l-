"use client";
import { useState } from "react";
import { Plus, Star, ExternalLink } from "lucide-react";
import { Button, Modal, F, inputCls, textareaCls, Toggle, Badge, PageHeader, ImageInput, useRun, useConfirm } from "@/components/admin/ui";
import { DataTable } from "@/components/admin/DataTable";
import { saveReview, patchReviews, deleteReviews } from "./actions";

type R = { id: string; authorName: string; rating: number; body: string; date: string; photo: string; source: string; sourceUrl: string; featured: boolean; visible: boolean };

export function ReviewsAdmin({ rows, googleUrl }: { rows: R[]; googleUrl: string }) {
  const [edit, setEdit] = useState<R | "new" | null>(null);
  const { run } = useRun();
  const confirm = useConfirm();
  const avg = rows.length ? (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(1) : "—";
  return (
    <div>
      <PageHeader
        title="Misafir Yorumları"
        description={`${rows.filter((r) => r.visible).length} yayında · ortalama ${avg} ★`}
        actions={<>{googleUrl && <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-charcoal/12 bg-white px-4 text-sm font-semibold"><ExternalLink size={15} /> Google yorumları</a>}<Button onClick={() => setEdit("new")}><Plus size={15} /> Yorum ekle</Button></>}
      />
      <p className="mb-4 rounded-xl bg-cream/80 px-4 py-3 text-sm text-charcoal/70">Sitede yalnızca gerçek misafir yorumlarına yer verin. Google&apos;dan aldığınız yorumları kaynak bağlantısıyla ekleyip öne çıkarabilir veya gizleyebilirsiniz. {!googleUrl && "Google yorum bağlantınızı Ayarlar > İşletme bölümünden ekleyebilirsiniz."}</p>
      <DataTable
        rows={rows}
        exportName="yorumlar"
        onRowClick={(r) => setEdit(r)}
        empty="Henüz yorum eklenmedi."
        searchKeys={(r) => `${r.authorName} ${r.body}`}
        filters={[{ key: "v", label: "Durum", options: [{ value: "visible", label: "Yayında" }, { value: "hidden", label: "Gizli" }, { value: "featured", label: "Öne çıkan" }], match: (r, v) => (v === "visible" ? r.visible : v === "hidden" ? !r.visible : r.featured) }]}
        bulk={[
          { label: "Öne çıkar", run: (ids) => run(patchReviews(ids, { featured: true }), "Güncellendi") },
          { label: "Öne çıkarma", run: (ids) => run(patchReviews(ids, { featured: false }), "Güncellendi") },
          { label: "Gizle", run: (ids) => run(patchReviews(ids, { visible: false }), "Gizlendi") },
          { label: "Yayınla", run: (ids) => run(patchReviews(ids, { visible: true }), "Yayınlandı") },
          { label: "Sil", danger: true, run: async (ids) => { if (await confirm({ title: "Silinsin mi?", danger: true })) await run(deleteReviews(ids), "Silindi"); } },
        ]}
        columns={[
          { key: "a", header: "Misafir", sortable: true, value: (r) => r.authorName, render: (r) => <div><p className="font-semibold">{r.authorName}</p><p className="text-xs text-charcoal/50">{r.date} · {r.source === "google" ? "Google" : "Manuel"}</p></div> },
          { key: "r", header: "Puan", sortable: true, value: (r) => r.rating, render: (r) => <span className="flex text-gold">{Array.from({ length: r.rating }, (_, i) => <Star key={i} size={13} fill="currentColor" />)}</span> },
          { key: "b", header: "Yorum", value: (r) => r.body, render: (r) => <p className="line-clamp-2 max-w-md text-charcoal/70">{r.body}</p> },
          { key: "s", header: "Durum", value: (r) => (r.visible ? "Yayında" : "Gizli"), render: (r) => <div className="flex gap-1">{r.featured && <Badge tone="gold">Öne çıkan</Badge>}<Badge tone={r.visible ? "green" : "gray"}>{r.visible ? "Yayında" : "Gizli"}</Badge></div> },
        ]}
      />
      {edit && <Editor r={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Editor({ r, onClose }: { r: R | null; onClose: () => void }) {
  const [f, setF] = useState<R>(r ?? { id: "", authorName: "", rating: 5, body: "", date: new Date().toISOString().slice(0, 10), photo: "", source: "google", sourceUrl: "", featured: false, visible: true });
  const [err, setErr] = useState<Record<string, string>>({});
  const { run, pending } = useRun();
  return (
    <Modal title={r ? "Yorumu düzenle" : "Yorum ekle"} size="lg" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const x = await run(saveReview({ ...f, id: f.id || undefined }), "Kaydedildi"); if (x.ok) onClose(); else setErr(("fields" in x && x.fields) || {}); }}>Kaydet</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Misafir adı *" error={err.authorName}><input className={inputCls} value={f.authorName} onChange={(e) => setF({ ...f, authorName: e.target.value })} /></F>
        <F label="Tarih"><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></F>
        <F label="Puan"><div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setF({ ...f, rating: n })} className="text-gold" aria-label={`${n} yıldız`}><Star size={24} fill={n <= f.rating ? "currentColor" : "none"} /></button>)}</div></F>
        <F label="Kaynak"><select className={inputCls} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}><option value="google">Google</option><option value="manual">Misafir defteri / manuel</option></select></F>
        <F label="Yorum *" error={err.body} className="sm:col-span-2"><textarea className={textareaCls} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></F>
        <F label="Kaynak bağlantısı" error={err.sourceUrl} className="sm:col-span-2"><input className={inputCls} value={f.sourceUrl} onChange={(e) => setF({ ...f, sourceUrl: e.target.value })} placeholder="https://g.co/kgs/…" /></F>
        <F label="Fotoğraf (opsiyonel)" className="sm:col-span-2"><ImageInput value={f.photo} onChange={(v) => setF({ ...f, photo: v })} aspect="aspect-square" /></F>
        <Toggle checked={f.featured} onChange={(v) => setF({ ...f, featured: v })} label="Öne çıkar" />
        <Toggle checked={f.visible} onChange={(v) => setF({ ...f, visible: v })} label="Sitede göster" />
      </div>
    </Modal>
  );
}
