import { getMenuData } from "@/lib/menu";
import { getSiteData } from "@/lib/site";
import { getPage, str } from "@/lib/content";
import { pageMetadata, APP_URL } from "@/lib/seo";
import { telLink, waLink } from "@/lib/utils";
import { db } from "@/lib/db";
import { MenuApp } from "@/components/menu/MenuApp";
import { JsonLd } from "@/components/site/JsonLd";
import { StatusProvider } from "@/components/site/LiveStatus";
import { hoursData } from "@/lib/hours";

// Statik: derleme sırasında bir kez üretilir. Masa (?table=&t=), dil (?lang=) ve ürün (?urun=) tarayıcıda okunur.
export const dynamic = "force-static";

export async function generateMetadata() {
  return pageMetadata("menu", {
    title: "Dijital Menü — Kahvaltı, Izgara, Tatlı ve İçecekler",
    description: "BinKılıç Saklı Bahçe dijital menüsü: serpme kahvaltı, ızgara, salata, tatlı ve içecekler. Fotoğraflı ürünler, alerjen bilgileri ve güncel fiyatlar.",
    path: "/menu",
  });
}

export default async function MenuPage() {
  const [menu, { settings: s, status, specials }, page, tableRows] = await Promise.all([
    getMenuData(),
    getSiteData(),
    getPage("menu"),
    db.table.findMany({ where: { active: true }, select: { number: true, name: true }, orderBy: { number: "asc" } }),
  ]);
  const locale = s.menu.defaultLocale;

  const menuSchema = {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `${s.business.name} Menü`,
    url: `${APP_URL}/menu`,
    inLanguage: "tr",
    hasMenuSection: menu.categories.map((c) => ({
      "@type": "MenuSection",
      name: c.name.tr,
      hasMenuItem: menu.products
        .filter((p) => p.categoryId === c.id)
        .map((p) => ({
          "@type": "MenuItem",
          name: p.name.tr,
          description: p.description.tr || undefined,
          image: p.images[0] ? `${APP_URL}${p.images[0].url}` : undefined,
          offers: { "@type": "Offer", price: p.campaignPrice ?? p.price, priceCurrency: s.menu.currency, availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
          suitableForDiet: [p.vegan && "https://schema.org/VeganDiet", p.vegetarian && "https://schema.org/VegetarianDiet", p.glutenFree && "https://schema.org/GlutenFreeDiet"].filter(Boolean),
        })),
    })),
  };

  return (
    <StatusProvider hours={hoursData(s.hours.weekly, specials)} initial={status}>
      <MenuApp
        data={menu}
        initialLocale={locale}
        locales={s.menu.locales}
        currency={s.menu.currency}
        showPrices={s.menu.showPrices}
        orderingEnabled={s.menu.orderingEnabled}
        footerNote={s.menu.footerNote}
        tables={tableRows}
        business={{ name: s.business.name, phone: s.business.phone, tel: telLink(s.business.phone), wa: waLink(s.business.whatsapp), address: s.business.address, logo: s.business.logo }}
        status={status}
        cover={{ title: str(page.content.hero, "title"), text: str(page.content.hero, "text"), image: str(page.content.hero, "image") }}
      />
      <JsonLd data={menuSchema} />
    </StatusProvider>
  );
}
