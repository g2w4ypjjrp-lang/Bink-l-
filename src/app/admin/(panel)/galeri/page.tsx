import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { GalleryAdmin } from "./GalleryAdmin";

export const metadata = { title: "Galeri" };

export default async function GalleryAdminPage() {
  await requirePagePermission("gallery.manage");
  const [items, cats] = await Promise.all([db.galleryItem.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }), db.galleryCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { items: true } } } })]);
  return (
    <GalleryAdmin
      items={items.map((i) => ({ id: i.id, type: i.type, url: i.url, thumbUrl: i.thumbUrl ?? "", title: i.title ?? "", description: i.description ?? "", alt: i.alt ?? "", categoryId: i.categoryId, showOnHome: i.showOnHome, active: i.active }))}
      categories={cats.map((c) => ({ id: c.id, name: c.name, count: c._count.items }))}
    />
  );
}
