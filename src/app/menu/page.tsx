import { getMenuData } from "@/lib/menu";
import { getSiteData } from "@/lib/site";
import { getPage, str } from "@/lib/content";
import { pageMetadata, APP_URL } from "@/lib/seo";
import { isLocale } from "@/lib/i18n";
import { telLink, waLink } from "@/lib/utils";
import { db } from "@/lib/db";
import { MenuApp } from "@/components/menu/MenuApp";
import { JsonLd } from "@/components/site/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return pageMetadata("menu", {
    title: "Dijital Menü — Kahvaltı, Izgara, Tatlı ve İçecekler",
    description: "BinKılıç Saklı Bahçe dijital menüsü: serpme kahvaltı, ızgara, salata, tatlı ve içecekler. Fotoğraflı ürünler, alerjen bilgileri ve güncel fiyatlar.",
    path: "/menu",
  });
}

export default async function MenuPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [menu, { settings: s, status }, page] = await Promise.all([getMenuData(), getSiteData(), getPage("menu")]);
  const tableNo = sp.table ? Number(sp.table) : null;
  let table: { number: number; token: string; name: string | null } | null = null;
  if (tableNo && Number.isInteger(tableNo)) {
    const t = await db.table.findUnique({ where: { number: tableNo } });
    if (t && t.active) table = { number: t.number, token: sp.t && sp.t === t.orderToken ? t.orderToken : "", name: t.name };
  }
  const locale = isLocale(sp.lang) ? sp.lang : s.menu.defaultLocale;

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
    <>
      <MenuApp
        data={menu}
        initialLocale={locale}
        locales={s.menu.locales}
        currency={s.menu.currency}
        showPrices={s.menu.showPrices}
        orderingEnabled={s.menu.orderingEnabled}
        footerNote={s.menu.footerNote}
        table={table}
        openProductSlug={sp.urun ?? null}
        fromQr={sp.src === "qr"}
        business={{ name: s.business.name, phone: s.business.phone, tel: telLink(s.business.phone), wa: waLink(s.business.whatsapp), address: s.business.address, logo: s.business.logo }}
        status={status}
        cover={{ title: str(page.content.hero, "title"), text: str(page.content.hero, "text"), image: str(page.content.hero, "image") }}
      />
      <JsonLd data={menuSchema} />
    </>
  );
}
