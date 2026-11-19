import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/utils";
import { MenuAdmin } from "./MenuAdmin";

export const metadata = { title: "Menü Yönetimi" };

export default async function MenuAdminPage() {
  await requirePagePermission("menu.manage");
  const [cats, prods, allergens] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }], include: { translations: true, _count: { select: { products: true } } } }),
    db.product.findMany({ orderBy: [{ sortOrder: "asc" }], include: { images: { orderBy: { sortOrder: "asc" } }, translations: true, allergens: true } }),
    db.allergen.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <MenuAdmin
      categories={cats.map((c) => ({
        id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", image: c.image ?? "", parentId: c.parentId, active: c.active, availableFrom: c.availableFrom ?? "", availableTo: c.availableTo ?? "", count: c._count.products,
        translations: Object.fromEntries(c.translations.map((t) => [t.locale, { name: t.name, description: t.description ?? "" }])),
      }))}
      products={prods.map((p) => ({
        id: p.id, name: p.name, slug: p.slug, description: p.description ?? "", ingredients: p.ingredients ?? "", price: toNumber(p.price), oldPrice: p.oldPrice ? toNumber(p.oldPrice) : null, campaignPrice: p.campaignPrice ? toNumber(p.campaignPrice) : null,
        categoryId: p.categoryId, subcategoryId: p.subcategoryId, calories: p.calories, portion: p.portion ?? "", prepMinutes: p.prepMinutes, spiceLevel: p.spiceLevel,
        vegetarian: p.vegetarian, vegan: p.vegan, glutenFree: p.glutenFree, featured: p.featured, isNew: p.isNew, popular: p.popular, daily: p.daily, active: p.active, inStock: p.inStock,
        tags: p.tags, seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", sortOrder: p.sortOrder, viewCount: p.viewCount, updatedAt: p.updatedAt.toISOString(),
        images: p.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
        allergens: p.allergens.map((a) => a.allergenId),
        translations: Object.fromEntries(p.translations.map((t) => [t.locale, { name: t.name, description: t.description ?? "", ingredients: t.ingredients ?? "" }])),
      }))}
      allergens={allergens.map((a) => ({ id: a.id, key: a.key, nameTr: a.nameTr, nameEn: a.nameEn, nameDe: a.nameDe, icon: a.icon ?? "" }))}
    />
  );
}
