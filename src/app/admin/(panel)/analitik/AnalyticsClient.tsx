"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, PageHeader, Tabs } from "@/components/admin/ui";
import { SeriesChart, BarList } from "@/components/admin/Charts";
import { downloadText } from "@/components/admin/DataTable";
import { Button } from "@/components/admin/ui";
import { Download } from "lucide-react";

type Point = { label: string; key: string; visitors: number; views: number; menu: number; qr: number };
type Item = { name: string; value: number };
const DEV: Record<string, string> = { mobile: "Mobil", tablet: "Tablet", desktop: "Masaüstü", bilinmiyor: "Bilinmiyor" };
const SRC: Record<string, string> = { direct: "Doğrudan", qr: "QR kod", google: "Google", instagram: "Instagram", facebook: "Facebook", internal: "Site içi", referral: "Diğer siteler", search: "Diğer arama motorları", whatsapp: "WhatsApp", x: "X (Twitter)", tiktok: "TikTok", bilinmiyor: "Bilinmiyor" };

export function AnalyticsClient(p: {
  days: number; series: Point[]; products: { name: string; count: number }[]; categories: { name: string; count: number }[]; devices: Item[]; sources: Item[]; qr: { label: string; period: number }[];
  conv: { visitors: number; reservations: number; events: number; orders: number; contacts: number; reservationRate: number; eventRate: number; totalAllTime: number; qrScans: number; menuViews: number; productViews: number };
  pages: Item[]; ordered: { name: string; count: number }[];
}) {
  const router = useRouter();
  const [metric, setMetric] = useState<"visitors" | "views">("visitors");
  const c = p.conv;
  const kpis = [
    ["Ziyaretçi", c.visitors], ["Toplam ziyaret (tüm zamanlar)", c.totalAllTime], ["QR tarama", c.qrScans], ["Menü görüntüleme", c.menuViews], ["Ürün görüntüleme", c.productViews],
    ["Rezervasyon talebi", c.reservations], ["Rezervasyon dönüşümü", `%${c.reservationRate}`], ["Organizasyon başvurusu", c.events], ["QR sipariş", c.orders], ["İletişim mesajı", c.contacts],
  ] as const;
  return (
    <div>
      <PageHeader
        title="Analitik"
        description="Çerez kullanmayan, KVKK dostu birinci taraf ziyaret istatistikleri."
        actions={
          <div className="flex items-center gap-2">
            <Tabs value={String(p.days)} onChange={(v) => router.push(`/admin/analitik?range=${v}`)} tabs={[{ key: "7", label: "7 gün" }, { key: "30", label: "30 gün" }, { key: "90", label: "90 gün" }, { key: "365", label: "12 ay" }]} />
            <Button variant="ghost" size="sm" className="mb-5" onClick={() => downloadText(`analitik-${p.days}g.csv`, "﻿Tarih;Ziyaretçi;Sayfa görüntüleme;Menü;QR\n" + p.series.map((s) => [s.key, s.visitors, s.views, s.menu, s.qr].join(";")).join("\n"))}><Download size={14} /> CSV</Button>
          </div>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-charcoal/8 bg-white p-4">
            <p className="text-xs text-charcoal/55">{l}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{typeof v === "number" ? v.toLocaleString("tr-TR") : v}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Trafik" className="lg:col-span-3" actions={<Tabs value={metric} onChange={setMetric} tabs={[{ key: "visitors", label: "Ziyaretçi & menü" }, { key: "views", label: "Sayfa & QR" }]} />}>
          <SeriesChart data={p.series} series={metric === "visitors" ? [{ key: "visitors", name: "Ziyaretçi" }, { key: "menu", name: "Menü görüntüleme" }] : [{ key: "views", name: "Sayfa görüntüleme" }, { key: "qr", name: "QR tarama" }]} height={300} />
        </Card>
        <Card title="En popüler ürünler"><BarList items={p.products.map((x) => ({ name: x.name, value: x.count }))} /></Card>
        <Card title="En popüler kategoriler"><BarList items={p.categories.map((x) => ({ name: x.name, value: x.count }))} /></Card>
        <Card title="En çok kullanılan QR kodlar"><BarList items={p.qr.map((x) => ({ name: x.label, value: x.period }))} /></Card>
        <Card title="Cihaz türü"><BarList items={p.devices.map((x) => ({ name: DEV[x.name] ?? x.name, value: x.value }))} /></Card>
        <Card title="Trafik kaynakları"><BarList items={p.sources.map((x) => ({ name: SRC[x.name] ?? x.name, value: x.value }))} /></Card>
        <Card title="En çok ziyaret edilen sayfalar"><BarList items={p.pages} /></Card>
        <Card title="En çok sipariş edilen ürünler" className="lg:col-span-3"><BarList items={p.ordered.map((x) => ({ name: x.name, value: x.count }))} empty="Bu dönemde QR sipariş yok" /></Card>
      </div>
    </div>
  );
}
