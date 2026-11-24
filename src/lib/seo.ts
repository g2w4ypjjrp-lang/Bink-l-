import "server-only";
import type { Metadata } from "next";
import { getPage } from "./content";
import { getSettings, type Settings } from "./settings";
import { DAY_NAMES } from "./hours";
import { normalizePhone } from "./utils";

export const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function pageMetadata(key: string, fallback: { title: string; description: string; path: string }): Promise<Metadata> {
  const [page, s] = await Promise.all([getPage(key), getSettings()]);
  const title = page.seoTitle || fallback.title;
  const description = page.seoDescription || fallback.description;
  const og = page.ogImage || (page.content.hero?.image as string) || s.business.ogImage;
  const canonical = page.canonical || fallback.path;
  return {
    title: key === "home" ? { absolute: title } : title,
    description,
    keywords: page.seoKeywords || undefined,
    alternates: { canonical },
    robots: page.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: "website", locale: "tr_TR", siteName: s.business.name, title, description, url: canonical, images: og ? [{ url: og, width: 1200, height: 630, alt: s.business.name }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: og ? [og] : undefined },
  };
}

const DAY_SCHEMA = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function restaurantSchema(s: Settings) {
  const b = s.business;
  const sameAs = Object.values(s.social).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "LocalBusiness"],
    "@id": `${APP_URL}/#restaurant`,
    name: b.name,
    alternateName: ["Saklı Bahçe Binkılıç", "Binkılıç Saklı Bahçe"],
    description: b.description,
    url: APP_URL,
    telephone: `+${normalizePhone(b.phone)}`,
    email: b.email,
    image: [`${APP_URL}${b.ogImage}`],
    logo: b.logo ? `${APP_URL}${b.logo}` : `${APP_URL}/brand/logo-card.png`,
    priceRange: b.priceRange,
    servesCuisine: b.servesCuisine.split(",").map((x) => x.trim()),
    acceptsReservations: false,
    hasMenu: `${APP_URL}/menu`,
    address: { "@type": "PostalAddress", streetAddress: b.streetAddress, addressLocality: b.locality, addressRegion: b.region, postalCode: b.postalCode, addressCountry: "TR" },
    ...(b.lat && b.lng ? { geo: { "@type": "GeoCoordinates", latitude: Number(b.lat), longitude: Number(b.lng) } } : {}),
    areaServed: ["Çatalca", "Binkılıç", "İstanbul"],
    openingHoursSpecification: s.hours.weekly
      .filter((w) => !w.closed)
      .map((w) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: `https://schema.org/${DAY_SCHEMA[w.day]}`, opens: w.open, closes: w.close === "24:00" ? "23:59" : w.close })),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumb(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Ana Sayfa", path: "/" }, ...items].map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${APP_URL}${it.path}` })),
  };
}

export const dayName = (d: number) => DAY_NAMES[d];
