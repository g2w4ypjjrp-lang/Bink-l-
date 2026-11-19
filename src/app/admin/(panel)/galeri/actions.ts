"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/security";
import { deleteUpload } from "@/lib/storage";
import { slugify } from "@/lib/utils";

const refresh = () => { revalidatePath("/admin/galeri"); revalidatePath("/galeri"); revalidatePath("/"); };

export async function addGalleryItems(items: unknown) {
  return guarded("gallery.manage", async (u) => {
    const list = z.array(z.object({ url: z.string().max(300), thumbUrl: z.string().max(300).optional(), width: z.number().optional(), height: z.number().optional(), type: z.enum(["image", "video"]), categoryId: z.string().nullable() })).max(50).parse(items);
    const base = await db.galleryItem.count();
    await db.galleryItem.createMany({ data: list.map((it, i) => ({ ...it, sortOrder: base + i })) });
    await audit(u.id, "create", "gallery", null, `${list.length} medya yüklendi`);
    refresh();
  });
}

export async function updateGalleryItem(input: unknown) {
  return guarded("gallery.manage", async (u) => {
    const d = z.object({ id: z.string(), title: z.string().max(160), description: z.string().max(500), alt: z.string().max(200), categoryId: z.string().nullable(), showOnHome: z.boolean(), active: z.boolean(), thumbUrl: z.string().max(300).optional() }).parse(input);
    await db.galleryItem.update({ where: { id: d.id }, data: { title: sanitizeText(d.title, 160) || null, description: sanitizeText(d.description, 500) || null, alt: sanitizeText(d.alt, 200) || null, categoryId: d.categoryId || null, showOnHome: d.showOnHome, active: d.active, thumbUrl: d.thumbUrl } });
    await audit(u.id, "update", "gallery", d.id);
    refresh();
  });
}

export async function bulkGallery(ids: string[], patch: { showOnHome?: boolean; active?: boolean; categoryId?: string | null }) {
  return guarded("gallery.manage", async (u) => {
    await db.galleryItem.updateMany({ where: { id: { in: ids } }, data: patch });
    await audit(u.id, "update", "gallery", ids.join(","), JSON.stringify(patch));
    refresh();
  });
}

export async function deleteGallery(ids: string[]) {
  return guarded("gallery.manage", async (u) => {
    const items = await db.galleryItem.findMany({ where: { id: { in: ids } } });
    await db.galleryItem.deleteMany({ where: { id: { in: ids } } });
    for (const it of items) {
      await deleteUpload(it.url);
      if (it.thumbUrl && it.type === "video") await deleteUpload(it.thumbUrl);
    }
    await audit(u.id, "delete", "gallery", ids.join(","), `${items.length} medya silindi`);
    refresh();
  });
}

export async function reorderGallery(ids: string[]) {
  return guarded("gallery.manage", async () => {
    await db.$transaction(ids.map((id, i) => db.galleryItem.update({ where: { id }, data: { sortOrder: i } })));
    refresh();
  });
}

export async function saveGalleryCategory(input: unknown) {
  return guarded("gallery.manage", async (u) => {
    const d = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(60) }).parse(input);
    if (d.id) await db.galleryCategory.update({ where: { id: d.id }, data: { name: sanitizeText(d.name, 60) } });
    else await db.galleryCategory.create({ data: { name: sanitizeText(d.name, 60), slug: slugify(d.name) || `k-${Date.now()}`, sortOrder: await db.galleryCategory.count() } });
    await audit(u.id, "update", "gallery_category", d.id ?? null, d.name);
    refresh();
  });
}

export async function deleteGalleryCategory(id: string) {
  return guarded("gallery.manage", async (u) => {
    await db.galleryCategory.delete({ where: { id } });
    await audit(u.id, "delete", "gallery_category", id);
    refresh();
  });
}
