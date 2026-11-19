import { requirePagePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { serializeOrders } from "@/lib/orders";
import { OrdersAdmin } from "./OrdersAdmin";

export const metadata = { title: "Siparişler" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requirePagePermission(["orders.view", "orders.manage"]);
  const [orders, s, sp] = await Promise.all([serializeOrders({ createdAt: { gte: new Date(Date.now() - 90 * 864e5) } }, 1000), getSettings(), searchParams]);
  return <OrdersAdmin initial={orders} canManage={hasPermission(user.permissions, "orders.manage")} canToggle={hasPermission(user.permissions, "settings.manage")} orderingEnabled={s.menu.orderingEnabled} openId={sp.id} />;
}
