import { requirePagePermission } from "@/lib/auth";
import { NotificationCenter } from "./NotificationCenter";

export const metadata = { title: "Bildirimler" };

export default async function NotificationsPage() {
  await requirePagePermission("dashboard.view");
  return <NotificationCenter />;
}
