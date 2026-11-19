"use client";
import { fmtDT } from "@/lib/format";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ImageIcon, X, Languages, Eye } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { Button, Modal, F, inputCls, textareaCls, Toggle, Badge, PageHeader, Tabs, ImageInput, useRun, useConfirm, Card, uploadFile, useToast } from "@/components/admin/ui";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { saveCategory, deleteCategory, reorderCategories, saveProduct, deleteProducts, bulkUpdateProducts, quickUpdateProduct, reorderProducts, saveAllergen, deleteAllergen } from "./actions";

type Tr = Record<string, { name: string; description: string; ingredients?: string }>;
export type Cat = { id: string; name: string; slug: string; description: string; image: string; parentId: string | null; active: boolean; availableFrom: string; availableTo: string; count: number; translations: Tr };
export type Prod = {
  id: string; name: string; slug: string; description: string; ingredients: string; price: number; oldPrice: number | null; campaignPrice: number | null; categoryId: string; subcategoryId: string | null;
  calories: number | null; portion: string; prepMinutes: number | null; spiceLevel: number; vegetarian: boolean; vegan: boolean; glutenFree: boolean; featured: boolean; isNew: boolean; popular: boolean; daily: boolean;
  active: boolean; inStock: boolean; tags: string[]; seoTitle: string; seoDescription: string; sortOrder: number; viewCount: number; updatedAt: string; images: { url: string; alt: string }[]; allergens: string[]; translations: Tr;
};
type Allergen = { id: string; key: string; nameTr: string; nameEn: string; nameDe: string; icon: string };

export function MenuAdmin({ categories, products, allergens }: { categories: Cat[]; products: Prod[]; allergens: Allergen[] }) {
  const [tab, setTab] = useState<"products" | "categories" | "order" | "allergens">("products");
  const [editProd, setEditProd] = useState<Prod | "new" | null>(null);
  const [editCat, setEditCat] = useState<Cat | "new" | null>(null);
  const [editAll, setEditAll] = useState<Allergen | "new" | null>(null);
  const { run } = useRun();
  const confirm = useConfirm();
  const router = useRouter();
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";
  const missingTr = (p: Prod) => !p.translations.en?.name || !p.translations.de?.name;

  const cols: Column<Prod>[] = [
    {
      key: "img", header: "", className: "w-14", csv: false,
      render: (p) => (p.images[0] ? <img src={p.images[0].url.replace(/\.webp$/, "_t.webp")} onError={(e) => ((e.target as HTMLImageElement).src = p.images[0].url)} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-cream text-charcoal/30"><ImageIcon size={16} /></span>),
    },
    {
      key: "name", header: "Ürün", sortable: true, value: (p) => p.name,
      render: (p) => (
        <div className="min-w-[180px]">
          <p className="font-semibold">{p.name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {p.featured && <Badge tone="gold">Öne çıkan</Badge>}
            {p.isNew && <Badge tone="green">Yeni</Badge>}
            {p.popular && <Badge tone="blue">Popüler</Badge>}
            {p.daily && <Badge tone="purple">Günlük</Badge>}
            {p.campaignPrice && <Badge tone="red">Kampanya</Badge>}
            {missingTr(p) && <Badge tone="gray">Çeviri eksik</Badge>}
          </div>
        </div>
      ),
    },
    { key: "cat", header: "Kategori", sortable: true, value: (p) => catName(p.categoryId), hideOnMobile: true },
    {
      key: "price", header: "Fiyat", sortable: true, value: (p) => p.price,
      render: (p) => (
        <input
          type="number" defaultValue={p.price} min={0} step="0.5" aria-label={`${p.name} fiyatı`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          onBlur={(e) => { const v = Number(e.target.value); if (v !== p.price && v >= 0) run(quickUpdateProduct(p.id, { price: v }), "Fiyat güncellendi"); }}
          className="h-9 w-24 rounded-lg border border-charcoal/12 px-2 text-sm tabular-nums focus:border-forest focus:outline-none"
        />
      ),
    },
    { key: "stock", header: "Stok", value: (p) => (p.inStock ? "Var" : "Tükendi"), render: (p) => <span onClick={(e) => e.stopPropagation()}><Toggle checked={p.inStock} onChange={(v) => run(quickUpdateProduct(p.id, { inStock: v }), v ? "Stokta" : "Tükendi olarak işaretlendi")} /></span> },
    { key: "active", header: "Aktif", value: (p) => (p.active ? "Aktif" : "Pasif"), render: (p) => <span onClick={(e) => e.stopPropagation()}><Toggle checked={p.active} onChange={(v) => run(quickUpdateProduct(p.id, { active: v }), v ? "Ürün yayında" : "Ürün gizlendi")} /></span> },
    { key: "views", header: "Görüntülenme", sortable: true, value: (p) => p.viewCount, hideOnMobile: true },
  ];

  return (
    <div>
      <PageHeader
        title="Menü"
        description={`${products.length} ürün · ${categories.length} kategori · ${products.filter((p) => !p.inStock).length} tükendi`}
        actions={
          <>
            <a href="/menu" target="_blank" className="inline-flex h-11 items-center gap-2 rounded-xl border border-charcoal/12 bg-white px-4 text-sm font-semibold"><Eye size={15} /> Menüyü önizle</a>
            {tab === "categories" ? <Button onClick={() => setEditCat("new")}><Plus size={16} /> Kategori</Button> : tab === "allergens" ? <Button onClick={() => setEditAll("new")}><Plus size={16} /> Alerjen</Button> : <Button onClick={() => setEditProd("new")}><Plus size={16} /> Ürün ekle</Button>}
          </>
        }
      />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "products", label: "Ürünler" }, { key: "categories", label: "Kategoriler" }, { key: "order", label: "Sıralama" }, { key: "allergens", label: "Alerjenler" }]} />

      {tab === "products" && (
        <DataTable
          rows={products}
          columns={cols}
          exportName="menu-urunler"
          searchKeys={(p) => `${p.name} ${p.description} ${p.tags.join(" ")} ${catName(p.categoryId)}`}
          onRowClick={(p) => setEditProd(p)}
          filters={[
            { key: "cat", label: "Kategori", options: categories.map((c) => ({ value: c.id, label: c.name })), match: (p, v) => p.categoryId === v || p.subcategoryId === v },
            {
              key: "st", label: "Durum",
              options: [{ value: "active", label: "Aktif" }, { value: "passive", label: "Pasif" }, { value: "out", label: "Tükendi" }, { value: "featured", label: "Öne çıkan" }, { value: "campaign", label: "Kampanyalı" }, { value: "tr", label: "Çeviri eksik" }],
              match: (p, v) => (v === "active" ? p.active : v === "passive" ? !p.active : v === "out" ? !p.inStock : v === "featured" ? p.featured : v === "campaign" ? !!p.campaignPrice : missingTr(p)),
            },
          ]}
          bulk={[
            { label: "Yayına al", run: (ids) => run(bulkUpdateProducts(ids, { active: true }), "Güncellendi") },
            { label: "Gizle", run: (ids) => run(bulkUpdateProducts(ids, { active: false }), "Güncellendi") },
            { label: "Tükendi", run: (ids) => run(bulkUpdateProducts(ids, { inStock: false }), "Güncellendi") },
            { label: "Stokta", run: (ids) => run(bulkUpdateProducts(ids, { inStock: true }), "Güncellendi") },
            { label: "Öne çıkar", run: (ids) => run(bulkUpdateProducts(ids, { featured: true }), "Güncellendi") },
            {
              label: "Fiyat % değiştir",
              run: async (ids) => {
                const v = prompt("Yüzde değişim (ör. 10 veya -5):");
                const n = Number(v);
                if (v && Number.isFinite(n) && n !== 0) await run(bulkUpdateProducts(ids, { priceChangePercent: n }), "Fiyatlar güncellendi");
              },
            },
            { label: "Sil", danger: true, run: async (ids) => { if (await confirm({ title: `${ids.length} ürün silinsin mi?`, text: "Bu işlem geri alınamaz. Geçmiş siparişlerdeki ürün adları korunur.", danger: true, confirm: "Sil" })) await run(deleteProducts(ids), "Silindi"); } },
          ]}
        />
      )}

      {tab === "categories" && <CategoryList categories={categories} onEdit={setEditCat} />}
      {tab === "order" && <OrderEditor categories={categories} products={products} />}
      {tab === "allergens" && (
        <DataTable
          rows={allergens}
          exportName="alerjenler"
          onRowClick={(a) => setEditAll(a)}
          columns={[
            { key: "icon", header: "", render: (a) => <span className="text-lg">{a.icon}</span>, csv: false },
            { key: "tr", header: "Türkçe", value: (a) => a.nameTr, sortable: true },
            { key: "en", header: "English", value: (a) => a.nameEn },
            { key: "de", header: "Deutsch", value: (a) => a.nameDe },
            { key: "n", header: "Ürün sayısı", value: (a) => products.filter((p) => p.allergens.includes(a.id)).length },
          ]}
        />
      )}

      {editProd && <ProductEditor prod={editProd === "new" ? null : editProd} categories={categories} allergens={allergens} onClose={() => setEditProd(null)} onSaved={() => { setEditProd(null); router.refresh(); }} />}
      {editCat && <CategoryEditor cat={editCat === "new" ? null : editCat} categories={categories} onClose={() => setEditCat(null)} />}
      {editAll && <AllergenEditor a={editAll === "new" ? null : editAll} onClose={() => setEditAll(null)} />}
    </div>
  );
}

function CategoryList({ categories, onEdit }: { categories: Cat[]; onEdit: (c: Cat) => void }) {
  const { run } = useRun();
  const confirm = useConfirm();
  const [list, setList] = useState(categories);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setList(categories); setDirty(false); }, [categories]);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    setList(n);
    setDirty(true);
  };
  return (
    <Card title="Kategoriler" actions={dirty && <Button size="sm" onClick={() => run(reorderCategories(list.map((c) => c.id)), "Sıralama kaydedildi").then(() => setDirty(false))}>Sıralamayı kaydet</Button>} pad={false}>
      <ul className="divide-y divide-charcoal/6">
        {list.map((c, i) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} className="rounded p-0.5 hover:bg-cream" aria-label="Yukarı"><ArrowUp size={14} /></button>
              <button onClick={() => move(i, 1)} className="rounded p-0.5 hover:bg-cream" aria-label="Aşağı"><ArrowDown size={14} /></button>
            </div>
            {c.image ? <img src={c.image} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <span className="h-11 w-11 rounded-lg bg-cream" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {c.parentId && <span className="text-charcoal/40">{categories.find((x) => x.id === c.parentId)?.name} › </span>}
                {c.name}
              </p>
              <p className="text-xs text-charcoal/50">
                /{c.slug} · {c.count} ürün {c.availableFrom && `· ${c.availableFrom}–${c.availableTo}`} {(!c.translations.en || !c.translations.de) && "· çeviri eksik"}
              </p>
            </div>
            {!c.active && <Badge>Pasif</Badge>}
            <Button size="sm" variant="ghost" onClick={() => onEdit(c)} aria-label="Düzenle"><Pencil size={14} /></Button>
            <Button size="sm" variant="ghost" onClick={async () => { if (await confirm({ title: `"${c.name}" silinsin mi?`, danger: true, confirm: "Sil" })) run(deleteCategory(c.id), "Kategori silindi"); }} aria-label="Sil"><Trash2 size={14} /></Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function OrderEditor({ categories, products }: { categories: Cat[]; products: Prod[] }) {
  const [cat, setCat] = useState(categories[0]?.id ?? "");
  const [list, setList] = useState<Prod[]>([]);
  const { run, pending } = useRun();
  useEffect(() => setList(products.filter((p) => p.categoryId === cat).sort((a, b) => a.sortOrder - b.sortOrder)), [cat, products]);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    setList(n);
  };
  return (
    <Card title="Ürün sıralaması" actions={<><select value={cat} onChange={(e) => setCat(e.target.value)} className={cn(inputCls, "w-56")}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><Button size="sm" loading={pending} onClick={() => run(reorderProducts(list.map((p) => p.id)), "Sıralama kaydedildi")}>Kaydet</Button></>} pad={false}>
      <ol className="divide-y divide-charcoal/6">
        {list.map((p, i) => (
          <li key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData("i", String(i))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const from = Number(e.dataTransfer.getData("i")); const n = [...list]; const [m] = n.splice(from, 1); n.splice(i, 0, m); setList(n); }} className="flex cursor-grab items-center gap-3 px-4 py-2.5 active:cursor-grabbing">
            <span className="w-6 text-xs tabular-nums text-charcoal/40">{i + 1}</span>
            {p.images[0] ? <img src={p.images[0].url} alt="" className="h-9 w-9 rounded-md object-cover" /> : <span className="h-9 w-9 rounded-md bg-cream" />}
            <span className="flex-1 text-sm font-medium">{p.name}</span>
            <button onClick={() => move(i, -1)} className="rounded p-1.5 hover:bg-cream" aria-label="Yukarı"><ArrowUp size={15} /></button>
            <button onClick={() => move(i, 1)} className="rounded p-1.5 hover:bg-cream" aria-label="Aşağı"><ArrowDown size={15} /></button>
          </li>
        ))}
        {!list.length && <li className="p-8 text-center text-sm text-charcoal/50">Bu kategoride ürün yok</li>}
      </ol>
      <p className="border-t border-charcoal/6 px-4 py-2 text-xs text-charcoal/50">İpucu: Masaüstünde satırları sürükleyip bırakabilirsiniz.</p>
    </Card>
  );
}

function CategoryEditor({ cat, categories, onClose }: { cat: Cat | null; categories: Cat[]; onClose: () => void }) {
  const [f, setF] = useState<Cat>(cat ?? { id: "", name: "", slug: "", description: "", image: "", parentId: null, active: true, availableFrom: "", availableTo: "", count: 0, translations: {} });
  const { run, pending } = useRun();
  const [err, setErr] = useState<Record<string, string>>({});
  const set = <K extends keyof Cat>(k: K, v: Cat[K]) => setF((s) => ({ ...s, [k]: v }));
  const setTr = (loc: string, k: "name" | "description", v: string) => setF((s) => ({ ...s, translations: { ...s.translations, [loc]: { ...(s.translations[loc] ?? { name: "", description: "" }), [k]: v } } }));
  async function save() {
    const r = await run(saveCategory({ ...f, id: f.id || undefined }), "Kategori kaydedildi");
    if (r.ok) onClose();
    else setErr(("fields" in r && r.fields) || {});
  }
  return (
    <Modal title={cat ? "Kategoriyi düzenle" : "Yeni kategori"} onClose={onClose} size="lg" footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={save} loading={pending}>Kaydet</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Kategori adı (TR) *" error={err.name}><input className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} /></F>
        <F label="Kısa ad (URL)" hint="Boş bırakılırsa addan üretilir"><input className={inputCls} value={f.slug} onChange={(e) => set("slug", e.target.value)} /></F>
        <F label="Üst kategori" hint="Alt kategori yapmak için seçin">
          <select className={inputCls} value={f.parentId ?? ""} onChange={(e) => set("parentId", e.target.value || null)}>
            <option value="">— Ana kategori —</option>
            {categories.filter((c) => c.id !== f.id && !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Servis başlangıç" hint="Ör. kahvaltı 08:30"><input type="time" className={inputCls} value={f.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} /></F>
          <F label="Servis bitiş"><input type="time" className={inputCls} value={f.availableTo} onChange={(e) => set("availableTo", e.target.value)} /></F>
        </div>
        <F label="Açıklama (TR)" className="sm:col-span-2"><textarea className={textareaCls} value={f.description} onChange={(e) => set("description", e.target.value)} /></F>
        {(["en", "de"] as const).map((loc) => (
          <div key={loc} className="space-y-2 rounded-xl bg-cream/50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-charcoal/60"><Languages size={13} /> {loc === "en" ? "English" : "Deutsch"}</p>
            <input className={inputCls} placeholder="Ad" value={f.translations[loc]?.name ?? ""} onChange={(e) => setTr(loc, "name", e.target.value)} />
            <input className={inputCls} placeholder="Açıklama" value={f.translations[loc]?.description ?? ""} onChange={(e) => setTr(loc, "description", e.target.value)} />
          </div>
        ))}
        <F label="Kategori görseli" className="sm:col-span-2"><ImageInput value={f.image} onChange={(v) => set("image", v)} /></F>
        <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Menüde göster" />
      </div>
    </Modal>
  );
}

function AllergenEditor({ a, onClose }: { a: Allergen | null; onClose: () => void }) {
  const [f, setF] = useState<Allergen>(a ?? { id: "", key: "", nameTr: "", nameEn: "", nameDe: "", icon: "" });
  const { run, pending } = useRun();
  const confirm = useConfirm();
  return (
    <Modal title={a ? "Alerjeni düzenle" : "Yeni alerjen"} onClose={onClose} footer={<>{a && <Button variant="danger" className="mr-auto" onClick={async () => { if (await confirm({ title: "Alerjen silinsin mi?", danger: true })) { const r = await run(deleteAllergen(a.id), "Silindi"); if (r.ok) onClose(); } }}>Sil</Button>}<Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const r = await run(saveAllergen({ ...f, id: f.id || undefined, key: f.key || f.nameTr }), "Kaydedildi"); if (r.ok) onClose(); }}>Kaydet</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Türkçe *"><input className={inputCls} value={f.nameTr} onChange={(e) => setF({ ...f, nameTr: e.target.value })} /></F>
        <F label="Simge (emoji)"><input className={inputCls} value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} /></F>
        <F label="English *"><input className={inputCls} value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} /></F>
        <F label="Deutsch *"><input className={inputCls} value={f.nameDe} onChange={(e) => setF({ ...f, nameDe: e.target.value })} /></F>
      </div>
    </Modal>
  );
}

const EMPTY: Prod = {
  id: "", name: "", slug: "", description: "", ingredients: "", price: 0, oldPrice: null, campaignPrice: null, categoryId: "", subcategoryId: null, calories: null, portion: "", prepMinutes: null, spiceLevel: 0,
  vegetarian: false, vegan: false, glutenFree: false, featured: false, isNew: true, popular: false, daily: false, active: true, inStock: true, tags: [], seoTitle: "", seoDescription: "", sortOrder: 0, viewCount: 0, updatedAt: "", images: [], allergens: [], translations: {},
};

function ProductEditor({ prod, categories, allergens, onClose, onSaved }: { prod: Prod | null; categories: Cat[]; allergens: Allergen[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Prod>(prod ?? { ...EMPTY, categoryId: categories.find((c) => !c.parentId)?.id ?? "" });
  const [lang, setLang] = useState<"tr" | "en" | "de">("tr");
  const [err, setErr] = useState<Record<string, string>>({});
  const [tag, setTag] = useState("");
  const [uploading, setUploading] = useState(false);
  const { run, pending } = useRun();
  const confirm = useConfirm();
  const toast = useToast();
  const set = <K extends keyof Prod>(k: K, v: Prod[K]) => setF((s) => ({ ...s, [k]: v }));
  const setTr = (k: "name" | "description" | "ingredients", v: string) => setF((s) => ({ ...s, translations: { ...s.translations, [lang]: { ...{ name: "", description: "", ingredients: "" }, ...(s.translations[lang] ?? {}), [k]: v } } }));
  const trv = (k: "name" | "description" | "ingredients") => (lang === "tr" ? f[k] : f.translations[lang]?.[k] ?? "");
  const subs = categories.filter((c) => c.parentId === f.categoryId);

  async function save() {
    const translations = Object.fromEntries((["en", "de"] as const).map((l) => [l, { name: f.translations[l]?.name ?? "", description: f.translations[l]?.description ?? "", ingredients: f.translations[l]?.ingredients ?? "" }]));
    const r = await run(saveProduct({ ...f, id: f.id || undefined, translations, oldPrice: f.oldPrice ?? "", campaignPrice: f.campaignPrice ?? "" }), "Ürün kaydedildi");
    if (r.ok) onSaved();
    else setErr(("fields" in r && r.fields) || {});
  }
  async function addImages(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 8)) {
        const u = await uploadFile(file);
        setF((s) => ({ ...s, images: [...s.images, { url: u.url, alt: s.name }] }));
      }
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  const flags: [keyof Prod, string][] = [["featured", "Öne çıkan"], ["isNew", "Yeni"], ["popular", "Popüler"], ["daily", "Günün ürünü"], ["vegetarian", "Vejetaryen"], ["vegan", "Vegan"], ["glutenFree", "Glutensiz"]];

  return (
    <Modal
      side
      title={prod ? `Düzenle: ${prod.name}` : "Yeni ürün"}
      onClose={onClose}
      footer={
        <>
          {prod && <Button variant="danger" className="mr-auto" onClick={async () => { if (await confirm({ title: "Ürün silinsin mi?", danger: true, confirm: "Sil" })) { const r = await run(deleteProducts([prod.id]), "Ürün silindi"); if (r.ok) onSaved(); } }}><Trash2 size={15} /></Button>}
          <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button onClick={save} loading={pending}>Kaydet</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-4 rounded-xl bg-cream/60 p-3">
          <Toggle checked={f.active} onChange={(v) => set("active", v)} label="Menüde göster" />
          <Toggle checked={f.inStock} onChange={(v) => set("inStock", v)} label="Stokta var" />
        </div>
        <Tabs value={lang} onChange={setLang} tabs={[{ key: "tr", label: "Türkçe" }, { key: "en", label: `English${f.translations.en?.name ? "" : " •"}` }, { key: "de", label: `Deutsch${f.translations.de?.name ? "" : " •"}` }]} />
        <F label={`Ürün adı${lang === "tr" ? " *" : ""}`} error={lang === "tr" ? err.name : undefined}>
          <input className={inputCls} value={trv("name")} onChange={(e) => (lang === "tr" ? set("name", e.target.value) : setTr("name", e.target.value))} placeholder={lang !== "tr" ? f.name : ""} />
        </F>
        <F label="Açıklama"><textarea className={textareaCls} value={trv("description")} onChange={(e) => (lang === "tr" ? set("description", e.target.value) : setTr("description", e.target.value))} placeholder={lang !== "tr" ? f.description : ""} /></F>
        <F label="İçerik / malzemeler"><textarea className={cn(textareaCls, "min-h-16")} value={trv("ingredients")} onChange={(e) => (lang === "tr" ? set("ingredients", e.target.value) : setTr("ingredients", e.target.value))} /></F>

        <div className="grid grid-cols-3 gap-3">
          <F label="Fiyat (₺) *" error={err.price}><input type="number" min={0} step="0.5" className={inputCls} value={f.price} onChange={(e) => set("price", Number(e.target.value))} /></F>
          <F label="Eski fiyat" hint="Üstü çizili"><input type="number" min={0} className={inputCls} value={f.oldPrice ?? ""} onChange={(e) => set("oldPrice", e.target.value === "" ? null : Number(e.target.value))} /></F>
          <F label="Kampanya fiyatı"><input type="number" min={0} className={inputCls} value={f.campaignPrice ?? ""} onChange={(e) => set("campaignPrice", e.target.value === "" ? null : Number(e.target.value))} /></F>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Kategori *" error={err.categoryId}>
            <select className={inputCls} value={f.categoryId} onChange={(e) => setF((s) => ({ ...s, categoryId: e.target.value, subcategoryId: null }))}>
              {categories.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
          <F label="Alt kategori">
            <select className={inputCls} value={f.subcategoryId ?? ""} onChange={(e) => set("subcategoryId", e.target.value || null)} disabled={!subs.length}>
              <option value="">{subs.length ? "— Yok —" : "Alt kategori yok"}</option>
              {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </F>
        </div>

        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-charcoal/75">Görseller (ilk görsel kapak)</p>
          <div className="flex flex-wrap gap-2">
            {f.images.map((im, i) => (
              <div key={im.url + i} className="group relative h-24 w-24 overflow-hidden rounded-xl">
                <img src={im.url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => i > 0 && setF((s) => { const n = [...s.images]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return { ...s, images: n }; })} className="rounded bg-white/90 p-1" aria-label="Öne al"><ArrowUp size={12} className="-rotate-90" /></button>
                  <button onClick={() => setF((s) => ({ ...s, images: s.images.filter((_, k) => k !== i) }))} className="rounded bg-white/90 p-1 text-red-600" aria-label="Kaldır"><X size={12} /></button>
                </div>
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-gold px-1 text-[9px] font-bold text-deep">KAPAK</span>}
              </div>
            ))}
            <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-charcoal/25 text-xs text-charcoal/50 hover:border-forest hover:text-forest">
              {uploading ? "Yükleniyor…" : <><Plus size={18} /> Ekle</>}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <F label="Gramaj / porsiyon"><input className={inputCls} value={f.portion} onChange={(e) => set("portion", e.target.value)} placeholder="250 g" /></F>
          <F label="Kalori (kcal)"><input type="number" min={0} className={inputCls} value={f.calories ?? ""} onChange={(e) => set("calories", e.target.value === "" ? null : Number(e.target.value))} /></F>
          <F label="Hazırlanma (dk)"><input type="number" min={0} className={inputCls} value={f.prepMinutes ?? ""} onChange={(e) => set("prepMinutes", e.target.value === "" ? null : Number(e.target.value))} /></F>
        </div>
        <F label="Acılık seviyesi">
          <div className="flex gap-2">{[0, 1, 2, 3].map((n) => <button key={n} type="button" onClick={() => set("spiceLevel", n)} className={cn("h-9 flex-1 rounded-lg border text-sm", f.spiceLevel === n ? "border-forest bg-forest text-cream" : "border-charcoal/12")}>{n === 0 ? "Yok" : "🌶".repeat(n)}</button>)}</div>
        </F>
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-charcoal/75">Etiketler & özellikler</p>
          <div className="flex flex-wrap gap-2">
            {flags.map(([k, l]) => (
              <button key={k} type="button" onClick={() => set(k, !f[k] as never)} className={cn("rounded-full border px-3 py-1.5 text-[13px]", f[k] ? "border-forest bg-forest text-cream" : "border-charcoal/12")}>{l}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {f.tags.map((t) => <span key={t} className="inline-flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-xs">#{t}<button onClick={() => set("tags", f.tags.filter((x) => x !== t))} aria-label="Kaldır"><X size={11} /></button></span>)}
            <input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tag.trim()) { e.preventDefault(); set("tags", [...new Set([...f.tags, tag.trim()])]); setTag(""); } }} placeholder="Etiket ekle + Enter" className="h-8 w-40 rounded-full border border-charcoal/12 px-3 text-xs" />
          </div>
        </div>
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-charcoal/75">Alerjenler</p>
          <div className="flex flex-wrap gap-2">
            {allergens.map((a) => (
              <button key={a.id} type="button" onClick={() => set("allergens", f.allergens.includes(a.id) ? f.allergens.filter((x) => x !== a.id) : [...f.allergens, a.id])} className={cn("rounded-full border px-3 py-1.5 text-[13px]", f.allergens.includes(a.id) ? "border-red-600 bg-red-50 text-red-800" : "border-charcoal/12")}>
                {a.icon} {a.nameTr}
              </button>
            ))}
          </div>
        </div>
        <details className="rounded-xl border border-charcoal/10 p-3">
          <summary className="cursor-pointer text-sm font-semibold">SEO</summary>
          <div className="mt-3 space-y-3">
            <F label="SEO başlığı"><input className={inputCls} value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} maxLength={120} /></F>
            <F label="SEO açıklaması"><textarea className={cn(textareaCls, "min-h-16")} value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} maxLength={300} /></F>
            <F label="Kısa ad (URL)" hint="/menu?urun=…"><input className={inputCls} value={f.slug} onChange={(e) => set("slug", e.target.value)} /></F>
          </div>
        </details>
        <p className="text-xs text-charcoal/50">Fiyat: {formatPrice(f.campaignPrice && f.campaignPrice < f.price ? f.campaignPrice : f.price)}{prod && ` · Son güncelleme ${fmtDT(prod.updatedAt)}`}</p>
      </div>
    </Modal>
  );
}
