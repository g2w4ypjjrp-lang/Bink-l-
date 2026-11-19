import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { PAGES } from "@/lib/page-schema";
import { APP_URL } from "@/lib/seo";
import { SeoAdmin } from "./SeoAdmin";

export const metadata = { title: "SEO" };

export default async function SeoPage() {
  await requirePagePermission("seo.manage");
  const rows = await db.page.findMany();
  const products = await db.product.count({ where: { OR: [{ seoTitle: null }, { seoTitle: "" }], active: true } });
  const imgsNoAlt = await db.galleryItem.count({ where: { OR: [{ alt: null }, { alt: "" }], active: true } });
  return (
    <SeoAdmin
      appUrl={APP_URL}
      checks={{ productsNoSeo: products, imgsNoAlt }}
      pages={PAGES.map((p) => {
        const r = rows.find((x) => x.key === p.key);
        return { key: p.key, title: p.title, slug: p.slug, seoTitle: r?.seoTitle ?? "", seoDescription: r?.seoDescription ?? "", seoKeywords: r?.seoKeywords ?? "", ogImage: r?.ogImage ?? "", canonical: r?.canonical ?? "", noindex: r?.noindex ?? false };
      })}
    />
  );
}
