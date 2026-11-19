import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { getPage, str, list } from "@/lib/content";
import { pageMetadata, breadcrumb } from "@/lib/seo";
import { BUDGETS } from "@/lib/validation";
import { getSettings } from "@/lib/settings";
import { telLink, waLink } from "@/lib/utils";
import { PageHero } from "@/components/site/PageHero";
import { SectionHeading, Paragraphs } from "@/components/site/Section";
import { EventForm } from "@/components/site/forms";
import { JsonLd } from "@/components/site/JsonLd";
import { WhatsAppIcon } from "@/components/site/WhatsAppFab";

export async function generateMetadata() {
  return pageMetadata("organization", {
    title: "Organizasyon — Doğum Günü, Nişan, Düğün, Kurumsal Etkinlik",
    description: "Çatalca'da doğa içinde organizasyon: doğum günü, nişan, söz, evlilik teklifi, kır düğünü, kına ve kurumsal etkinlikler için BinKılıç Saklı Bahçe.",
    path: "/organizasyon",
  });
}

const d = (ms: number) => ({ ["--reveal-delay" as string]: `${ms}ms` });

export default async function Organization({ searchParams }: { searchParams: Promise<{ tur?: string }> }) {
  const [{ content: c }, events, s, sp] = await Promise.all([getPage("organization"), db.event.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), getSettings(), searchParams]);
  return (
    <>
      <PageHero eyebrow={str(c.hero, "eyebrow")} title={str(c.hero, "title")} text={str(c.hero, "text")} image={str(c.hero, "image")} />
      {c.intro.visible !== false && (
        <section className="bg-ivory py-24 sm:py-32">
          <div className="container-x grid items-center gap-14 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <SectionHeading eyebrow={str(c.intro, "eyebrow")} title={str(c.intro, "title")} />
              <Paragraphs text={str(c.intro, "text")} className="mt-8 text-[15.5px] leading-[1.85] text-charcoal/75" />
            </div>
            {str(c.intro, "image") && (
              <div data-reveal="scale" className="relative aspect-[4/3] overflow-hidden rounded-[32px] lg:col-span-5 lg:col-start-8">
                <Image src={str(c.intro, "image")} alt="" fill sizes="(max-width:1024px) 100vw, 40vw" className="object-cover" />
              </div>
            )}
          </div>
        </section>
      )}
      <section className="bg-cream py-24 sm:py-32">
        <div className="container-x">
          <SectionHeading eyebrow="Organizasyon türleri" title="Her kutlamaya özel" />
          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e, i) => (
              <li key={e.id} data-reveal style={d((i % 3) * 90)}>
                <a href={`?tur=${e.key}#basvuru`} className="img-zoom group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-[26px] bg-forest p-6 text-cream">
                  {e.image && <Image src={e.image} alt="" fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover opacity-75" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-deep/95 via-deep/30 to-transparent" />
                  <div className="relative">
                    <h3 className="flex items-center justify-between font-display text-3xl">
                      {e.name} <ArrowUpRight size={20} className="text-gold transition group-hover:rotate-45" />
                    </h3>
                    {e.description && <p className="mt-2 line-clamp-2 text-sm text-cream/75">{e.description}</p>}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
      {c.process.visible !== false && (
        <section className="relative overflow-hidden bg-deep py-24 text-cream grain sm:py-32">
          <div className="container-x">
            <SectionHeading eyebrow={str(c.process, "eyebrow")} title={str(c.process, "title")} tone="light" />
            <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {list<{ title: string; text: string }>(c.process, "items").map((it, i) => (
                <li key={i} data-reveal style={d(i * 120)}>
                  <span className="font-display text-6xl text-gold/70">{i + 1}</span>
                  <h3 className="mt-4 font-display text-2xl">{it.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cream/65">{it.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
      <section id="basvuru" className="scroll-mt-24 bg-ivory py-24 sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading eyebrow={str(c.form, "eyebrow")} title={str(c.form, "title")} text={str(c.form, "text")} />
            <div className="mt-10 space-y-3" data-reveal>
              <a href={telLink(s.business.phone)} className="btn-ghost w-full text-forest">Hemen arayın · {s.business.phone}</a>
              <a href={waLink(s.business.whatsapp, "Merhaba, organizasyon hakkında bilgi almak istiyorum.")} target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#1d7a46] text-white">
                <WhatsAppIcon size={18} /> WhatsApp ile bilgi alın
              </a>
            </div>
          </div>
          <div className="rounded-[32px] border border-beige/80 bg-cream/60 p-6 sm:p-10 lg:col-span-7 lg:col-start-6" data-reveal>
            <EventForm types={events.map((e) => ({ key: e.key, name: e.name }))} budgets={BUDGETS} initialType={sp.tur} />
          </div>
        </div>
        <p className="mt-10 text-center text-sm text-charcoal/55">
          Masa rezervasyonu mu yapmak istiyorsunuz?{" "}
          <Link href="/rezervasyon" className="font-semibold text-forest underline underline-offset-4">
            Rezervasyon sayfası
          </Link>
        </p>
      </section>
      <JsonLd data={breadcrumb([{ name: "Organizasyon", path: "/organizasyon" }])} />
    </>
  );
}
