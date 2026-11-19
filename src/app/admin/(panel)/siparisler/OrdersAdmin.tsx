"use client";
import { fmtDT } from "@/lib/format";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, StickyNote, Printer, ChefHat, BellRing, Check, X, Radio } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { Button, Modal, Badge, PageHeader, Tabs, Toggle, useRun, useConfirm } from "@/components/admin/ui";
import { DataTable } from "@/components/admin/DataTable";
import { ORDER_STATUS } from "@/components/admin/status";
import { setOrderStatus, setPayment, toggleOrdering } from "./actions";

type Order = {
  id: string; number: number; status: string; tableNumber: number | null; note: string | null; customerName: string | null; total: number; taxAmount: number; paymentStatus: string; paymentMethod: string | null;
  createdAt: string; updatedAt: string; items: { id: string; name: string; quantity: number; unitPrice: number; lineTotal: number; note: string | null }[];
};
const NEXT: Record<string, { to: string; label: string; icon: typeof Check } | undefined> = {
  new: { to: "preparing", label: "Hazırlamaya başla", icon: ChefHat },
  preparing: { to: "ready", label: "Hazır", icon: BellRing },
  ready: { to: "delivered", label: "Teslim edildi", icon: Check },
};
const mins = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

export function OrdersAdmin({ initial, canManage, canToggle, orderingEnabled, openId }: { initial: Order[]; canManage: boolean; canToggle: boolean; orderingEnabled: boolean; openId?: string }) {
  const [orders, setOrders] = useState(initial);
  const [tab, setTab] = useState<"live" | "list">("live");
  const [detail, setDetail] = useState<Order | null>(initial.find((o) => o.id === openId) ?? null);
  const [now, setNow] = useState<number | null>(null);
  const { run } = useRun();
  const confirm = useConfirm();
  const router = useRouter();

  const refresh = useCallback(async () => {
    const r = await fetch("/api/admin/orders", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const { orders: live } = (await r.json()) as { orders: Order[] };
    setOrders((prev) => {
      const map = new Map(prev.map((o) => [o.id, o]));
      live.forEach((o) => map.set(o.id, o));
      return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }, []);
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => { refresh(); setNow(Date.now()); }, 5000);
    return () => clearInterval(i);
  }, [refresh]);
  useEffect(() => setOrders((prev) => { const map = new Map(prev.map((o) => [o.id, o])); initial.forEach((o) => map.set(o.id, o)); return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }), [initial]);

  async function change(ids: string[], status: string) {
    setOrders((os) => os.map((o) => (ids.includes(o.id) ? { ...o, status } : o)));
    setDetail((d) => (d && ids.includes(d.id) ? { ...d, status } : d));
    await run(setOrderStatus(ids, status as never), `Durum: ${ORDER_STATUS[status].label}`);
    refresh();
  }

  function print(o: Order) {
    const w = window.open("", "_blank", "width=380,height=600");
    if (!w) return;
    const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
    w.document.write(`<html><head><title>#${o.number}</title><style>body{font-family:monospace;font-size:13px;padding:12px;width:280px}h1{font-size:18px;margin:0}hr{border:0;border-top:1px dashed #000}.r{display:flex;justify-content:space-between}</style></head><body><h1>Sipariş #${o.number}</h1><p>Masa ${o.tableNumber ?? "-"} · ${fmtDT(o.createdAt)}</p>${o.customerName ? `<p>${esc(o.customerName)}</p>` : ""}<hr/>${o.items.map((i) => `<div class="r"><span>${i.quantity}x ${esc(i.name)}</span><span>${i.lineTotal.toFixed(2)}</span></div>${i.note ? `<div>  » ${esc(i.note)}</div>` : ""}`).join("")}<hr/>${o.note ? `<p>NOT: ${esc(o.note)}</p><hr/>` : ""}<div class="r"><b>TOPLAM</b><b>${o.total.toFixed(2)} ₺</b></div><script>window.print()</script></body></html>`);
    w.document.close();
  }

  const active = orders.filter((o) => ["new", "preparing", "ready"].includes(o.status));
  const cols = (["new", "preparing", "ready"] as const).map((s) => ({ s, list: active.filter((o) => o.status === s).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }));

  return (
    <div>
      <PageHeader
        title="Siparişler"
        description="QR menü üzerinden gelen masa siparişleri — ekran 5 saniyede bir otomatik güncellenir."
        actions={
          canToggle ? (
            <div className="flex items-center gap-3 rounded-xl border border-charcoal/10 bg-white px-4 py-2">
              <Toggle checked={orderingEnabled} onChange={async (v) => { await run(toggleOrdering(v), v ? "QR sipariş açıldı" : "QR sipariş kapatıldı"); router.refresh(); }} label={orderingEnabled ? "QR sipariş açık" : "QR sipariş kapalı"} />
            </div>
          ) : (
            <Badge tone={orderingEnabled ? "green" : "gray"}>{orderingEnabled ? "QR sipariş açık" : "QR sipariş kapalı"}</Badge>
          )
        }
      />
      {!orderingEnabled && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">QR sipariş sistemi şu an kapalı. Misafirler menüyü görüntüleyebilir ancak sipariş gönderemez; “Hesap iste” butonu da gizlenir.</p>}
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "live", label: <span className="flex items-center gap-1.5"><Radio size={13} className="text-red-500" /> Canlı ekran ({active.length})</span> }, { key: "list", label: "Sipariş listesi" }]} />

      {tab === "live" && (
        <div className="grid gap-4 lg:grid-cols-3">
          {cols.map(({ s, list }) => (
            <section key={s} className="rounded-2xl bg-charcoal/[0.035] p-3">
              <h2 className="mb-3 flex items-center justify-between px-1 font-sans text-sm font-semibold tracking-normal">
                {ORDER_STATUS[s].label} <Badge tone={ORDER_STATUS[s].tone}>{list.length}</Badge>
              </h2>
              <div className="space-y-3">
                {list.length === 0 && <p className="py-10 text-center text-xs text-charcoal/40">Sipariş yok</p>}
                {list.map((o) => {
                  const m = now === null ? null : mins(o.createdAt, now);
                  const n = NEXT[o.status];
                  return (
                    <article key={o.id} className={cn("rounded-xl border bg-white p-4 shadow-sm", o.status === "new" ? "border-gold ring-2 ring-gold/25" : "border-charcoal/8")}>
                      <button className="w-full text-left" onClick={() => setDetail(o)}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-2xl font-bold">Masa {o.tableNumber ?? "-"}</p>
                            <p className="text-xs text-charcoal/50">#{o.number}{o.customerName && ` · ${o.customerName}`}</p>
                          </div>
                          <span className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold", m !== null && m >= 20 ? "bg-red-100 text-red-700" : m !== null && m >= 10 ? "bg-amber-100 text-amber-800" : "bg-charcoal/6")}><Clock size={12} /> {m === null ? "…" : `${m} dk`}</span>
                        </div>
                        <ul className="mt-3 space-y-1 text-sm">
                          {o.items.map((i) => (
                            <li key={i.id}>
                              <b>{i.quantity}×</b> {i.name}
                              {i.note && <span className="block pl-5 text-xs text-[#c0532f]">» {i.note}</span>}
                            </li>
                          ))}
                        </ul>
                        {o.note && <p className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><StickyNote size={13} className="shrink-0" /> {o.note}</p>}
                      </button>
                      {canManage && (
                        <div className="mt-3 flex gap-2">
                          {n && <Button size="sm" className="flex-1" onClick={() => change([o.id], n.to)}><n.icon size={14} /> {n.label}</Button>}
                          <Button size="sm" variant="ghost" onClick={() => print(o)} aria-label="Yazdır"><Printer size={14} /></Button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === "list" && (
        <DataTable
          rows={orders}
          exportName="siparisler"
          onRowClick={(o) => setDetail(o)}
          searchKeys={(o) => `${o.number} ${o.tableNumber} ${o.customerName ?? ""} ${o.items.map((i) => i.name).join(" ")}`}
          initialSort={{ key: "date", dir: "desc" }}
          filters={[
            { key: "s", label: "Durum", options: Object.entries(ORDER_STATUS).map(([value, v]) => ({ value, label: v.label })), match: (o, v) => o.status === v },
            { key: "p", label: "Ödeme", options: [{ value: "unpaid", label: "Ödenmedi" }, { value: "paid", label: "Ödendi" }], match: (o, v) => o.paymentStatus === v },
            { key: "d", label: "Tarih", options: [{ value: "today", label: "Bugün" }, { value: "7", label: "Son 7 gün" }, { value: "30", label: "Son 30 gün" }], match: (o, v) => (v === "today" ? new Date(o.createdAt).toDateString() === new Date().toDateString() : Date.now() - new Date(o.createdAt).getTime() < Number(v) * 864e5) },
          ]}
          bulk={canManage ? [
            { label: "Teslim edildi", run: (ids) => change(ids, "delivered") },
            { label: "İptal et", danger: true, run: async (ids) => { if (await confirm({ title: `${ids.length} sipariş iptal edilsin mi?`, danger: true })) await change(ids, "cancelled"); } },
          ] : []}
          columns={[
            { key: "no", header: "No", sortable: true, value: (o) => o.number, render: (o) => <b>#{o.number}</b> },
            { key: "table", header: "Masa", sortable: true, value: (o) => o.tableNumber ?? 0 },
            { key: "items", header: "Ürünler", value: (o) => o.items.map((i) => `${i.quantity}x ${i.name}`).join(", "), render: (o) => <span className="line-clamp-1 max-w-xs text-charcoal/70">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span>, hideOnMobile: true },
            { key: "total", header: "Tutar", sortable: true, value: (o) => o.total, render: (o) => formatPrice(o.total) },
            { key: "status", header: "Durum", value: (o) => ORDER_STATUS[o.status]?.label, render: (o) => <Badge tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label}</Badge> },
            { key: "pay", header: "Ödeme", value: (o) => (o.paymentStatus === "paid" ? "Ödendi" : "Ödenmedi"), render: (o) => <Badge tone={o.paymentStatus === "paid" ? "green" : "gray"}>{o.paymentStatus === "paid" ? "Ödendi" : "Ödenmedi"}</Badge>, hideOnMobile: true },
            { key: "date", header: "Tarih", sortable: true, value: (o) => o.createdAt, render: (o) => fmtDT(o.createdAt, { dateStyle: "short", timeStyle: "short" }) },
          ]}
        />
      )}

      {detail && (
        <Modal
          title={`Sipariş #${detail.number} · Masa ${detail.tableNumber ?? "-"}`}
          onClose={() => setDetail(null)}
          footer={
            canManage ? (
              <>
                {!["cancelled", "delivered"].includes(detail.status) && <Button variant="danger" className="mr-auto" onClick={async () => { if (await confirm({ title: "Sipariş iptal edilsin mi?", danger: true })) change([detail.id], "cancelled"); }}><X size={14} /> İptal</Button>}
                <Button variant="ghost" onClick={() => print(detail)}><Printer size={14} /> Yazdır</Button>
                {NEXT[detail.status] && <Button onClick={() => change([detail.id], NEXT[detail.status]!.to)}>{NEXT[detail.status]!.label}</Button>}
              </>
            ) : undefined
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={ORDER_STATUS[detail.status]?.tone}>{ORDER_STATUS[detail.status]?.label}</Badge>
              <span className="text-sm text-charcoal/60">{fmtDT(detail.createdAt)}</span>
              {detail.customerName && <span className="text-sm">· {detail.customerName}</span>}
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(ORDER_STATUS).map(([k, v]) => (
                  <button key={k} onClick={() => change([detail.id], k)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", detail.status === k ? "border-forest bg-forest text-cream" : "border-charcoal/12")}>{v.label}</button>
                ))}
              </div>
            )}
            <table className="w-full text-sm">
              <tbody>
                {detail.items.map((i) => (
                  <tr key={i.id} className="border-b border-charcoal/6">
                    <td className="py-2"><b>{i.quantity}×</b> {i.name}{i.note && <span className="block text-xs text-[#c0532f]">» {i.note}</span>}</td>
                    <td className="py-2 text-right text-charcoal/60">{formatPrice(i.unitPrice)}</td>
                    <td className="py-2 text-right font-semibold">{formatPrice(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={2} className="pt-3 text-right text-xs text-charcoal/55">KDV</td><td className="pt-3 text-right text-xs">{formatPrice(detail.taxAmount)}</td></tr>
                <tr><td colSpan={2} className="text-right font-semibold">Toplam</td><td className="text-right text-lg font-bold">{formatPrice(detail.total)}</td></tr>
              </tfoot>
            </table>
            {detail.note && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Not: {detail.note}</p>}
            {canManage && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-cream/60 p-3 text-sm">
                <span className="font-semibold">Ödeme:</span>
                {detail.paymentStatus === "paid" ? (
                  <>
                    <Badge tone="green">Ödendi{detail.paymentMethod === "cash" ? " · Nakit" : detail.paymentMethod === "card_at_table" ? " · Kart" : ""}</Badge>
                    <Button size="sm" variant="ghost" onClick={async () => { await run(setPayment(detail.id, "unpaid"), "Güncellendi"); setDetail({ ...detail, paymentStatus: "unpaid" }); }}>Geri al</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="soft" onClick={async () => { await run(setPayment(detail.id, "paid", "cash"), "Ödendi"); setDetail({ ...detail, paymentStatus: "paid", paymentMethod: "cash" }); }}>Nakit ödendi</Button>
                    <Button size="sm" variant="soft" onClick={async () => { await run(setPayment(detail.id, "paid", "card_at_table"), "Ödendi"); setDetail({ ...detail, paymentStatus: "paid", paymentMethod: "card_at_table" }); }}>Kart ile ödendi</Button>
                  </>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
