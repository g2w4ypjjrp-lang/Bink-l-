"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { getSettings, saveSetting } from "@/lib/settings";
import { recordManualPayment } from "@/lib/payments";

const STATUSES = ["new", "preparing", "ready", "delivered", "cancelled"] as const;

export async function setOrderStatus(ids: string[], status: (typeof STATUSES)[number]) {
  return guarded("orders.manage", async (u) => {
    z.enum(STATUSES).parse(status);
    await db.order.updateMany({ where: { id: { in: ids } }, data: { status } });
    await audit(u.id, "status", "order", ids.join(","), `Sipariş durumu: ${status}`);
    revalidatePath("/admin/siparisler");
  });
}

export async function setPayment(id: string, paymentStatus: "unpaid" | "paid", paymentMethod?: string) {
  return guarded("orders.manage", async (u) => {
    z.enum(["unpaid", "paid"]).parse(paymentStatus);
    if (paymentStatus === "paid") await recordManualPayment(id, z.enum(["cash", "card_at_table"]).parse(paymentMethod ?? "cash"));
    else {
      await db.payment.deleteMany({ where: { orderId: id, provider: "manual" } });
      await db.order.update({ where: { id }, data: { paymentStatus: "unpaid", paymentMethod: null } });
    }
    await audit(u.id, "update", "order", id, `Ödeme: ${paymentStatus}`);
    revalidatePath("/admin/siparisler");
  });
}

export async function toggleOrdering(enabled: boolean) {
  return guarded("settings.manage", async (u) => {
    await saveSetting("menu", { ...(await getSettings()).menu, orderingEnabled: enabled });
    await audit(u.id, "update", "settings", "menu", enabled ? "QR sipariş açıldı" : "QR sipariş kapatıldı");
    revalidatePath("/admin/siparisler");
  });
}
