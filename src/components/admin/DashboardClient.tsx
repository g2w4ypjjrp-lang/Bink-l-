"use client";
import { fmtD, fmtT, istanbulHour } from "@/lib/format";
import Link from "next/link";
import { useState } from "react";
import { Users, QrCode, BookOpen, CalendarDays, CalendarClock, PartyPopper, MessageSquare, ClipboardList, Wallet, Settings2, ArrowUp, ArrowDown, Eye, EyeOff, Check, ShieldAlert } from "lucide-react";
import { cn, formatPrice, formatDateTR } from "@/lib/utils";
import { saveDashboardPrefs } from "@/app/admin/(panel)/actions";
import { Card, Badge, Button, Tabs, useToast } from "./ui";
import { SeriesChart, ColumnChart, BarList } from "./Charts";
import { RES_STATUS, ORDER_STATUS } from "./status";

type Point = { label: string; visitors: number; views: number; menu: number; qr: number };
type Props = {
  userName: string; denied: boolean; prefs: { hidden: string[]; order: string[] };
  perms: { analytics: boolean; reservations: boolean; orders: boolean; events: boolean; messages: boolean; qr: boolean };
  kpis: Record<string, number>;
  series: { daily: Point[]; weekly: Point[]; monthly: Point[] };
  topProducts: { id: string; name: string; count: number }[];
  topCats: { id: string; name: string; count: number }[];
  qr: { id: string; label: string; period: number; total: number }[];
  ordered: { name: string; count: number }[];
  recentRes: { id: string; name: string; guests: number; date: string; time: string; status: string }[];
  recentOrders: { id: string; number: number; table: number | null; status: string; total: number; items: number; at: string }[];
};

const WIDGETS = [
  { key: "kpis", label: "Özet kartları" },
  { key: "traffic", label: "Trafik grafiği", perm: "analytics" },
  { key: "qr", label: "QR kullanımı", perm: "qr" },
  { key: "upcoming", label: "Yaklaşan rezervasyonlar", perm: "reservations" },
  { key: "orders", label: "Son siparişler", perm: "orders" },
  { key: "topProducts", label: "En çok görüntülenen ürünler", perm: "analytics" },
  { key: "topCats", label: "En çok görüntülenen kategoriler", perm: "analytics" },
  { key: "ordered", label: "En çok sipariş edilenler", perm: "orders" },
] as const;

export function DashboardClient(p: Props) {
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [hidden, setHidden] = useState<string[]>(p.prefs.hidden);
  const [order, setOrder] = useState<string[]>(() => {
    const keys = WIDGETS.map((w) => w.key as string);
    return [...p.prefs.order.filter((k) => keys.includes(k)), ...keys.filter((k) => !p.prefs.order.includes(k))];
  });
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const allowed = (k: string) => {
    const w = WIDGETS.find((x) => x.key === k);
    return !w || !("perm" in w) || p.perms[w.perm as keyof Props["perms"]];
  };
  const k = p.kpis;
  const hour = istanbulHour();
  const greet = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  const kpiCards = [
    p.perms.analytics && { label: "Bugünkü ziyaretçi", value: k.visitorsToday, sub: `Bu ay ${k.visitorsMonth.toLocaleString("tr-TR")}`, icon: Users, href: "/admin/analitik" },
    { label: "QR taramaları (bugün)", value: k.qrToday, sub: `Bu ay ${k.qrMonth}`, icon: QrCode, href: "/admin/qr" },
    { label: "Menü görüntüleme (bugün)", value: k.menuToday, sub: `Bu ay ${k.menuMonth}`, icon: BookOpen, href: "/admin/analitik" },
    p.perms.reservations && { label: "Bugünkü rezervasyon", value: k.resToday, sub: `7 gün içinde ${k.resUpcoming}`, icon: CalendarDays, href: "/admin/rezervasyonlar?view=day" },
    p.perms.reservations && { label: "Onay bekleyen", value: k.resPending, sub: "Yeni rezervasyon talebi", icon: CalendarClock, href: "/admin/rezervasyonlar?status=pending", alert: k.resPending > 0 },
    p.perms.events && { label: "Organizasyon başvurusu", value: k.eventsNew, sub: "Yeni başvuru", icon: PartyPopper, href: "/admin/organizasyonlar", alert: k.eventsNew > 0 },
    p.perms.messages && { label: "Okunmamış mesaj", value: k.msgsUnread, sub: "İletişim formu", icon: MessageSquare, href: "/admin/mesajlar", alert: k.msgsUnread > 0 },
    p.perms.orders && { label: "Bugünkü sipariş", value: k.ordersToday, sub: `${k.ordersActive} aktif`, icon: ClipboardList, href: "/admin/siparisler" },
    p.perms.orders && { label: "Bugünkü QR sipariş cirosu", value: formatPrice(k.revenueToday), sub: "İptaller hariç", icon: Wallet, href: "/admin/siparisler" },
  ].filter(Boolean) as { label: string; value: number | string; sub: string; icon: typeof Users; href: string; alert?: boolean }[];

  const blocks: Record<string, React.ReactNode> = {
    kpis: (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {kpiCards.map((c) => (
          <Link key={c.label} href={c.href} className={cn("rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5", c.alert ? "border-gold/60" : "border-charcoal/8")}>
            <div className="flex items-start justify-between">
              <span className="text-[12.5px] font-medium text-charcoal/60">{c.label}</span>
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", c.alert ? "bg-gold/20 text-gold-dark" : "bg-forest/8 text-forest")}>
                <c.icon size={16} />
              </span>
            </div>
            <p className="mt-3 text-[1.85rem] font-semibold leading-none tracking-tight text-charcoal tabular-nums">{typeof c.value === "number" ? c.value.toLocaleString("tr-TR") : c.value}</p>
            <p className="mt-1.5 text-[11.5px] text-charcoal/50">{c.sub}</p>
          </Link>
        ))}
      </div>
    ),
    traffic: (
      <Card title="Ziyaretçi trafiği" actions={<Tabs tabs={[{ key: "daily", label: "Günlük" }, { key: "weekly", label: "Haftalık" }, { key: "monthly", label: "Aylık" }]} value={range} onChange={setRange} />}>
        <SeriesChart data={p.series[range]} series={[{ key: "visitors", name: "Ziyaretçi" }, { key: "menu", name: "Menü görüntüleme" }]} />
      </Card>
    ),
    qr: (
      <Card title="QR kullanımı (son 30 gün)" actions={<Link href="/admin/qr" className="text-xs font-semibold text-forest">Yönet →</Link>}>
        <ColumnChart data={p.series.daily} dataKey="qr" name="QR tarama" height={180} />
        <div className="mt-4">
          <BarList items={p.qr.filter((q) => q.period > 0).slice(0, 6).map((q) => ({ name: q.label, value: q.period }))} empty="Son 30 günde QR taraması yok" />
        </div>
      </Card>
    ),
    upcoming: (
      <Card title="Yaklaşan rezervasyonlar" actions={<Link href="/admin/rezervasyonlar" className="text-xs font-semibold text-forest">Tümü →</Link>} pad={false}>
        {p.recentRes.length === 0 ? (
          <p className="p-8 text-center text-sm text-charcoal/45">Yaklaşan rezervasyon yok</p>
        ) : (
          <ul className="divide-y divide-charcoal/6">
            {p.recentRes.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/rezervasyonlar?id=${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-cream/40">
                  <span>
                    <span className="block text-sm font-semibold">{r.name}</span>
                    <span className="text-xs text-charcoal/55">
                      {formatDateTR(r.date, { day: "numeric", month: "short", weekday: "short" })} · {r.time} · {r.guests} kişi
                    </span>
                  </span>
                  <Badge tone={RES_STATUS[r.status]?.tone}>{RES_STATUS[r.status]?.label}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    ),
    orders: (
      <Card title="Son siparişler" actions={<Link href="/admin/siparisler" className="text-xs font-semibold text-forest">Canlı ekran →</Link>} pad={false}>
        {p.recentOrders.length === 0 ? (
          <p className="p-8 text-center text-sm text-charcoal/45">Henüz sipariş yok</p>
        ) : (
          <ul className="divide-y divide-charcoal/6">
            {p.recentOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/siparisler?id=${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-cream/40">
                  <span>
                    <span className="block text-sm font-semibold">
                      #{o.number} · Masa {o.table ?? "-"}
                    </span>
                    <span className="text-xs text-charcoal/55">
                      {o.items} kalem · {formatPrice(o.total)} · {fmtT(o.at, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  <Badge tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    ),
    topProducts: (
      <Card title="En çok görüntülenen ürünler (30 gün)">
        <BarList items={p.topProducts.map((x) => ({ name: x.name, value: x.count }))} />
      </Card>
    ),
    topCats: (
      <Card title="En çok görüntülenen kategoriler (30 gün)">
        <BarList items={p.topCats.map((x) => ({ name: x.name, value: x.count }))} />
      </Card>
    ),
    ordered: (
      <Card title="En çok sipariş edilenler (30 gün)">
        <BarList items={p.ordered.map((x) => ({ name: x.name, value: x.count }))} />
      </Card>
    ),
  };
  const wide = new Set(["kpis", "traffic"]);
  const visibleKeys = order.filter((key) => allowed(key) && (edit || !hidden.includes(key)));

  async function save() {
    const r = await saveDashboardPrefs({ hidden, order });
    toast(r.ok ? "ok" : "error", r.ok ? "Dashboard düzeni kaydedildi" : "Kaydedilemedi");
    setEdit(false);
  }
  const move = (key: string, d: -1 | 1) =>
    setOrder((o) => {
      const i = o.indexOf(key);
      const j = i + d;
      if (j < 0 || j >= o.length) return o;
      const n = [...o];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <div>
      {p.denied && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert size={16} /> Bu sayfayı görüntüleme yetkiniz yok.
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-charcoal/55">{fmtD(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="font-display text-[2.2rem] leading-tight text-forest">
            {greet}, {p.userName.split(" ")[0]}
          </h1>
        </div>
        {edit ? (
          <Button onClick={save}>
            <Check size={15} /> Düzeni kaydet
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => setEdit(true)}>
            <Settings2 size={15} /> Özelleştir
          </Button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleKeys.map((key) => (
          <div key={key} className={cn(wide.has(key) && "lg:col-span-2", edit && "relative rounded-2xl ring-2 ring-dashed ring-gold/50 ring-offset-4 ring-offset-[#f4f2ec]", edit && hidden.includes(key) && "opacity-40")}>
            {edit && (
              <div className="absolute -top-3 right-3 z-10 flex gap-1 rounded-full bg-white p-1 shadow">
                <span className="px-2 text-[11px] font-semibold leading-7 text-charcoal/60">{WIDGETS.find((w) => w.key === key)?.label}</span>
                <button onClick={() => move(key, -1)} className="rounded-full p-1.5 hover:bg-cream" aria-label="Yukarı taşı"><ArrowUp size={14} /></button>
                <button onClick={() => move(key, 1)} className="rounded-full p-1.5 hover:bg-cream" aria-label="Aşağı taşı"><ArrowDown size={14} /></button>
                <button onClick={() => setHidden((h) => (h.includes(key) ? h.filter((x) => x !== key) : [...h, key]))} className="rounded-full p-1.5 hover:bg-cream" aria-label="Göster/gizle">
                  {hidden.includes(key) ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )}
            {blocks[key]}
          </div>
        ))}
      </div>
    </div>
  );
}
