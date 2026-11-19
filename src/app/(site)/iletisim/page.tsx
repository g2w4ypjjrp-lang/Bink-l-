import { Phone, Mail, MapPin, Clock, Instagram, Navigation } from "lucide-react";
import { getPage, str } from "@/lib/content";
import { getSiteData } from "@/lib/site";
import { pageMetadata, breadcrumb } from "@/lib/seo";
import { DAY_NAMES } from "@/lib/hours";
import { telLink, waLink, formatDateTR } from "@/lib/utils";
import { PageHero } from "@/components/site/PageHero";
import { SectionHeading } from "@/components/site/Section";
import { ContactForm } from "@/components/site/forms";
import { MapEmbed } from "@/components/site/MapEmbed";
import { JsonLd } from "@/components/site/JsonLd";
import { WhatsAppIcon } from "@/components/site/WhatsAppFab";

export async function generateMetadata() {
  return pageMetadata("contact", { title: "İletişim ve Yol Tarifi", description: "BinKılıç Saklı Bahçe iletişim bilgileri, çalışma saatleri, adres ve Çatalca Binkılıç yol tarifi.", path: "/iletisim" });
}

export default async function Contact() {
  const [{ content: c }, { settings: s, specials, status }] = await Promise.all([getPage("contact"), getSiteData()]);
  const b = s.business;
  const dest = encodeURIComponent(b.lat && b.lng ? `${b.lat},${b.lng}` : b.mapsQuery);
  const upcoming = specials.filter((x) => x.date >= new Date(Date.now() - 864e5)).slice(0, 5);
  return (
    <>
      <PageHero eyebrow={str(c.hero, "eyebrow")} title={str(c.hero, "title")} text={str(c.hero, "text")} image={str(c.hero, "image")} />
      <section className="bg-ivory py-20 sm:py-28">
        <div className="container-x grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: telLink(b.phone), icon: Phone, label: "Telefon", value: b.phone },
            { href: waLink(b.whatsapp, "Merhaba!"), icon: WhatsAppIcon, label: "WhatsApp", value: "Mesaj gönderin", ext: true },
            { href: `mailto:${b.email}`, icon: Mail, label: "E-posta", value: b.email },
            ...(s.social.instagram ? [{ href: s.social.instagram, icon: Instagram, label: "Instagram", value: "Bizi takip edin", ext: true }] : []),
          ].map((x) => (
            <a key={x.label} href={x.href} {...(x.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} data-reveal className="group rounded-[24px] border border-beige p-7 transition hover:border-forest hover:bg-cream">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-cream">
                <x.icon size={20} />
              </span>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-dark">{x.label}</p>
              <p className="mt-1.5 break-all font-display text-xl text-forest">{x.value}</p>
            </a>
          ))}
        </div>
        <div className="container-x mt-16 grid gap-12 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-5">
            <div data-reveal>
              <h2 className="flex items-center gap-3 font-display text-3xl text-forest">
                <MapPin className="text-gold" /> Adres
              </h2>
              <address className="mt-4 not-italic leading-relaxed text-charcoal/75">{b.address}</address>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  <Navigation size={16} /> Yol tarifi al
                </a>
                <a href={`https://www.google.com/maps/search/?api=1&query=${dest}`} target="_blank" rel="noopener noreferrer" className="btn-ghost text-forest">
                  Haritada aç
                </a>
                <a href={`https://maps.apple.com/?daddr=${dest}`} target="_blank" rel="noopener noreferrer" className="btn-ghost text-forest">
                  Apple Haritalar
                </a>
              </div>
            </div>
            <div data-reveal>
              <h2 className="flex items-center gap-3 font-display text-3xl text-forest">
                <Clock className="text-gold" /> Çalışma saatleri
              </h2>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                <span className={`h-2 w-2 rounded-full ${status.open ? "bg-emerald-500" : "bg-red-500"}`} />
                {status.label} <span className="font-normal text-charcoal/55">· {status.detail}</span>
              </p>
              <dl className="mt-5 divide-y divide-beige rounded-2xl border border-beige">
                {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                  const w = s.hours.weekly.find((x) => x.day === day);
                  return (
                    <div key={day} className="flex justify-between px-5 py-3 text-sm">
                      <dt>{DAY_NAMES[day]}</dt>
                      <dd className="tabular-nums text-charcoal/70">{!w || w.closed ? "Kapalı" : `${w.open} – ${w.close === "24:00" ? "00:00" : w.close}`}</dd>
                    </div>
                  );
                })}
              </dl>
              {s.hours.note && <p className="mt-3 text-xs text-charcoal/55">{s.hours.note}</p>}
              {upcoming.length > 0 && (
                <div className="mt-5 rounded-2xl bg-gold/10 p-5 text-sm">
                  <p className="font-semibold text-gold-dark">Özel günler</p>
                  <ul className="mt-2 space-y-1">
                    {upcoming.map((x) => (
                      <li key={x.date.toISOString()}>
                        {formatDateTR(x.date.toISOString().slice(0, 10))} · {x.title}: {x.closed ? "Kapalı" : `${x.open ?? ""}–${x.close ?? ""}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="min-h-[460px] lg:col-span-7" data-reveal="scale">
            <MapEmbed query={b.mapsQuery} lat={b.lat} lng={b.lng} title={`${b.name} konumu`} />
          </div>
        </div>
      </section>
      <section className="bg-cream py-24 sm:py-32">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading eyebrow={str(c.form, "eyebrow")} title={str(c.form, "title")} text={str(c.form, "text")} />
          </div>
          <div className="rounded-[32px] bg-ivory p-6 sm:p-10 lg:col-span-7 lg:col-start-6" data-reveal>
            <ContactForm />
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumb([{ name: "İletişim", path: "/iletisim" }])} />
    </>
  );
}
