import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { toNumber } from "@/lib/utils";
import { OrderStatus } from "@/components/menu/OrderStatus";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sipariş Durumu", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const o = await db.order.findUnique({ where: { publicId }, include: { items: true } });
  if (!o) notFound();
  const s = await getSettings();
  return (
    <OrderStatus
      publicId={publicId}
      currency={s.menu.currency}
      initial={{ number: o.number, status: o.status, tableNumber: o.tableNumber, total: toNumber(o.total), note: o.note, createdAt: o.createdAt.toISOString(), items: o.items.map((i) => ({ name: i.productName, quantity: i.quantity, lineTotal: toNumber(i.lineTotal), note: i.note })) }}
    />
  );
}
