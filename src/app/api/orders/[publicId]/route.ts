import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { toNumber } from "@/lib/utils";

export async function GET(_req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const o = await db.order.findUnique({ where: { publicId: publicId.slice(0, 40) }, include: { items: true } });
  if (!o) return json({ error: "Sipariş bulunamadı." }, 404);
  return json(
    {
      number: o.number, status: o.status, tableNumber: o.tableNumber, total: toNumber(o.total), currency: o.currency, note: o.note, createdAt: o.createdAt, updatedAt: o.updatedAt,
      items: o.items.map((i) => ({ name: i.productName, quantity: i.quantity, unitPrice: toNumber(i.unitPrice), lineTotal: toNumber(i.lineTotal), note: i.note })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
