import { apiUser } from "@/lib/auth";
import { json } from "@/lib/api";
import { serializeOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Canlı sipariş ekranı için kısa aralıklı sorgu */
export async function GET() {
  if (!(await apiUser(["orders.view", "orders.manage"]))) return json({ error: "Yetkisiz" }, 401);
  const since = new Date(Date.now() - 36 * 3600_000);
  return json({ orders: await serializeOrders({ OR: [{ status: { in: ["new", "preparing", "ready"] } }, { createdAt: { gte: since } }] }, 200) }, { headers: { "Cache-Control": "no-store" } });
}
