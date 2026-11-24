import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { trafficSeries, visitorsSince, topEntities, qrUsage, istanbulDayStart, istanbulMonthStart, orderedProducts } from "@/lib/stats";
import { dateFromISO, todayISO, addDaysISO, toNumber } from "@/lib/utils";
import { DashboardClient } from "@/components/admin/DashboardClient";
/** Online rezervasyon siteden kaldırıldı; panelde de gösterilmiyor. */
const RESERVATIONS_ON = false;

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requirePagePermission("dashboard.view");
  const { denied } = await searchParams;
  const can = (k: Parameters<typeof hasPermission>[1]) => hasPermission(user.permissions, k);
  const today = istanbulDayStart();
  const month = istanbulMonthStart();
  const last30 = istanbulDayStart(addDaysISO(todayISO(), -29));
  const showAnalytics = can("analytics.view");

  const [
    visitorsToday, visitorsMonth, qrToday, qrMonth, menuToday, menuMonth,
    resToday, resPending, resUpcoming, eventsNew, msgsUnread, ordersToday, ordersActive, revenueToday,
    daily, weekly, monthly, topProducts, topCats, qr, ordered, recentRes, recentOrders,
  ] = await Promise.all([
    showAnalytics ? visitorsSince(today) : 0,
    showAnalytics ? visitorsSince(month) : 0,
    db.qrScan.count({ where: { createdAt: { gte: today } } }),
    db.qrScan.count({ where: { createdAt: { gte: month } } }),
    db.analyticsEvent.count({ where: { type: "menu_view", createdAt: { gte: today } } }),
    db.analyticsEvent.count({ where: { type: "menu_view", createdAt: { gte: month } } }),
    RESERVATIONS_ON && can("reservations.view") ? db.reservation.count({ where: { date: dateFromISO(todayISO()), status: { in: ["pending", "confirmed"] } } }) : 0,
    RESERVATIONS_ON && can("reservations.view") ? db.reservation.count({ where: { status: "pending" } }) : 0,
    RESERVATIONS_ON && can("reservations.view") ? db.reservation.count({ where: { date: { gte: dateFromISO(todayISO()), lte: dateFromISO(addDaysISO(todayISO(), 7)) }, status: { in: ["pending", "confirmed"] } } }) : 0,
    can("events.manage") ? db.eventRequest.count({ where: { status: "new" } }) : 0,
    can("messages.manage") ? db.contactMessage.count({ where: { status: "unread", archived: false } }) : 0,
    can("orders.view") ? db.order.count({ where: { createdAt: { gte: today } } }) : 0,
    can("orders.view") ? db.order.count({ where: { status: { in: ["new", "preparing", "ready"] } } }) : 0,
    can("orders.view") ? db.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: today }, status: { not: "cancelled" } } }) : null,
    showAnalytics ? trafficSeries("day", 30) : [],
    showAnalytics ? trafficSeries("week", 12) : [],
    showAnalytics ? trafficSeries("month", 12) : [],
    showAnalytics ? topEntities("product_view", last30, 8) : [],
    showAnalytics ? topEntities("category_view", last30, 8) : [],
    can("qr.manage") || showAnalytics ? qrUsage(last30) : [],
    can("orders.view") ? orderedProducts(last30, 6) : [],
    RESERVATIONS_ON && can("reservations.view")
      ? db.reservation.findMany({ where: { date: { gte: dateFromISO(todayISO()) }, status: { in: ["pending", "confirmed"] } }, orderBy: [{ date: "asc" }, { time: "asc" }], take: 6 })
      : [],
    can("orders.view") ? db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { _count: { select: { items: true } } } }) : [],
  ]);

  const prefs = (user.preferences as { dashboard?: { hidden: string[]; order: string[] } }).dashboard ?? { hidden: [], order: [] };

  return (
    <DashboardClient
      userName={user.name}
      denied={!!denied}
      prefs={prefs}
      perms={{ analytics: showAnalytics, reservations: RESERVATIONS_ON && can("reservations.view"), orders: can("orders.view"), events: can("events.manage"), messages: can("messages.manage"), qr: can("qr.manage") || showAnalytics }}
      kpis={{ visitorsToday, visitorsMonth, qrToday, qrMonth, menuToday, menuMonth, resToday, resPending, resUpcoming, eventsNew, msgsUnread, ordersToday, ordersActive, revenueToday: toNumber(revenueToday?._sum.total ?? 0) }}
      series={{ daily, weekly, monthly }}
      topProducts={topProducts}
      topCats={topCats}
      qr={qr.slice(0, 10)}
      ordered={ordered}
      recentRes={recentRes.map((r) => ({ id: r.id, name: r.name, guests: r.guests, date: r.date.toISOString().slice(0, 10), time: r.time, status: r.status }))}
      recentOrders={recentOrders.map((o) => ({ id: o.id, number: o.number, table: o.tableNumber, status: o.status, total: toNumber(o.total), items: o._count.items, at: o.createdAt.toISOString() }))}
    />
  );
}
