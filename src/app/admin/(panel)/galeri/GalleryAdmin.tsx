"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, Play, Home, EyeOff, Trash2, Check, Pencil, Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Modal, F, inputCls, textareaCls, Toggle, Badge, PageHeader, ImageInput, Card, useRun, useConfirm, uploadFile, useToast } from "@/components/admin/ui";
import { addGalleryItems, updateGalleryItem, bulkGallery, deleteGallery, reorderGallery, saveGalleryCategory, deleteGalleryCategory } from "./actions";

type Item = { id: string; type: string; url: string; thumbUrl: string; title: string; description: string; alt: string; categoryId: string | null; showOnHome: boolean; active: boolean };
type Cat = { id: string; name: string; count: number };

export function GalleryAdmin({ items, categories }: { items: Item[]; categories: Cat[] }) {
  const [list, setList] = useState(items);
  const [cat, setCat] = useState<string>("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<Item | null>(null);
  const [upCat, setUpCat] = useState<string>(categories[0]?.id ?? "");
  const [progress, setProgress] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const dragId = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { run } = useRun();
  const confirm = useConfirm();
  const toast = useToast();
  useEffect(() => { setList(items); setDirty(false); }, [items]);
  const shown = list.filter((i) => cat === "all" || (cat === "home" ? i.showOnHome : cat === "video" ? i.type === "video" : i.categoryId === cat));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const out = [];
    let k = 0;
    for (const f of Array.from(files).slice(0, 30)) {
      setProgress(`${++k}/${Math.min(files.length, 30)} yükleniyor…`);
      try {
        const r = await uploadFile(f);
        out.push({ url: r.url, thumbUrl: r.thumbUrl, width: r.width, height: r.height, type: r.type as "image" | "video", categoryId: upCat || null });
      } catch (e) {
        toast("error", `${f.name}: ${(e as Error).message}`);
      }
    }
    setProgress(null);
    if (out.length) await run(addGalleryItems(out), `${out.length} medya eklendi`);
  }

  return (
    <div>
      <PageHeader
        title="Galeri"
        description={`${items.length} medya · ${items.filter((i) => i.showOnHome).length} ana sayfada`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select value={upCat} onChange={(e) => setUpCat(e.target.value)} className="h-11 rounded-xl border border-charcoal/12 bg-white px-3 text-sm" aria-label="Yükleme kategorisi">
              <option value="">Kategorisiz</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input ref={fileRef} type="file" multiple accept="image/*,video/mp4,video/webm" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            <Button onClick={() => fileRef.current?.click()} loading={!!progress}><Upload size={15} /> {progress ?? "Fotoğraf / video yükle"}</Button>
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div>
          <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
            {[{ id: "all", name: `Tümü (${list.length})` }, { id: "home", name: "Ana sayfada" }, { id: "video", name: "Videolar" }, ...categories.map((c) => ({ id: c.id, name: `${c.name} (${c.count})` }))].map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-medium", cat === c.id ? "border-forest bg-forest text-cream" : "border-charcoal/12 bg-white")}>{c.name}</button>
            ))}
          </div>
          {sel.size > 0 && (
            <div className="sticky top-16 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-forest px-3 py-2 text-sm text-cream shadow-lg">
              <span className="font-semibold">{sel.size} seçili</span>
              <Button size="sm" variant="gold" onClick={() => run(bulkGallery([...sel], { showOnHome: true }), "Ana sayfaya eklendi").then(() => setSel(new Set()))}><Home size={13} /> Ana sayfada göster</Button>
              <Button size="sm" variant="ghost" onClick={() => run(bulkGallery([...sel], { showOnHome: false }), "Ana sayfadan kaldırıldı").then(() => setSel(new Set()))}>Ana sayfadan kaldır</Button>
              <select onChange={(e) => { if (e.target.value) run(bulkGallery([...sel], { categoryId: e.target.value === "-" ? null : e.target.value }), "Kategori değişti").then(() => setSel(new Set())); }} className="h-9 rounded-lg px-2 text-charcoal" defaultValue="" aria-label="Kategoriye taşı">
                <option value="">Kategoriye taşı…</option>
                <option value="-">Kategorisiz</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Button size="sm" variant="danger" onClick={async () => { if (await confirm({ title: `${sel.size} medya silinsin mi?`, text: "Dosyalar sunucudan da silinir.", danger: true })) { await run(deleteGallery([...sel]), "Silindi"); setSel(new Set()); } }}><Trash2 size={13} /> Sil</Button>
              <button className="ml-auto text-xs" onClick={() => setSel(new Set())}>Seçimi kaldır</button>
            </div>
          )}
          {dirty && <div className="mb-3 flex items-center justify-between rounded-xl bg-gold/15 px-3 py-2 text-sm"><span>Sıralama değişti.</span><Button size="sm" onClick={() => run(reorderGallery(list.map((i) => i.id)), "Sıralama kaydedildi").then(() => setDirty(false))}>Kaydet</Button></div>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((it) => (
              <li
                key={it.id}
                draggable={cat === "all"}
                onDragStart={() => (dragId.current = it.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const from = list.findIndex((x) => x.id === dragId.current);
                  const to = list.findIndex((x) => x.id === it.id);
                  if (from < 0 || from === to) return;
                  const n = [...list];
                  const [m] = n.splice(from, 1);
                  n.splice(to, 0, m);
                  setList(n);
                  setDirty(true);
                }}
                className={cn("group relative overflow-hidden rounded-xl border-2 bg-white", sel.has(it.id) ? "border-forest" : "border-transparent", !it.active && "opacity-50")}
              >
                <button onClick={() => setEdit(it)} className="block aspect-square w-full bg-cream">
                  {it.type === "video" ? (
                    <span className="relative flex h-full w-full items-center justify-center bg-deep text-cream">{it.thumbUrl ? <img src={it.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" /> : <video src={it.url} className="absolute inset-0 h-full w-full object-cover" muted />}<Play className="relative" /></span>
                  ) : (
                    <img src={it.thumbUrl || it.url} alt={it.alt} loading="lazy" className="h-full w-full object-cover" />
                  )}
                </button>
                <button onClick={() => setSel((s) => { const n = new Set(s); if (n.has(it.id)) n.delete(it.id); else n.add(it.id); return n; })} className={cn("absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 border-white shadow", sel.has(it.id) ? "bg-forest text-white" : "bg-black/20 opacity-0 group-hover:opacity-100")} aria-label="Seç">{sel.has(it.id) && <Check size={14} />}</button>
                <div className="absolute right-2 top-2 flex gap-1">{it.showOnHome && <span className="rounded-md bg-gold p-1 text-deep" title="Ana sayfada"><Home size={12} /></span>}{!it.active && <span className="rounded-md bg-charcoal p-1 text-white" title="Gizli"><EyeOff size={12} /></span>}</div>
                {cat === "all" && <GripVertical size={16} className="absolute bottom-2 right-2 cursor-grab text-white drop-shadow opacity-0 group-hover:opacity-100" />}
                <p className="truncate px-2 py-1.5 text-xs text-charcoal/60">{it.title || categories.find((c) => c.id === it.categoryId)?.name || "—"}</p>
              </li>
            ))}
          </ul>
          {!shown.length && <p className="py-16 text-center text-sm text-charcoal/50">Bu filtrede medya yok.</p>}
        </div>
        <CategoryPanel categories={categories} />
      </div>
      {edit && <ItemEditor it={edit} categories={categories} onClose={() => setEdit(null)} />}
    </div>
  );
}

function CategoryPanel({ categories }: { categories: Cat[] }) {
  const [name, setName] = useState("");
  const { run } = useRun();
  const confirm = useConfirm();
  return (
    <Card title="Galeri kategorileri" className="h-fit">
      <ul className="space-y-1">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1">{c.name} <span className="text-xs text-charcoal/45">({c.count})</span></span>
            <button onClick={() => { const n = prompt("Yeni ad", c.name); if (n) run(saveGalleryCategory({ id: c.id, name: n }), "Güncellendi"); }} className="rounded p-1 hover:bg-cream" aria-label="Yeniden adlandır"><Pencil size={13} /></button>
            <button onClick={async () => { if (await confirm({ title: `"${c.name}" silinsin mi?`, text: "Medyalar kategorisiz kalır.", danger: true })) run(deleteGalleryCategory(c.id), "Silindi"); }} className="rounded p-1 hover:bg-cream" aria-label="Sil"><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Yeni kategori" className={inputCls} /><Button size="sm" disabled={!name.trim()} onClick={async () => { const x = await run(saveGalleryCategory({ name }), "Eklendi"); if (x.ok) setName(""); }} aria-label="Ekle"><Plus size={14} /></Button></div>
    </Card>
  );
}

function ItemEditor({ it, categories, onClose }: { it: Item; categories: Cat[]; onClose: () => void }) {
  const [f, setF] = useState(it);
  const { run, pending } = useRun();
  const confirm = useConfirm();
  return (
    <Modal title="Medya düzenle" size="lg" onClose={onClose} footer={<><Button variant="danger" className="mr-auto" onClick={async () => { if (await confirm({ title: "Silinsin mi?", danger: true })) { const x = await run(deleteGallery([it.id]), "Silindi"); if (x.ok) onClose(); } }}><Trash2 size={14} /></Button><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const x = await run(updateGalleryItem({ ...f, thumbUrl: f.thumbUrl || undefined }), "Kaydedildi"); if (x.ok) onClose(); }}>Kaydet</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="overflow-hidden rounded-xl bg-cream">{it.type === "video" ? <video src={it.url} controls className="w-full" /> : <img src={it.url} alt="" className="w-full" />}</div>
        <div className="space-y-3">
          <F label="Başlık"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></F>
          <F label="Alt metin (erişilebilirlik & SEO)" hint="Görseli kısaca tarif edin"><input className={inputCls} value={f.alt} onChange={(e) => setF({ ...f, alt: e.target.value })} /></F>
          <F label="Açıklama"><textarea className={textareaCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></F>
          <F label="Kategori"><select className={inputCls} value={f.categoryId ?? ""} onChange={(e) => setF({ ...f, categoryId: e.target.value || null })}><option value="">Kategorisiz</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></F>
          {it.type === "video" && <F label="Video kapak görseli"><ImageInput value={f.thumbUrl} onChange={(v) => setF({ ...f, thumbUrl: v })} /></F>}
          <Toggle checked={f.showOnHome} onChange={(v) => setF({ ...f, showOnHome: v })} label="Ana sayfada göster" />
          <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Galeride yayında" />
          <Badge>{it.type === "video" ? "Video" : "Görsel (WebP)"}</Badge>
        </div>
      </div>
    </Modal>
  );
}
