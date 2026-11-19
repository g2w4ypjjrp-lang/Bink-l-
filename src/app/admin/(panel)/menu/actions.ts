"use server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidateTag, revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded, UserError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { sanitizeText } from "@/lib/security";

const txt = (max: number) => z.string().trim().max(max).transform((v) => sanitizeText(v, max));
const optTxt = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? sanitizeText(v, max) : null));
const money = z.union([z.number(), z.string()]).transform((v) => (v === "" || v === null ? null : Number(v))).refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v < 10_000_000), "Geçersiz fiyat");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable().or(z.literal("").transform(() => null));

function refresh() {
  revalidateTag("menu");
  revalidatePath("/admin/menu");
}

/* ───────────── Kategoriler ───────────── */
const categorySchema = z.object({
  id: z.string().optional(),
  name: txt(80).pipe(z.string().min(1, "Kategori adı gerekli")),
  slug: z.string().trim().max(80).optional(),
  description: optTxt(400),
  image: optTxt(300),
  parentId: z.string().optional().nullable().transform((v) => v || null),
  active: z.boolean(),
  availableFrom: time,
  availableTo: time,
  translations: z.record(z.enum(["en", "de"]), z.object({ name: z.string().max(80), description: z.string().max(400).optional() })).optional(),
});

export async function saveCategory(input: unknown) {
  return guarded("menu.manage", async (u) => {
    const d = categorySchema.parse(input);
    const slug = slugify(d.slug || d.name);
    if (!slug) throw new UserError("Geçerli bir kısa ad (slug) girin.");
    if (d.parentId && d.parentId === d.id) throw new UserError("Kategori kendi alt kategorisi olamaz.");
    const data = { name: d.name, slug, description: d.description, image: d.image, parentId: d.parentId, active: d.active, availableFrom: d.availableFrom, availableTo: d.availableTo };
    const cat = d.id
      ? await db.category.update({ where: { id: d.id }, data })
      : await db.category.create({ data: { ...data, sortOrder: (await db.category.count()) + 1 } });
    for (const [locale, t] of Object.entries(d.translations ?? {})) {
      if (t.name.trim()) await db.categoryTranslation.upsert({ where: { categoryId_locale: { categoryId: cat.id, locale } }, update: { name: sanitizeText(t.name, 80), description: t.description ? sanitizeText(t.description, 400) : null }, create: { categoryId: cat.id, locale, name: sanitizeText(t.name, 80), description: t.description ? sanitizeText(t.description, 400) : null } });
      else await db.categoryTranslation.deleteMany({ where: { categoryId: cat.id, locale } });
    }
    await audit(u.id, d.id ? "update" : "create", "category", cat.id, cat.name);
    refresh();
    return cat.id;
  });
}

export async function deleteCategory(id: string) {
  return guarded("menu.manage", async (u) => {
    const count = await db.product.count({ where: { categoryId: id } });
    if (count) throw new UserError(`Bu kategoride ${count} ürün var. Önce ürünleri taşıyın veya silin.`);
    const c = await db.category.delete({ where: { id } });
    await audit(u.id, "delete", "category", id, c.name);
    refresh();
  });
}

export async function reorderCategories(ids: string[]) {
  return guarded("menu.manage", async (u) => {
    z.array(z.string()).max(500).parse(ids);
    await db.$transaction(ids.map((id, i) => db.category.update({ where: { id }, data: { sortOrder: i } })));
    await audit(u.id, "update", "category", null, "Kategori sıralaması değişti");
    refresh();
  });
}

/* ───────────── Ürünler ───────────── */
const productSchema = z.object({
  id: z.string().optional(),
  name: txt(120).pipe(z.string().min(1, "Ürün adı gerekli")),
  slug: z.string().trim().max(100).optional(),
  description: optTxt(1000),
  ingredients: optTxt(1000),
  price: money.refine((v) => v !== null, "Fiyat gerekli"),
  oldPrice: money.optional(),
  campaignPrice: money.optional(),
  categoryId: z.string().min(1, "Kategori seçin"),
  subcategoryId: z.string().optional().nullable().transform((v) => v || null),
  calories: z.union([z.number(), z.string()]).optional().nullable().transform((v) => (v === "" || v === null || v === undefined ? null : Math.round(Number(v)))),
  portion: optTxt(60),
  prepMinutes: z.union([z.number(), z.string()]).optional().nullable().transform((v) => (v === "" || v === null || v === undefined ? null : Math.round(Number(v)))),
  spiceLevel: z.coerce.number().int().min(0).max(3),
  vegetarian: z.boolean(), vegan: z.boolean(), glutenFree: z.boolean(), featured: z.boolean(), isNew: z.boolean(), popular: z.boolean(), daily: z.boolean(),
  active: z.boolean(), inStock: z.boolean(),
  tags: z.array(z.string().trim().max(30)).max(12),
  seoTitle: optTxt(120), seoDescription: optTxt(300),
  images: z.array(z.object({ url: z.string().max(300), alt: z.string().max(160).optional().nullable() })).max(12),
  allergens: z.array(z.string()).max(20),
  translations: z.record(z.enum(["en", "de"]), z.object({ name: z.string().max(120), description: z.string().max(1000).optional(), ingredients: z.string().max(1000).optional() })),
});

const dec = (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? null : new Prisma.Decimal(v));

export async function saveProduct(input: unknown) {
  return guarded("menu.manage", async (u) => {
    const d = productSchema.parse(input);
    if (d.vegan) d.vegetarian = true;
    let slug = slugify(d.slug || d.name);
    const clash = await db.product.findUnique({ where: { slug } });
    if (clash && clash.id !== d.id) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const data = {
      name: d.name, slug, description: d.description, ingredients: d.ingredients, price: dec(d.price)!, oldPrice: dec(d.oldPrice), campaignPrice: dec(d.campaignPrice),
      categoryId: d.categoryId, subcategoryId: d.subcategoryId, calories: d.calories, portion: d.portion, prepMinutes: d.prepMinutes, spiceLevel: d.spiceLevel,
      vegetarian: d.vegetarian, vegan: d.vegan, glutenFree: d.glutenFree, featured: d.featured, isNew: d.isNew, popular: d.popular, daily: d.daily, active: d.active, inStock: d.inStock,
      tags: d.tags.filter(Boolean).map((t) => sanitizeText(t, 30)), seoTitle: d.seoTitle, seoDescription: d.seoDescription,
    };
    const before = d.id ? await db.product.findUnique({ where: { id: d.id } }) : null;
    const id = await db.$transaction(async (tx) => {
      const p = d.id ? await tx.product.update({ where: { id: d.id }, data }) : await tx.product.create({ data: { ...data, sortOrder: await tx.product.count({ where: { categoryId: d.categoryId } }) } });
      await tx.productImage.deleteMany({ where: { productId: p.id } });
      if (d.images.length) await tx.productImage.createMany({ data: d.images.map((im, i) => ({ productId: p.id, url: im.url, alt: im.alt ? sanitizeText(im.alt, 160) : d.name, sortOrder: i })) });
      await tx.productAllergen.deleteMany({ where: { productId: p.id } });
      if (d.allergens.length) await tx.productAllergen.createMany({ data: d.allergens.map((allergenId) => ({ productId: p.id, allergenId })) });
      for (const [locale, t] of Object.entries(d.translations)) {
        if (t.name.trim())
          await tx.productTranslation.upsert({
            where: { productId_locale: { productId: p.id, locale } },
            update: { name: sanitizeText(t.name, 120), description: t.description ? sanitizeText(t.description, 1000) : null, ingredients: t.ingredients ? sanitizeText(t.ingredients, 1000) : null },
            create: { productId: p.id, locale, name: sanitizeText(t.name, 120), description: t.description ? sanitizeText(t.description, 1000) : null, ingredients: t.ingredients ? sanitizeText(t.ingredients, 1000) : null },
          });
        else await tx.productTranslation.deleteMany({ where: { productId: p.id, locale } });
      }
      return p.id;
    });
    await audit(u.id, d.id ? "update" : "create", "product", id, d.name, before && Number(before.price) !== d.price ? { priceFrom: Number(before.price), priceTo: d.price } : undefined);
    refresh();
    return id;
  });
}

export async function deleteProducts(ids: string[]) {
  return guarded("menu.manage", async (u) => {
    const r = await db.product.deleteMany({ where: { id: { in: ids } } });
    await audit(u.id, "delete", "product", ids.join(","), `${r.count} ürün silindi`);
    refresh();
  });
}

export async function bulkUpdateProducts(ids: string[], patch: { active?: boolean; inStock?: boolean; featured?: boolean; categoryId?: string; priceChangePercent?: number }) {
  return guarded("menu.manage", async (u) => {
    const p = z.object({ active: z.boolean().optional(), inStock: z.boolean().optional(), featured: z.boolean().optional(), categoryId: z.string().optional(), priceChangePercent: z.number().min(-90).max(500).optional() }).parse(patch);
    const { priceChangePercent, ...rest } = p;
    if (Object.keys(rest).length) await db.product.updateMany({ where: { id: { in: ids } }, data: rest });
    if (priceChangePercent) {
      const items = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, price: true } });
      await db.$transaction(items.map((it) => db.product.update({ where: { id: it.id }, data: { price: new Prisma.Decimal(Math.round(Number(it.price) * (1 + priceChangePercent / 100))) } })));
    }
    await audit(u.id, "update", "product", ids.join(","), `${ids.length} ürün toplu güncellendi`, p);
    refresh();
  });
}

export async function quickUpdateProduct(id: string, patch: { price?: number; inStock?: boolean; active?: boolean }) {
  return guarded("menu.manage", async (u) => {
    const p = z.object({ price: z.number().min(0).max(10_000_000).optional(), inStock: z.boolean().optional(), active: z.boolean().optional() }).parse(patch);
    const prod = await db.product.update({ where: { id }, data: { ...p, price: p.price !== undefined ? new Prisma.Decimal(p.price) : undefined } });
    await audit(u.id, "update", "product", id, `${prod.name}: hızlı güncelleme`, p);
    refresh();
  });
}

export async function reorderProducts(ids: string[]) {
  return guarded("menu.manage", async () => {
    await db.$transaction(ids.map((id, i) => db.product.update({ where: { id }, data: { sortOrder: i } })));
    refresh();
  });
}

/* ───────────── Alerjenler ───────────── */
const allergenSchema = z.object({ id: z.string().optional(), key: z.string().trim().min(1).max(30), nameTr: txt(60), nameEn: txt(60), nameDe: txt(60), icon: optTxt(8) });
export async function saveAllergen(input: unknown) {
  return guarded("menu.manage", async (u) => {
    const d = allergenSchema.parse(input);
    const key = slugify(d.key);
    const a = d.id ? await db.allergen.update({ where: { id: d.id }, data: { ...d, key, id: undefined } }) : await db.allergen.create({ data: { ...d, key, id: undefined, sortOrder: await db.allergen.count() } });
    await audit(u.id, d.id ? "update" : "create", "allergen", a.id, a.nameTr);
    refresh();
  });
}
export async function deleteAllergen(id: string) {
  return guarded("menu.manage", async (u) => {
    await db.allergen.delete({ where: { id } });
    await audit(u.id, "delete", "allergen", id);
    refresh();
  });
}
