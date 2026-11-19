import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Online ödeme altyapısı (sağlayıcıdan bağımsız).
 * Bugün siparişler masada nakit/kart ile ödenir ve panelden "ödendi" işaretlenir (provider: "manual").
 * İyzico / PayTR / Stripe eklemek için PaymentProvider arayüzünü uygulayıp `providers` nesnesine kaydetmeniz,
 * QR menüdeki sepete "Online öde" adımını eklemeniz ve sağlayıcının webhook'unu `handleWebhook` ile bağlamanız yeterlidir.
 * Order.paymentStatus / paymentMethod alanları ve `payments` tablosu bu akışa hazırdır.
 */
export interface PaymentProvider {
  key: string;
  createCheckout(input: { orderId: string; amount: number; currency: string; returnUrl: string }): Promise<{ redirectUrl: string; providerRef: string }>;
  verifyWebhook(req: Request): Promise<{ providerRef: string; status: "succeeded" | "failed" | "refunded"; raw: unknown } | null>;
}

const providers: Record<string, PaymentProvider> = {};
export function registerProvider(p: PaymentProvider) {
  providers[p.key] = p;
}
export const availableProviders = () => Object.keys(providers);

export async function startPayment(providerKey: string, orderId: string, returnUrl: string) {
  const provider = providers[providerKey];
  if (!provider) throw new Error("Ödeme sağlayıcısı yapılandırılmamış");
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  const { redirectUrl, providerRef } = await provider.createCheckout({ orderId, amount: Number(order.total), currency: order.currency, returnUrl });
  await db.$transaction([
    db.payment.create({ data: { orderId, provider: providerKey, providerRef, amount: order.total, currency: order.currency, status: "pending" } }),
    db.order.update({ where: { id: orderId }, data: { paymentStatus: "pending", paymentMethod: "online" } }),
  ]);
  return redirectUrl;
}

export async function handleWebhook(providerKey: string, req: Request) {
  const provider = providers[providerKey];
  if (!provider) return false;
  const result = await provider.verifyWebhook(req);
  if (!result) return false;
  const payment = await db.payment.findFirst({ where: { provider: providerKey, providerRef: result.providerRef } });
  if (!payment) return false;
  await db.$transaction([
    db.payment.update({ where: { id: payment.id }, data: { status: result.status, raw: result.raw as Prisma.InputJsonValue } }),
    db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: result.status === "succeeded" ? "paid" : result.status === "refunded" ? "refunded" : "unpaid" } }),
  ]);
  return true;
}

/** Masada ödeme (nakit / POS) kaydı */
export async function recordManualPayment(orderId: string, method: "cash" | "card_at_table") {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  await db.$transaction([
    db.payment.create({ data: { orderId, provider: "manual", providerRef: method, amount: order.total, currency: order.currency, status: "succeeded" } }),
    db.order.update({ where: { id: orderId }, data: { paymentStatus: "paid", paymentMethod: method } }),
  ]);
}
