import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPage, str, list } from "@/lib/content";
import { pageMetadata, breadcrumb } from "@/lib/seo";
import { PageHero } from "@/components/site/PageHero";
import { SectionHeading, Paragraphs } from "@/components/site/Section";
import { JsonLd } from "@/components/site/JsonLd";

export async function generateMetadata() {
  return pageMetadata("about", { title: "Hakkımızda", description: "BinKılıç Saklı Bahçe'nin hikâyesi: Çatalca Binkılıç'ta doğaya bağlı bir aile işletmesi.", path: "/hakkimizda" });
}

const d = (ms: number) => ({ ["--reveal-delay" as string]: `${ms}ms` });

function Split({ section, reverse = false, bg = "bg-ivory" }: { section: Record<string, unknown>; reverse?: boolean; bg?: string }) {
  if (section.visible === false) return null;
  return (
    <section className={`${bg} py-24 sm:py-32`}>
      <div className={`container-x grid items-center gap-14 lg:grid-cols-12`}>
        {str(section, "image") && (
          <div data-reveal="scale" className={`img-zoom relative aspect-[5/6] overflow-hidden rounded-[32px] lg:col-span-5 ${reverse ? "lg:order-2 lg:col-start-8" : ""}`}>
            <Image src={str(section, "image")} alt={str(section, "title")} fill sizes="(max-width:1024px) 100vw, 40vw" className="object-cover" />
          </div>
        )}
        <div className={`lg:col-span-6 ${reverse ? "lg:order-1" : "lg:col-start-7"}`}>
          <SectionHeading eyebrow={str(section, "eyebrow")} title={str(section, "title")} />
          <Paragraphs text={str(section, "text")} className="mt-8 text-[15.5px] leading-[1.85] text-charcoal/75" />
        </div>
      </div>
    </section>
  );
}

export default async function About() {
  const { content: c } = await getPage("about");
  return (
    <>
      <PageHero eyebrow={str(c.hero, "eyebrow")} title={str(c.hero, "title")} text={str(c.hero, "text")} image={str(c.hero, "image")} />
      <Split section={c.story} />
      <Split section={c.family} reverse bg="bg-cream" />
      <Split section={c.nature} />
      {c.hospitality.visible !== false && (
        <section className="relative overflow-hidden bg-forest py-28 text-center text-cream grain sm:py-40">
          <div className="container-x">
            <p className="eyebrow justify-center" data-reveal>{str(c.hospitality, "eyebrow")}</p>
            <h2 className="h-display mx-auto mt-6 max-w-4xl text-5xl sm:text-7xl" data-reveal style={d(100)}>
              <em className="italic">{str(c.hospitality, "title")}</em>
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-cream/75" data-reveal style={d(200)}>{str(c.hospitality, "text")}</p>
          </div>
        </section>
      )}
      {c.experience.visible !== false && (
        <section className="bg-ivory py-24 sm:py-32">
          <div className="container-x">
            <SectionHeading eyebrow={str(c.experience, "eyebrow")} title={str(c.experience, "title")} text={str(c.experience, "text")} />
            <div className="mt-14 grid gap-4 sm:grid-cols-12">
              {["image", "image2", "image3"].map((k, i) =>
                str(c.experience, k) ? (
                  <div key={k} data-reveal="scale" style={d(i * 120)} className={`img-zoom relative overflow-hidden rounded-[28px] ${i === 0 ? "aspect-[4/5] sm:col-span-5" : i === 1 ? "aspect-[4/5] sm:col-span-4 sm:mt-16" : "aspect-[4/5] sm:col-span-3 sm:mt-32"}`}>
                    <Image src={str(c.experience, k)} alt="" fill sizes="(max-width:640px) 100vw, 40vw" className="object-cover" />
                  </div>
                ) : null
              )}
            </div>
          </div>
        </section>
      )}
      {c.timeline.visible !== false && (
        <section className="bg-cream py-24 sm:py-32">
          <div className="container-x">
            <SectionHeading eyebrow={str(c.timeline, "eyebrow")} title={str(c.timeline, "title")} />
            <ol className="relative mt-16 grid gap-10 md:grid-cols-4">
              <span className="absolute left-0 right-0 top-[11px] hidden h-px bg-gold/40 md:block" aria-hidden="true" />
              {list<{ year: string; title: string; text: string }>(c.timeline, "items").map((it, i) => (
                <li key={i} className="relative" data-reveal style={d(i * 120)}>
                  <span className="relative z-10 block h-[22px] w-[22px] rounded-full border-4 border-cream bg-gold" />
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-gold-dark">{it.year}</p>
                  <h3 className="mt-2 font-display text-2xl text-forest">{it.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal/65">{it.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
      <section className="bg-ivory py-24 sm:py-32">
        <div className="container-x grid gap-6 md:grid-cols-2">
          {[c.mission, c.vision].map((sec, i) =>
            sec.visible !== false ? (
              <div key={i} data-reveal style={d(i * 120)} className={`rounded-[32px] p-10 sm:p-14 ${i === 0 ? "bg-forest text-cream" : "bg-beige/50 text-forest"}`}>
                <p className="eyebrow">{str(sec, "eyebrow")}</p>
                <p className="mt-8 font-display text-[1.9rem] leading-snug">{str(sec, "text")}</p>
              </div>
            ) : null
          )}
        </div>
        {c.values.visible !== false && (
          <div className="container-x mt-24">
            <SectionHeading eyebrow={str(c.values, "eyebrow")} title={str(c.values, "title")} />
            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {list<{ title: string; text: string }>(c.values, "items").map((v, i) => (
                <div key={i} data-reveal style={d(i * 100)} className="border-t border-forest/20 pt-6">
                  <h3 className="font-display text-3xl text-forest">{v.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-charcoal/65">{v.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-20 flex flex-wrap gap-3" data-reveal>
              <Link href="/rezervasyon" className="btn-primary">
                Rezervasyon yapın <ArrowRight size={16} />
              </Link>
              <Link href="/galeri" className="btn-ghost text-forest">
                Galeriyi gezin
              </Link>
            </div>
          </div>
        )}
      </section>
      <JsonLd data={breadcrumb([{ name: "Hakkımızda", path: "/hakkimizda" }])} />
    </>
  );
}
