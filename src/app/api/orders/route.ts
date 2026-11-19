import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { guardPublic, json, readJson, withErrors } from "@/lib/api";
import { orderSchema, zodErrors } from "@/lib/validation";
import { getSettings } from "@/lib/settings";
import { notifyAdmin } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { toNumber, formatPrice } from "@/lib/utils";

export const POST = withErrors("api.orders", async (req: Request) => {
  const blocked = await guardPublic(req, "order", 12, 10 * 60_000);
  if (blocked) return blocked;
  const s = await getSettings();
  if (!s.menu.orderingEnabled) return json({ error: "QR sipariş şu an kapalı. Lütfen siparişinizi ekibimize iletin." }, 400);
  const parsed = orderSchema.safeParse(await readJson(req));
  if (!parsed.success) return json({ error: "Sipariş bilgileri geçersiz.", fields: zodErrors(parsed.error) }, 422);
  const d = parsed.data;

  // Masa doğrulaması: QR'daki gizli masa anahtarı eşleşmeli
  const table = await db.table.findUnique({ where: { number: d.table } });
  if (!table || !table.active || table.orderToken !== d.token) return json({ error: "Masa doğrulanamadı. Lütfen masanızdaki QR kodu tekrar okutun." }, 403);

  const ids = [...new Set(d.items.map((i) => i.productId))];
  const products = await db.product.findMany({ where: { id: { in: ids }, active: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const unavailable = d.items.filter((i) => !byId.get(i.productId)?.inStock);
  if (unavailable.length) return json({ error: "Sepetinizdeki bazı ürünler şu an tükenmiş. Lütfen sepetinizi güncelleyin.", unavailable: unavailable.map((u) => u.productId) }, 409);

  // Fiyatlar her zaman sunucuda hesaplanır
  const items = d.items.map((i) => {
    const p = byId.get(i.productId)!;
    const price = p.campaignPrice && toNumber(p.campaignPrice) > 0 && toNumber(p.campaignPrice) < toNumber(p.price) ? toNumber(p.campaignPrice) : toNumber(p.price);
    return { productId: p.id, productName: p.name, unitPrice: new Prisma.Decimal(price), quantity: i.quantity, note: i.note, lineTotal: new Prisma.Decimal(price * i.quantity) };
  });
  const total = items.reduce((a, i) => a + toNumber(i.lineTotal), 0);
  const rate = s.menu.taxRate / 100;
  const tax = s.menu.pricesIncludeTax ? total - total / (1 + rate) : total * rate;
  const grand = s.menu.pricesIncludeTax ? total : total + tax;

  const order = await db.order.create({
    data: {
      tableId: table.id, tableNumber: table.number, note: d.note, customerName: d.customerName,
      subtotal: new Prisma.Decimal(total.toFixed(2)), taxAmount: new Prisma.Decimal(tax.toFixed(2)), total: new Prisma.Decimal(grand.toFixed(2)), currency: s.menu.currency,
      items: { create: items },
    },
  });
  await notifyAdmin("order", `Yeni sipariş · Masa ${table.number}`, `#${order.number} · ${items.length} kalem · ${formatPrice(grand, s.menu.currency)}`, `/admin/siparisler?id=${order.id}`);
  await track("order", { path: "/menu", entityId: order.id, entityName: `Masa ${table.number}`, ua: req.headers.get("user-agent") || "", source: "qr" });
  return json({ ok: true, publicId: order.publicId, number: order.number });
});
