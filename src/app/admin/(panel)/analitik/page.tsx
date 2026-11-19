import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { trafficSeries, topEntities, breakdown, qrUsage, conversion, istanbulDayStart, orderedProducts } from "@/lib/stats";
import { addDaysISO, todayISO } from "@/lib/utils";
import { AnalyticsClient } from "./AnalyticsClient";

export const metadata = { title: "Analitik" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requirePagePermission("analytics.view");
  const { range = "30" } = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(range)) ? Number(range) : 30;
  const since = istanbulDayStart(addDaysISO(todayISO(), -(days - 1)));
  const [series, products, categories, devices, sources, qr, conv, total, pages, ordered] = await Promise.all([
    days <= 90 ? trafficSeries("day", days) : trafficSeries("month", 12),
    topEntities("product_view", since, 12),
    topEntities("category_view", since, 12),
    breakdown("device", since),
    breakdown("source", since),
    qrUsage(since),
    conversion(since),
    db.analyticsEvent.count({ where: { type: { in: ["pageview", "menu_view"] } } }),
    db.analyticsEvent.groupBy({ by: ["path"], where: { type: "pageview", createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { path: "desc" } }, take: 10 }),
    orderedProducts(since, 10),
  ]);
  return (
    <AnalyticsClient
      days={days}
      series={series}
      products={products}
      categories={categories}
      devices={devices}
      sources={sources}
      qr={qr.filter((q) => q.period > 0)}
      conv={{ ...conv, totalAllTime: total, qrScans: qr.reduce((a, q) => a + q.period, 0), menuViews: series.reduce((a, s) => a + s.menu, 0), productViews: products.reduce((a, p) => a + p.count, 0) }}
      pages={pages.map((p) => ({ name: p.path ?? "/", value: p._count._all }))}
      ordered={ordered}
    />
  );
}
