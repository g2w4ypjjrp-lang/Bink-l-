import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { toNumber } from "./utils";

export type MenuProduct = {
  id: string; slug: string; categoryId: string; subcategoryId: string | null;
  name: Record<string, string>; description: Record<string, string>; ingredients: Record<string, string>;
  price: number; oldPrice: number | null; campaignPrice: number | null;
  images: { url: string; alt: string | null }[];
  calories: number | null; portion: string | null; prepMinutes: number | null; spiceLevel: number;
  vegetarian: boolean; vegan: boolean; glutenFree: boolean; featured: boolean; isNew: boolean; popular: boolean; daily: boolean;
  inStock: boolean; tags: string[]; allergens: string[];
};
export type MenuCategory = { id: string; slug: string; parentId: string | null; name: Record<string, string>; description: Record<string, string>; image: string | null; availableFrom: string | null; availableTo: string | null };
export type MenuCampaign = { id: string; title: string; description: string | null; image: string | null; price: number | null; discountRate: number | null; categoryId: string | null; endsAt: string | null };
export type MenuAllergen = { key: string; name: Record<string, string>; icon: string | null };
export type MenuData = { categories: MenuCategory[]; products: MenuProduct[]; campaigns: MenuCampaign[]; allergens: MenuAllergen[] };

export async function activeCampaignWhere() {
  const now = new Date();
  return { active: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] };
}

export const getMenuData = unstable_cache(
  async (): Promise<MenuData> => {
    const [cats, prods, allergens, campaigns] = await Promise.all([
      db.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { translations: true } }),
      db.product.findMany({
        where: { active: true, category: { active: true } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { images: { orderBy: { sortOrder: "asc" } }, translations: true, allergens: { include: { allergen: true } } },
      }),
      db.allergen.findMany({ orderBy: { sortOrder: "asc" } }),
      db.campaign.findMany({ where: { ...(await activeCampaignWhere()), showOnMenu: true }, orderBy: { sortOrder: "asc" } }),
    ]);
    return {
      categories: cats.map((c) => ({
        id: c.id, slug: c.slug, parentId: c.parentId, image: c.image, availableFrom: c.availableFrom, availableTo: c.availableTo,
        name: { tr: c.name, ...Object.fromEntries(c.translations.map((t) => [t.locale, t.name])) },
        description: { tr: c.description ?? "", ...Object.fromEntries(c.translations.map((t) => [t.locale, t.description ?? ""])) },
      })),
      products: prods.map((p) => ({
        id: p.id, slug: p.slug, categoryId: p.categoryId, subcategoryId: p.subcategoryId,
        name: { tr: p.name, ...Object.fromEntries(p.translations.map((t) => [t.locale, t.name])) },
        description: { tr: p.description ?? "", ...Object.fromEntries(p.translations.filter((t) => t.description).map((t) => [t.locale, t.description!])) },
        ingredients: { tr: p.ingredients ?? "", ...Object.fromEntries(p.translations.filter((t) => t.ingredients).map((t) => [t.locale, t.ingredients!])) },
        price: toNumber(p.price), oldPrice: p.oldPrice ? toNumber(p.oldPrice) : null, campaignPrice: p.campaignPrice ? toNumber(p.campaignPrice) : null,
        images: p.images.map((i) => ({ url: i.url, alt: i.alt })),
        calories: p.calories, portion: p.portion, prepMinutes: p.prepMinutes, spiceLevel: p.spiceLevel,
        vegetarian: p.vegetarian, vegan: p.vegan, glutenFree: p.glutenFree, featured: p.featured, isNew: p.isNew, popular: p.popular, daily: p.daily,
        inStock: p.inStock, tags: p.tags, allergens: p.allergens.map((a) => a.allergen.key),
      })),
      allergens: allergens.map((a) => ({ key: a.key, icon: a.icon, name: { tr: a.nameTr, en: a.nameEn, de: a.nameDe } })),
      campaigns: campaigns.map((c) => ({ id: c.id, title: c.title, description: c.description, image: c.image, price: c.price ? toNumber(c.price) : null, discountRate: c.discountRate, categoryId: c.categoryId, endsAt: c.endsAt?.toISOString() ?? null })),
    };
  },
  ["menu-v1"],
  { tags: ["menu"], revalidate: 600 }
);

/** Ürünün geçerli satış fiyatı (kampanya fiyatı varsa o) */
export function effectivePrice(p: { price: number; campaignPrice: number | null }) {
  return p.campaignPrice && p.campaignPrice > 0 && p.campaignPrice < p.price ? p.campaignPrice : p.price;
}
