import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, type PermissionKey } from "@/lib/permissions";
import { Shell, type NavItem } from "@/components/admin/Shell";
import { AdminProviders } from "@/components/admin/ui";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const p = (k: PermissionKey | PermissionKey[]) => hasPermission(user.permissions, k);
  const [newRes, newOrders, newEvents, unreadMsgs] = await Promise.all([
    p("reservations.view") ? db.reservation.count({ where: { status: "pending" } }) : 0,
    p("orders.view") ? db.order.count({ where: { status: { in: ["new", "preparing", "ready"] } } }) : 0,
    p("events.manage") ? db.eventRequest.count({ where: { status: "new" } }) : 0,
    p("messages.manage") ? db.contactMessage.count({ where: { status: "unread", archived: false } }) : 0,
  ]);
  const groups: { group: string; items: (NavItem & { perm: PermissionKey | PermissionKey[] })[] }[] = [
    { group: "Genel", items: [{ href: "/admin", label: "Dashboard", icon: "LayoutDashboard", perm: "dashboard.view" }, { href: "/admin/analitik", label: "Analitik", icon: "BarChart3", perm: "analytics.view" }] },
    {
      group: "Operasyon",
      items: [
        { href: "/admin/siparisler", label: "Siparişler", icon: "ClipboardList", perm: ["orders.view", "orders.manage"], badge: newOrders },
        { href: "/admin/rezervasyonlar", label: "Rezervasyonlar", icon: "CalendarDays", perm: ["reservations.view", "reservations.manage"], badge: newRes },
        { href: "/admin/organizasyonlar", label: "Organizasyonlar", icon: "PartyPopper", perm: "events.manage", badge: newEvents },
        { href: "/admin/mesajlar", label: "Mesajlar", icon: "MessageSquare", perm: "messages.manage", badge: unreadMsgs },
        { href: "/admin/bildirimler", label: "Bildirimler", icon: "Bell", perm: "dashboard.view" },
      ],
    },
    {
      group: "Menü",
      items: [
        { href: "/admin/menu", label: "Menü", icon: "UtensilsCrossed", perm: "menu.manage" },
        { href: "/admin/qr", label: "QR Kodlar & Masalar", icon: "QrCode", perm: "qr.manage" },
        { href: "/admin/kampanyalar", label: "Kampanyalar", icon: "Megaphone", perm: "campaigns.manage" },
      ],
    },
    {
      group: "İçerik",
      items: [
        { href: "/admin/sayfalar", label: "Sayfalar", icon: "FileText", perm: "pages.manage" },
        { href: "/admin/galeri", label: "Galeri", icon: "Images", perm: "gallery.manage" },
        { href: "/admin/yorumlar", label: "Yorumlar", icon: "Star", perm: "reviews.manage" },
        { href: "/admin/seo", label: "SEO", icon: "Globe", perm: "seo.manage" },
      ],
    },
    {
      group: "Sistem",
      items: [
        { href: "/admin/kullanicilar", label: "Kullanıcılar", icon: "Users", perm: "users.manage" },
        { href: "/admin/ayarlar", label: "Ayarlar", icon: "Settings", perm: "settings.manage" },
        { href: "/admin/sistem", label: "Sistem & Güvenlik", icon: "ShieldCheck", perm: "system.manage" },
      ],
    },
  ];
  const nav = groups.map((g) => ({ group: g.group, items: g.items.filter((i) => p(i.perm)).map(({ perm: _p, ...rest }) => rest) })).filter((g) => g.items.length);
  return (
    <AdminProviders>
      <Shell nav={nav} user={{ name: user.name, email: user.email, roleName: user.roleName }}>
        {children}
      </Shell>
    </AdminProviders>
  );
}
