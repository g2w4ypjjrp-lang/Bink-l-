import { getSettings } from "@/lib/settings";
import { OrderStatus } from "@/components/menu/OrderStatus";

// Statik kabuk: /menu/siparis/<id> istekleri Worker'da bu dosyaya yönlendirilir, sipariş tarayıcıda yüklenir.
export const dynamic = "force-static";
export const metadata = { title: "Sipariş Durumu", robots: { index: false } };

export default async function OrderPage() {
  const s = await getSettings();
  return <OrderStatus currency={s.menu.currency} />;
}
