import { Phone } from "lucide-react";
import { getPage, str } from "@/lib/content";
import { getSiteData } from "@/lib/site";
import { pageMetadata, breadcrumb } from "@/lib/seo";
import { telLink, waLink } from "@/lib/utils";
import { PageHero } from "@/components/site/PageHero";
import { ReservationForm } from "@/components/site/forms";
import { JsonLd } from "@/components/site/JsonLd";
import { WhatsAppIcon } from "@/components/site/WhatsAppFab";

export async function generateMetadata() {
  return pageMetadata("reservation", { title: "Online Rezervasyon", description: "BinKılıç Saklı Bahçe için online masa rezervasyonu. Kahvaltı, öğle ve akşam yemeği için yerinizi ayırtın.", path: "/rezervasyon" });
}

export default async function Reservation() {
  const [{ content: c }, { settings: s, status }] = await Promise.all([getPage("reservation"), getSiteData()]);
  return (
    <>
      <PageHero eyebrow={str(c.hero, "eyebrow")} title={str(c.hero, "title")} text={str(c.hero, "text")} image={str(c.hero, "image")} />
      <section className="bg-ivory py-20 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-[28px] bg-forest p-8 text-cream" data-reveal>
              <p className="eyebrow">Bilgi</p>
              <p className="mt-5 flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 rounded-full ${status.open ? "bg-emerald-400" : "bg-red-400"}`} /> {status.label} · {status.detail}
              </p>
              {str(c.hero, "policy") && <p className="mt-5 text-sm leading-relaxed text-cream/75">{str(c.hero, "policy")}</p>}
              <div className="mt-8 space-y-3">
                <a href={telLink(s.business.phone)} className="btn-light w-full">
                  <Phone size={16} /> {s.business.phone}
                </a>
                <a href={waLink(s.business.whatsapp, "Merhaba, rezervasyon yapmak istiyorum.")} target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#1d7a46] text-white">
                  <WhatsAppIcon size={18} /> WhatsApp ile rezervasyon
                </a>
              </div>
            </div>
          </aside>
          <div className="rounded-[32px] border border-beige/80 bg-cream/60 p-6 sm:p-10 lg:col-span-8" data-reveal>
            {s.reservation.enabled ? (
              <ReservationForm seatingOptions={s.reservation.seatingOptions} maxGuests={s.reservation.maxGuests} maxDaysAhead={s.reservation.maxDaysAhead} />
            ) : (
              <p className="py-16 text-center text-charcoal/70">Online rezervasyon şu an kapalıdır. Lütfen telefon veya WhatsApp üzerinden bize ulaşın.</p>
            )}
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumb([{ name: "Rezervasyon", path: "/rezervasyon" }])} />
    </>
  );
}
