"use client";
import { fmtDT } from "@/lib/format";
import { useState } from "react";
import { Plus, Download, Printer, RefreshCw, ExternalLink, Copy } from "lucide-react";
import { cn, slugify } from "@/lib/utils";
import { Button, Modal, F, inputCls, Toggle, Badge, PageHeader, Tabs, Card, useRun, useConfirm, useToast } from "@/components/admin/ui";
import { DataTable } from "@/components/admin/DataTable";
import { ColumnChart, BarList } from "@/components/admin/Charts";
import { downloadQrPdf } from "@/components/admin/qrPdf";
import { QrImage, downloadQr } from "@/components/admin/QrImage";
import { createTables, saveTable, deleteTables, rotateTableToken, saveQr, toggleQr, deleteQrs } from "./actions";

type Table = { id: string; number: number; name: string; area: string; capacity: number; active: boolean; orders: number };
type Code = { id: string; code: string; url: string; label: string; type: string; targetPath: string; active: boolean; scanCount: number; lastScanAt: string | null; tableId: string | null; tableNumber: number | null; area: string; period: number };

const TYPE: Record<string, string> = { table: "Masa", general: "Genel menü", custom: "Özel" };
const DEVICES: Record<string, string> = { mobile: "Mobil", tablet: "Tablet", desktop: "Masaüstü" };

export function QrAdmin({ tables, codes, series, devices }: { tables: Table[]; codes: Code[]; series: { label: string; qr: number }[]; devices: { name: string; value: number }[] }) {
  const [tab, setTab] = useState<"codes" | "tables" | "stats">("codes");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editT, setEditT] = useState<Table | null>(null);
  const [editQ, setEditQ] = useState<Code | "new" | null>(null);
  const [preview, setPreview] = useState<Code | null>(null);
  const { run } = useRun();
  const confirm = useConfirm();
  const toast = useToast();
  const [pdfBusy, setPdfBusy] = useState(false);
  async function pdf(list: Code[], name: string) {
    if (!list.length) return toast("error", "Yazdırılacak QR kod yok");
    setPdfBusy(true);
    try {
      await downloadQrPdf(list.map((c) => ({ id: c.id, url: c.url, title: c.label, subtitle: c.area ? `${c.area} · ${c.url}` : c.url })), name);
    } catch {
      toast("error", "PDF oluşturulamadı");
    } finally {
      setPdfBusy(false);
    }
  }
  const dl = (c: Code, f: "png" | "svg") => downloadQr(c.url, `qr-${slugify(c.label) || c.code}`, f).catch(() => toast("error", "QR indirilemedi"));
  const total = codes.reduce((a, c) => a + c.scanCount, 0);
  const period = codes.reduce((a, c) => a + c.period, 0);
  const top = [...codes].sort((a, b) => b.scanCount - a.scanCount)[0];

  return (
    <div>
      <PageHeader
        title="QR Kodlar & Masalar"
        description={`${tables.length} masa · ${codes.length} QR kod · toplam ${total.toLocaleString("tr-TR")} tarama`}
        actions={
          <>
            <Button variant="ghost" loading={pdfBusy} onClick={() => pdf(codes.filter((c) => c.active), "qr-kodlar.pdf")}><Printer size={15} /> Tümünü yazdır (PDF)</Button>
            <Button variant="ghost" onClick={() => setEditQ("new")}><Plus size={15} /> Genel / özel QR</Button>
            <Button onClick={() => setBulkOpen(true)}><Plus size={15} /> Masa ekle</Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Toplam tarama", total], ["Son 30 gün", period], ["Aktif QR", codes.filter((c) => c.active).length], ["En çok kullanılan", top ? `${top.label} (${top.scanCount})` : "—"]].map(([l, v]) => (
          <div key={String(l)} className="rounded-2xl border border-charcoal/8 bg-white p-4">
            <p className="text-xs text-charcoal/55">{l}</p>
            <p className="mt-2 truncate text-xl font-semibold">{typeof v === "number" ? v.toLocaleString("tr-TR") : v}</p>
          </div>
        ))}
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "codes", label: "QR listesi" }, { key: "tables", label: "Masa yönetimi" }, { key: "stats", label: "Tarama istatistikleri" }]} />

      {tab === "codes" && (
        <DataTable
          rows={codes}
          exportName="qr-kodlar"
          searchKeys={(c) => `${c.label} ${c.code} ${c.area}`}
          onRowClick={(c) => setPreview(c)}
          filters={[{ key: "t", label: "Tür", options: Object.entries(TYPE).map(([value, label]) => ({ value, label })), match: (c, v) => c.type === v }, { key: "a", label: "Durum", options: [{ value: "1", label: "Aktif" }, { value: "0", label: "Pasif" }], match: (c, v) => c.active === (v === "1") }]}
          bulk={[
            { label: "PDF yazdır", run: (ids) => pdf(codes.filter((c) => ids.includes(c.id)), "qr-secili.pdf") },
            { label: "Aktif yap", run: (ids) => run(toggleQr(ids, true), "Güncellendi") },
            { label: "Pasif yap", run: (ids) => run(toggleQr(ids, false), "Güncellendi") },
            { label: "Sil", danger: true, run: async (ids) => { if (await confirm({ title: `${ids.length} QR kod silinsin mi?`, text: "Basılı QR kodlar artık çalışmaz (menüye yönlenir).", danger: true })) await run(deleteQrs(ids), "Silindi"); } },
          ]}
          columns={[
            { key: "qr", header: "", csv: false, render: (c) => <QrImage url={c.url} size={96} className="h-12 w-12 rounded border border-charcoal/10" /> },
            { key: "label", header: "Etiket", sortable: true, value: (c) => c.label, render: (c) => <div><p className="font-semibold">{c.label}</p><p className="text-xs text-charcoal/50">{c.area || c.targetPath}</p></div> },
            { key: "type", header: "Tür", value: (c) => TYPE[c.type], render: (c) => <Badge tone={c.type === "table" ? "green" : "gold"}>{TYPE[c.type]}</Badge> },
            { key: "url", header: "Bağlantı", value: (c) => c.url, hideOnMobile: true, render: (c) => <code className="text-xs text-charcoal/60">/q/{c.code}</code> },
            { key: "scans", header: "Tarama", sortable: true, value: (c) => c.scanCount, render: (c) => <span className="tabular-nums"><b>{c.scanCount}</b> <span className="text-xs text-charcoal/45">({c.period} / 30g)</span></span> },
            { key: "last", header: "Son tarama", sortable: true, hideOnMobile: true, value: (c) => c.lastScanAt ?? "", render: (c) => (c.lastScanAt ? fmtDT(c.lastScanAt) : "—") },
            { key: "active", header: "Aktif", value: (c) => (c.active ? "Evet" : "Hayır"), render: (c) => <span onClick={(e) => e.stopPropagation()}><Toggle checked={c.active} onChange={(v) => run(toggleQr([c.id], v), v ? "QR aktif" : "QR pasif")} /></span> },
            {
              key: "dl", header: "İndir", csv: false,
              render: (c) => (
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  {(["png", "svg"] as const).map((f) => <button key={f} onClick={() => dl(c, f)} className="rounded-md border border-charcoal/12 px-2 py-1 text-[11px] font-semibold uppercase hover:bg-cream">{f}</button>)}
                  <button onClick={() => pdf([c], `qr-${c.code}.pdf`)} className="rounded-md border border-charcoal/12 px-2 py-1 text-[11px] font-semibold uppercase hover:bg-cream">pdf</button>
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "tables" && (
        <DataTable
          rows={tables}
          exportName="masalar"
          onRowClick={(t) => setEditT(t)}
          searchKeys={(t) => `${t.number} ${t.name} ${t.area}`}
          filters={[{ key: "area", label: "Alan", options: [...new Set(tables.map((t) => t.area).filter(Boolean))].map((a) => ({ value: a, label: a })), match: (t, v) => t.area === v }]}
          bulk={[{ label: "Sil", danger: true, run: async (ids) => { if (await confirm({ title: `${ids.length} masa silinsin mi?`, text: "Masaya bağlı QR kodları da silinir.", danger: true })) await run(deleteTables(ids), "Silindi"); } }]}
          columns={[
            { key: "n", header: "No", sortable: true, value: (t) => t.number, render: (t) => <b>{t.number}</b> },
            { key: "name", header: "Ad", value: (t) => t.name },
            { key: "area", header: "Alan", value: (t) => t.area, sortable: true },
            { key: "cap", header: "Kapasite", value: (t) => t.capacity, sortable: true },
            { key: "orders", header: "Sipariş", value: (t) => t.orders, sortable: true, hideOnMobile: true },
            { key: "a", header: "Durum", value: (t) => (t.active ? "Aktif" : "Pasif"), render: (t) => <Badge tone={t.active ? "green" : "gray"}>{t.active ? "Aktif" : "Pasif"}</Badge> },
            { key: "menu", header: "", csv: false, render: (t) => { const c = codes.find((x) => x.tableId === t.id); return c ? <a onClick={(e) => e.stopPropagation()} href={c.url} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-forest">Test et <ExternalLink size={12} /></a> : null; } },
          ]}
        />
      )}

      {tab === "stats" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Günlük QR taramaları (30 gün)" className="lg:col-span-2"><ColumnChart data={series} dataKey="qr" name="Tarama" /></Card>
          <Card title="Cihaz türü"><BarList items={devices.map((d) => ({ name: DEVICES[d.name] ?? d.name, value: d.value }))} /></Card>
          <Card title="QR bazında kullanım (son 30 gün)" className="lg:col-span-3"><BarList items={codes.filter((c) => c.period > 0).sort((a, b) => b.period - a.period).map((c) => ({ name: c.label, value: c.period }))} empty="Son 30 günde tarama yok" /></Card>
        </div>
      )}

      {bulkOpen && <BulkTables onClose={() => setBulkOpen(false)} next={(tables.at(-1)?.number ?? 0) + 1} />}
      {editT && <TableEditor t={editT} onClose={() => setEditT(null)} />}
      {editQ && <QrEditor q={editQ === "new" ? null : editQ} tables={tables} onClose={() => setEditQ(null)} />}
      {preview && (
        <Modal title={preview.label} onClose={() => setPreview(null)} footer={<><Button variant="ghost" onClick={() => { setEditQ(preview); setPreview(null); }}>Düzenle</Button>{(["png", "svg"] as const).map((f) => <button key={f} onClick={() => dl(preview, f)} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-forest px-4 text-sm font-semibold uppercase text-cream"><Download size={14} /> {f}</button>)}<Button loading={pdfBusy} onClick={() => pdf([preview], `qr-${preview.code}.pdf`)}><Download size={14} /> PDF</Button></>}>
          <div className="flex flex-col items-center gap-4 text-center">
            <QrImage url={preview.url} size={448} alt="QR kod" className="h-56 w-56" />
            <div className="flex items-center gap-2 rounded-lg bg-cream px-3 py-2 text-sm">
              <code>{preview.url}</code>
              <button onClick={() => { navigator.clipboard.writeText(preview.url); toast("ok", "Bağlantı kopyalandı"); }} aria-label="Kopyala"><Copy size={14} /></button>
            </div>
            <p className="text-sm text-charcoal/60">{preview.scanCount} tarama · {preview.active ? "Aktif" : "Pasif"} · Hedef: {preview.targetPath}{preview.tableNumber ? `?table=${preview.tableNumber}` : ""}</p>
            {preview.tableId && (
              <Button variant="ghost" size="sm" onClick={async () => { if (await confirm({ title: "Sipariş anahtarı yenilensin mi?", text: "QR kod aynı kalır; yalnızca masa sipariş doğrulaması yenilenir. Açık menü sekmelerinden sipariş için QR'ın yeniden okutulması gerekir." })) run(rotateTableToken(preview.tableId!), "Anahtar yenilendi"); }}>
                <RefreshCw size={14} /> Sipariş anahtarını yenile
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function BulkTables({ onClose, next }: { onClose: () => void; next: number }) {
  const [f, setF] = useState({ from: next, to: next, area: "Bahçe", capacity: 4 });
  const { run, pending } = useRun();
  return (
    <Modal title="Masa oluştur" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const r = await run(createTables(f)); if (r.ok) onClose(); }}>Oluştur</Button></>}>
      <p className="mb-4 text-sm text-charcoal/60">Her masa için otomatik olarak benzersiz bir QR kod oluşturulur.</p>
      <div className="grid grid-cols-2 gap-3">
        <F label="Başlangıç no"><input type="number" min={1} className={inputCls} value={f.from} onChange={(e) => setF({ ...f, from: +e.target.value, to: Math.max(+e.target.value, f.to) })} /></F>
        <F label="Bitiş no"><input type="number" min={1} className={inputCls} value={f.to} onChange={(e) => setF({ ...f, to: +e.target.value })} /></F>
        <F label="Alan"><input className={inputCls} value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></F>
        <F label="Kapasite"><input type="number" min={1} className={inputCls} value={f.capacity} onChange={(e) => setF({ ...f, capacity: +e.target.value })} /></F>
      </div>
      <p className="mt-3 text-xs text-charcoal/50">{Math.max(0, f.to - f.from + 1)} masa oluşturulacak (var olan numaralar atlanır).</p>
    </Modal>
  );
}

function TableEditor({ t, onClose }: { t: Table; onClose: () => void }) {
  const [f, setF] = useState(t);
  const { run, pending } = useRun();
  return (
    <Modal title={`Masa ${t.number}`} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const r = await run(saveTable(f), "Masa kaydedildi"); if (r.ok) onClose(); }}>Kaydet</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <F label="Masa no"><input type="number" className={inputCls} value={f.number} onChange={(e) => setF({ ...f, number: +e.target.value })} /></F>
        <F label="Görünen ad"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></F>
        <F label="Alan"><input className={inputCls} value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></F>
        <F label="Kapasite"><input type="number" className={inputCls} value={f.capacity} onChange={(e) => setF({ ...f, capacity: +e.target.value })} /></F>
        <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Aktif (pasif masada QR genel menüye yönlenir)" />
      </div>
    </Modal>
  );
}

function QrEditor({ q, tables, onClose }: { q: Code | null; tables: Table[]; onClose: () => void }) {
  const [f, setF] = useState({ id: q?.id, label: q?.label ?? "", type: q?.type ?? "general", targetPath: q?.targetPath ?? "/menu", active: q?.active ?? true, tableId: q?.tableId ?? null });
  const { run, pending } = useRun();
  return (
    <Modal title={q ? "QR kodu düzenle" : "Yeni QR kod"} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const r = await run(saveQr(f), "QR kaydedildi"); if (r.ok) onClose(); }}>Kaydet</Button></>}>
      <div className="grid gap-3">
        <F label="Etiket"><input className={inputCls} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Ör. Giriş kapısı menü" /></F>
        <F label="Tür">
          <select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="general">Genel menü</option>
            <option value="custom">Özel hedef</option>
            <option value="table">Masa</option>
          </select>
        </F>
        {f.type === "table" && (
          <F label="Masa">
            <select className={inputCls} value={f.tableId ?? ""} onChange={(e) => setF({ ...f, tableId: e.target.value })}>
              <option value="">Seçin</option>
              {tables.map((t) => <option key={t.id} value={t.id}>Masa {t.number}</option>)}
            </select>
          </F>
        )}
        <F label="Hedef sayfa" hint="Ör. /menu, /menu#tatlilar, /rezervasyon, /kampanyalar"><input className={cn(inputCls)} value={f.targetPath} onChange={(e) => setF({ ...f, targetPath: e.target.value })} /></F>
        <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Aktif" />
        <p className="text-xs text-charcoal/50">QR kodun içindeki kısa bağlantı sabittir; hedefi değiştirmek basılı kodları yeniden yazdırmayı gerektirmez.</p>
      </div>
    </Modal>
  );
}
