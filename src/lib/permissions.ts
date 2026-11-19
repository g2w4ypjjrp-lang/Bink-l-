/** Yetki anahtarları — tek kaynak. Roller veritabanında bu anahtarlarla eşleşir. */
export const PERMISSIONS = [
  { key: "dashboard.view", name: "Dashboard görüntüleme", group: "Genel" },
  { key: "analytics.view", name: "Analitik görüntüleme", group: "Genel" },
  { key: "menu.manage", name: "Menü yönetimi (kategori, ürün, fiyat)", group: "Menü" },
  { key: "qr.manage", name: "QR kod ve masa yönetimi", group: "Menü" },
  { key: "orders.view", name: "Siparişleri görüntüleme", group: "Operasyon" },
  { key: "orders.manage", name: "Sipariş durumunu değiştirme", group: "Operasyon" },
  { key: "reservations.view", name: "Rezervasyonları görüntüleme", group: "Operasyon" },
  { key: "reservations.manage", name: "Rezervasyon yönetimi", group: "Operasyon" },
  { key: "events.manage", name: "Organizasyon başvuruları", group: "Operasyon" },
  { key: "messages.manage", name: "İletişim mesajları", group: "Operasyon" },
  { key: "gallery.manage", name: "Galeri yönetimi", group: "İçerik" },
  { key: "campaigns.manage", name: "Kampanya yönetimi", group: "İçerik" },
  { key: "reviews.manage", name: "Yorum yönetimi", group: "İçerik" },
  { key: "pages.manage", name: "Sayfa içerikleri", group: "İçerik" },
  { key: "seo.manage", name: "SEO yönetimi", group: "İçerik" },
  { key: "settings.manage", name: "İşletme ayarları", group: "Sistem" },
  { key: "users.manage", name: "Kullanıcı ve rol yönetimi", group: "Sistem" },
  { key: "system.manage", name: "Sistem, loglar ve yedekleme", group: "Sistem" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as PermissionKey[];

export const DEFAULT_ROLES: { key: string; name: string; description: string; permissions: PermissionKey[] }[] = [
  { key: "admin", name: "Admin", description: "Tüm yetkiler", permissions: ALL_PERMISSION_KEYS },
  {
    key: "manager",
    name: "Yönetici",
    description: "Kullanıcı ve sistem yönetimi hariç tüm işlemler",
    permissions: ALL_PERMISSION_KEYS.filter((k) => k !== "users.manage" && k !== "system.manage"),
  },
  {
    key: "staff",
    name: "Personel",
    description: "Yalnızca rezervasyon ve siparişler",
    permissions: ["dashboard.view", "orders.view", "orders.manage", "reservations.view", "reservations.manage"],
  },
];

export function hasPermission(userPerms: readonly string[], required: PermissionKey | PermissionKey[]): boolean {
  const list = Array.isArray(required) ? required : [required];
  return list.some((r) => userPerms.includes(r));
}
