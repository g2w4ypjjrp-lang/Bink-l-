import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { APP_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await db.page.findMany({ where: { noindex: false, key: { not: "reservation" } }, select: { slug: true, updatedAt: true, key: true } });
  const staticExtra = [{ slug: "/kvkk", updatedAt: new Date(), key: "kvkk" }];
  const lastMenu = await db.product.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  return [...pages, ...staticExtra].map((p) => ({
    url: `${APP_URL}${p.slug === "/" ? "" : p.slug}`,
    lastModified: p.key === "menu" ? lastMenu?.updatedAt ?? p.updatedAt : p.updatedAt,
    changeFrequency: p.key === "menu" || p.key === "campaigns" ? "daily" : "weekly",
    priority: p.key === "home" ? 1 : p.key === "menu" ? 0.9 : 0.7,
  }));
}
