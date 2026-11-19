import "server-only";
import { db } from "./db";
import { toNumber } from "./utils";

export async function serializeOrders(where: object = {}, take = 300) {
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take, include: { items: true } });
  return orders.map((o) => ({
    id: o.id, number: o.number, status: o.status, tableNumber: o.tableNumber, note: o.note, customerName: o.customerName, total: toNumber(o.total), taxAmount: toNumber(o.taxAmount),
    paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((i) => ({ id: i.id, name: i.productName, quantity: i.quantity, unitPrice: toNumber(i.unitPrice), lineTotal: toNumber(i.lineTotal), note: i.note })),
  }));
}

