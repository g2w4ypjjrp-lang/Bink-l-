import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { WhatsAppFab } from "@/components/site/WhatsAppFab";
import { RevealObserver, ParallaxObserver } from "@/components/site/Reveal";
import { Tracker } from "@/components/site/Tracker";
import { JsonLd } from "@/components/site/JsonLd";
import { getSiteData } from "@/lib/site";
import { restaurantSchema } from "@/lib/seo";
import { telLink, waLink } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { settings: s, status } = await getSiteData();
  const directions = s.business.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.business.lat && s.business.lng ? `${s.business.lat},${s.business.lng}` : s.business.mapsQuery)}`;
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-forest focus:px-5 focus:py-3 focus:text-cream">
        İçeriğe geç
      </a>
      {s.site.announcementActive && s.site.announcement && (
        <div className="relative z-[60] bg-gold px-4 py-2 text-center text-xs font-semibold tracking-wide text-deep">{s.site.announcement}</div>
      )}
      <Header logo={s.business.logo} phone={s.business.phone} telHref={telLink(s.business.phone)} status={status} />
      <main id="main">{children}</main>
      <Footer s={s} directionsUrl={directions} />
      {s.site.whatsappFloating && <WhatsAppFab href={waLink(s.business.whatsapp, "Merhaba, BinKılıç Saklı Bahçe hakkında bilgi almak istiyorum.")} />}
      <JsonLd data={restaurantSchema(s)} />
      <RevealObserver />
      <ParallaxObserver />
      <Tracker />
    </>
  );
}
