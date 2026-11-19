import { db } from "@/lib/db";
import { getPage, str } from "@/lib/content";
import { pageMetadata, breadcrumb } from "@/lib/seo";
import { PageHero } from "@/components/site/PageHero";
import { GalleryGrid } from "@/components/site/Gallery";
import { JsonLd } from "@/components/site/JsonLd";

// Statik: derleme (Yayınla) sırasında bir kez HTML olarak üretilir; Worker çalışmaz.
export const dynamic = "force-static";

export async function generateMetadata() {
  return pageMetadata("gallery", { title: "Galeri", description: "BinKılıç Saklı Bahçe'den fotoğraflar: bahçe, kahvaltı, yemekler, düğün ve organizasyonlar.", path: "/galeri" });
}

export default async function GalleryPage() {
  const [{ content: c }, items, cats] = await Promise.all([
    getPage("gallery"),
    db.galleryItem.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    db.galleryCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <>
      <PageHero eyebrow={str(c.hero, "eyebrow")} title={str(c.hero, "title")} text={str(c.hero, "text")} image={str(c.hero, "image")} />
      <section className="bg-ivory py-20 sm:py-28">
        <div className="container-x">
          {items.length ? <GalleryGrid items={items} categories={cats} /> : <p className="py-20 text-center text-charcoal/60">Galeriye yakında yeni fotoğraflar eklenecek.</p>}
        </div>
      </section>
      <JsonLd data={breadcrumb([{ name: "Galeri", path: "/galeri" }])} />
    </>
  );
}
