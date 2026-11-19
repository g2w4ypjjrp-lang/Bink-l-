import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Phone, Mail, Instagram, MapPin, Navigation, Star, Clock, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { getPage, str, list } from "@/lib/content";
import { getSiteData } from "@/lib/site";
import { getMenuData, effectivePrice, activeCampaignWhere } from "@/lib/menu";
import { pageMetadata } from "@/lib/seo";
import { formatPrice, telLink, waLink, toNumber, formatDateTR } from "@/lib/utils";
import { SectionHeading, Paragraphs } from "@/components/site/Section";
import { ReservationForm } from "@/components/site/forms";
import { GalleryGrid } from "@/components/site/Gallery";
import { MapEmbed } from "@/components/site/MapEmbed";
import { WhatsAppIcon } from "@/components/site/WhatsAppFab";
import { JsonLd } from "@/components/site/JsonLd";

export async function generateMetadata() {
  return pageMetadata("home", {
    title: "BinKılıç Saklı Bahçe | Çatalca'da Doğa İçinde Restoran & Kahvaltı",
    description: "Çatalca Binkılıç'ta orman içinde serpme kahvaltı, ızgara ve aile restoranı. Organizasyon ve online rezervasyon.",
    path: "/",
  });
}

const d = (ms: number) => ({ ["--reveal-delay" as string]: `${ms}ms` });

export default async function Home() {
  const [page, { settings: s, status }, menu, reviews, gallery, galleryCats, events, campaigns] = await Promise.all([
    getPage("home"),
    getSiteData(),
    getMenuData(),
    db.review.findMany({ where: { visible: true }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { date: "desc" }], take: 9 }),
    db.galleryItem.findMany({ where: { active: true, showOnHome: true }, orderBy: { sortOrder: "asc" }, take: 9 }),
    db.galleryCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.event.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.campaign.findMany({ where: { ...(await activeCampaignWhere()), showOnHome: true }, orderBy: { sortOrder: "asc" }, take: 3 }),
  ]);
  const c = page.content;
  const b = s.business;
  const featured = menu.products.filter((p) => p.featured).slice(0, 6);
  const hero = c.hero;
  const directions = b.googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.lat && b.lng ? `${b.lat},${b.lng}` : b.mapsQuery)}`;
  const openMap = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.lat && b.lng ? `${b.lat},${b.lng}` : b.mapsQuery)}`;
  const waze = b.lat && b.lng ? `https://waze.com/ul?ll=${b.lat},${b.lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(b.mapsQuery)}&navigate=yes`;
  const faqItems = list<{ q: string; a: string }>(c.faq, "items");
  const titleWords = str(hero, "title").split(",");

  return (
    <>
      {/* 1 · HERO */}
      {hero.visible !== false && (
        <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-deep text-cream">
          {str(hero, "video") ? (
            <video className="absolute inset-0 -z-10 h-full w-full object-cover" src={str(hero, "video")} poster={str(hero, "image")} autoPlay muted loop playsInline preload="none" />
          ) : (
            str(hero, "image") && <Image src={str(hero, "image")} alt="Saklı Bahçe'yi çevreleyen orman" fill priority sizes="100vw" quality={60} className="-z-10 animate-ken-burns object-cover" />
          )}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,41,29,0.55)_0%,rgba(16,41,29,0.15)_35%,rgba(16,41,29,0.55)_70%,rgba(16,41,29,0.95)_100%)]" />
          <div className="container-x pb-24 pt-40 sm:pb-28">
            <div className="max-w-5xl">
              <p className="eyebrow animate-fade-up">{str(hero, "eyebrow")}</p>
              <h1 className="h-display mt-6 animate-rise text-[3.4rem] [animation-delay:120ms] sm:text-[5rem] lg:text-[7.2rem]">
                {titleWords.length > 1 ? (
                  <>
                    {titleWords[0]},<br />
                    <em className="font-normal italic text-beige">{titleWords.slice(1).join(",").trim()}</em>
                  </>
                ) : (
                  str(hero, "title")
                )}
              </h1>
              <p className="mt-7 max-w-xl animate-rise text-base leading-relaxed text-cream/80 [animation-delay:240ms] sm:text-lg">{str(hero, "text")}</p>
              <div className="mt-10 flex animate-fade-up flex-wrap gap-3 [animation-delay:360ms]">
                <Link href="/menu" className="btn-light !px-7 !py-4">
                  {str(hero, "menuButton") || "Menüye Göz At"} <ArrowRight size={16} />
                </Link>
                <Link href="/rezervasyon" className="btn-gold !px-7 !py-4">
                  {str(hero, "reservationButton") || "Rezervasyon Yap"}
                </Link>
                <a href={waLink(b.whatsapp, "Merhaba, bilgi almak istiyorum.")} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-6 !py-4 text-cream">
                  <WhatsAppIcon size={18} /> WhatsApp
                </a>
              </div>
            </div>
          </div>
          <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-cream/60 md:flex">
            <span className="relative flex h-10 w-6 justify-center rounded-full border border-cream/40 pt-2">
              <span className="h-2 w-1 animate-scroll-dot rounded-full bg-cream" />
            </span>
            Keşfet
          </div>
          <div className="absolute bottom-9 right-12 hidden items-center gap-2 rounded-full border border-cream/15 bg-deep/30 px-4 py-2 text-xs backdrop-blur lg:flex">
            <Clock size={14} className="text-gold" /> {status.label} · <span className="text-cream/60">{status.detail}</span>
          </div>
        </section>
      )}

      {/* 2 · MARKA HİKÂYESİ */}
      {c.story.visible !== false && (
        <section className="relative overflow-hidden bg-ivory py-24 sm:py-36">
          <div className="container-x grid items-center gap-16 lg:grid-cols-12">
            <div className="relative lg:col-span-6">
              <div data-reveal="scale" className="img-zoom relative aspect-[4/5] w-[82%] overflow-hidden rounded-[32px]">
                {str(c.story, "image") && <Image src={str(c.story, "image")} alt="Saklı Bahçe orman patikası" fill sizes="(max-width:1024px) 80vw, 40vw" className="object-cover" />}
              </div>
              {str(c.story, "image2") && (
                <div data-reveal style={d(200)} className="absolute -bottom-10 right-0 aspect-square w-[46%] overflow-hidden rounded-[28px] border-[10px] border-ivory shadow-2xl">
                  <Image src={str(c.story, "image2")} alt="Serpme kahvaltı sofrası" fill sizes="25vw" className="object-cover" />
                </div>
              )}
              <div className="absolute -left-6 top-10 hidden h-28 w-28 items-center justify-center rounded-full bg-gold text-center font-display text-sm leading-tight text-deep shadow-xl lg:flex" data-reveal style={d(300)}>
                Aile
                <br />
                işletmesi
              </div>
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <SectionHeading eyebrow={str(c.story, "eyebrow")} title={str(c.story, "title")} />
              <Paragraphs text={str(c.story, "text")} className="mt-8 text-[15.5px] leading-[1.85] text-charcoal/75" />
              {str(c.story, "signature") && <p className="mt-8 font-display text-2xl italic text-gold-dark">{str(c.story, "signature")}</p>}
              <Link href="/hakkimizda" className="group mt-10 inline-flex items-center gap-3 text-sm font-semibold text-forest">
                Hikâyemizin devamı
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-forest/25 transition group-hover:bg-forest group-hover:text-cream">
                  <ArrowRight size={16} />
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3 · ATMOSFER */}
      {c.atmosphere.visible !== false && (
        <section className="relative overflow-hidden bg-forest py-24 text-cream grain sm:py-36">
          <div className="container-x">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
              <SectionHeading eyebrow={str(c.atmosphere, "eyebrow")} title={str(c.atmosphere, "title")} tone="light" className="lg:col-span-7" />
              <p data-reveal className="text-[15.5px] leading-relaxed text-cream/70 lg:col-span-4 lg:col-start-9">
                {str(c.atmosphere, "text")}
              </p>
            </div>
            {str(c.atmosphere, "image") && (
              <div data-reveal="scale" className="relative mt-16 aspect-[16/10] overflow-hidden rounded-[32px] sm:aspect-[21/9]">
                <Image src={str(c.atmosphere, "image")} alt="Saklı Bahçe atmosferi" fill sizes="100vw" className="object-cover" data-parallax="0.12" />
              </div>
            )}
            <div className="mt-16 grid gap-10 sm:grid-cols-3">
              {list<{ title: string; text: string }>(c.atmosphere, "items").map((it, i) => (
                <div key={i} data-reveal style={d(i * 120)} className="border-t border-cream/15 pt-6">
                  <span className="font-display text-5xl text-gold/80">0{i + 1}</span>
                  <h3 className="mt-4 font-display text-2xl">{it.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-cream/65">{it.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4 · ÖNE ÇIKAN LEZZETLER */}
      {c.featured.visible !== false && featured.length > 0 && (
        <section className="bg-cream py-24 sm:py-36">
          <div className="container-x">
            <div className="flex flex-wrap items-end justify-between gap-8">
              <SectionHeading eyebrow={str(c.featured, "eyebrow")} title={str(c.featured, "title")} text={str(c.featured, "text")} />
              <Link href="/menu" className="btn-ghost text-forest" data-reveal>
                Tüm menü <ArrowUpRight size={16} />
              </Link>
            </div>
            <ul className="no-scrollbar -mx-5 mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
              {featured.map((p, i) => {
                const price = effectivePrice(p);
                return (
                  <li key={p.id} data-reveal style={d((i % 3) * 100)} className={`w-[78vw] shrink-0 snap-start sm:w-auto ${i % 3 === 1 ? "lg:translate-y-12" : ""}`}>
                    <Link href={`/menu?urun=${p.slug}`} className="img-zoom group block">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-beige">
                        {p.images[0] && <Image src={p.images[0].url} alt={p.images[0].alt || p.name.tr} fill sizes="(max-width:640px) 78vw, (max-width:1024px) 45vw, 30vw" className="object-cover" />}
                        <span className="absolute left-4 top-4 rounded-full bg-ivory/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-forest backdrop-blur">
                          {menu.categories.find((x) => x.id === p.categoryId)?.name.tr}
                        </span>
                      </div>
                      <div className="mt-5 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-display text-[1.65rem] leading-tight text-forest">{p.name.tr}</h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-charcoal/65">{p.description.tr}</p>
                        </div>
                        {s.menu.showPrices && (
                          <span className="shrink-0 pt-1 text-lg font-semibold tabular-nums text-gold-dark">
                            {formatPrice(price, s.menu.currency)}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* 5 · DİJİTAL MENÜ */}
      {c.menu.visible !== false && (
        <section className="relative overflow-hidden bg-ivory py-24 sm:py-36">
          <div className="container-x grid items-center gap-16 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <SectionHeading eyebrow={str(c.menu, "eyebrow")} title={str(c.menu, "title")} text={str(c.menu, "text")} />
              <ul className="mt-10 flex flex-wrap gap-2" data-reveal>
                {menu.categories.filter((x) => !x.parentId).map((cat) => (
                  <li key={cat.id}>
                    <Link href={`/menu#${cat.slug}`} className="inline-block rounded-full border border-beige px-4 py-2 text-sm text-charcoal/75 transition hover:border-forest hover:bg-forest hover:text-cream">
                      {cat.name.tr}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap gap-3" data-reveal>
                <Link href="/menu" className="btn-primary !px-7 !py-4">
                  {str(c.menu, "button") || "Menüyü Aç"} <ArrowRight size={16} />
                </Link>
                <span className="inline-flex items-center gap-2 px-2 text-xs text-charcoal/55">TR · EN · DE</span>
              </div>
            </div>
            <div className="relative order-1 flex justify-center lg:order-2" data-reveal="scale">
              <div className="absolute inset-x-8 top-1/2 h-3/4 -translate-y-1/2 rounded-full bg-sage/25 blur-3xl" />
              <div className="relative w-[270px] rotate-[-4deg] rounded-[44px] border-[10px] border-charcoal bg-charcoal shadow-[0_40px_80px_-30px_rgba(16,41,29,0.6)] sm:w-[300px]">
                <div className="overflow-hidden rounded-[34px] bg-cream">
                  <div className="relative h-36">
                    {str(c.menu, "image") && <Image src={str(c.menu, "image")} alt="" fill sizes="300px" className="object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-deep/80 to-transparent" />
                    <span className="absolute bottom-3 left-4 font-display text-2xl text-cream">Menü</span>
                    <span className="absolute right-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-deep">Masa 7</span>
                  </div>
                  <div className="flex gap-1.5 overflow-hidden px-3 py-3">
                    {menu.categories.slice(0, 3).map((cat, i) => (
                      <span key={cat.id} className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] ${i === 0 ? "bg-forest text-cream" : "bg-beige/60"}`}>
                        {cat.name.tr}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-2.5 px-3 pb-5">
                    {menu.products.filter((p) => p.images.length).slice(0, 4).map((p) => (
                      <div key={p.id} className="flex items-center gap-2.5 rounded-2xl bg-ivory p-2">
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl">
                          <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-forest">{p.name.tr}</p>
                          <p className="text-[10px] text-gold-dark">{formatPrice(effectivePrice(p), s.menu.currency)}</p>
                        </div>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-cream">
                          <Plus size={12} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* KAMPANYALAR */}
      {c.campaigns.visible !== false && campaigns.length > 0 && (
        <section className="bg-cream py-24 sm:py-32">
          <div className="container-x">
            <SectionHeading eyebrow={str(c.campaigns, "eyebrow")} title={str(c.campaigns, "title")} text={str(c.campaigns, "text")} />
            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((cp, i) => (
                <article key={cp.id} data-reveal style={d(i * 100)} className="img-zoom group relative flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[28px] bg-forest p-7 text-cream">
                  {cp.image && <Image src={cp.image} alt="" fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover opacity-70" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/40 to-transparent" />
                  <div className="relative">
                    {(cp.discountRate || cp.price) && (
                      <span className="mb-4 inline-block rounded-full bg-gold px-3 py-1 text-xs font-bold text-deep">
                        {cp.discountRate ? `%${cp.discountRate} indirim` : formatPrice(toNumber(cp.price), s.menu.currency)}
                      </span>
                    )}
                    <h3 className="font-display text-3xl">{cp.title}</h3>
                    {cp.description && <p className="mt-3 text-sm leading-relaxed text-cream/75">{cp.description}</p>}
                    {cp.endsAt && <p className="mt-4 text-xs text-cream/55">Son gün: {formatDateTR(cp.endsAt)}</p>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6 · GALERİ */}
      {c.gallery.visible !== false && gallery.length > 0 && (
        <section className="bg-ivory py-24 sm:py-36">
          <div className="container-x">
            <div className="mb-14 flex flex-wrap items-end justify-between gap-8">
              <SectionHeading eyebrow={str(c.gallery, "eyebrow")} title={str(c.gallery, "title")} text={str(c.gallery, "text")} />
              <Link href="/galeri" className="btn-ghost text-forest" data-reveal>
                Tüm galeri <ArrowUpRight size={16} />
              </Link>
            </div>
            <GalleryGrid items={gallery} categories={galleryCats} showFilters={false} />
          </div>
        </section>
      )}

      {/* 7 · DOĞA DENEYİMİ (parallax) */}
      {c.nature.visible !== false && (
        <section className="relative isolate overflow-hidden py-28 text-cream sm:py-44">
          {str(c.nature, "image") && (
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <Image src={str(c.nature, "image")} alt="" fill sizes="100vw" className="object-cover" data-parallax="0.18" />
            </div>
          )}
          <div className="absolute inset-0 -z-10 bg-deep/65" />
          <div className="container-x">
            <SectionHeading eyebrow={str(c.nature, "eyebrow")} title={str(c.nature, "title")} text={str(c.nature, "text")} tone="light" align="center" />
            <div className="mx-auto mt-16 grid max-w-5xl gap-5 sm:grid-cols-3">
              {list<{ title: string; text: string }>(c.nature, "items").map((it, i) => (
                <div key={i} data-reveal style={d(i * 120)} className="rounded-[24px] border border-cream/15 bg-deep/30 p-7 backdrop-blur-md">
                  <h3 className="font-display text-2xl">{it.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-cream/70">{it.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8 · YORUMLAR */}
      {c.reviews.visible !== false && (reviews.length > 0 || b.googleReviewsUrl) && (
        <section className="bg-cream py-24 sm:py-36">
          <div className="container-x">
            <div className="flex flex-wrap items-end justify-between gap-8">
              <SectionHeading eyebrow={str(c.reviews, "eyebrow")} title={str(c.reviews, "title")} text={str(c.reviews, "text")} />
              {b.googleReviewsUrl && (
                <a href={b.googleReviewsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-forest" data-reveal>
                  Google yorumlarını okuyun <ArrowUpRight size={16} />
                </a>
              )}
            </div>
            {reviews.length > 0 && (
              <ul className="no-scrollbar -mx-5 mt-14 flex snap-x gap-5 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
                {reviews.map((r, i) => (
                  <li key={r.id} data-reveal style={d((i % 3) * 100)} className="w-[82vw] shrink-0 snap-start sm:w-auto">
                    <figure className="flex h-full flex-col rounded-[28px] bg-ivory p-8 shadow-[0_1px_0_rgba(36,39,34,0.04)]">
                      <div className="flex gap-1 text-gold" aria-label={`${r.rating} / 5 puan`}>
                        {Array.from({ length: 5 }, (_, k) => (
                          <Star key={k} size={16} fill={k < r.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                      <blockquote className="mt-5 flex-1 font-display text-xl leading-snug text-forest">“{r.body}”</blockquote>
                      <figcaption className="mt-6 flex items-center gap-3 border-t border-beige pt-5">
                        {r.photo ? (
                          <Image src={r.photo} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sage/30 font-display text-lg text-forest">{r.authorName[0]}</span>
                        )}
                        <span>
                          <span className="block text-sm font-semibold">{r.authorName}</span>
                          <span className="block text-xs text-charcoal/55">
                            {formatDateTR(r.date, { month: "long", year: "numeric" })} · {r.source === "google" ? "Google" : "Misafir"}
                          </span>
                        </span>
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* 9 · ORGANİZASYONLAR */}
      {c.events.visible !== false && (
        <section className="relative overflow-hidden bg-deep py-24 text-cream grain sm:py-36">
          <div className="container-x grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeading eyebrow={str(c.events, "eyebrow")} title={str(c.events, "title")} text={str(c.events, "text")} tone="light" />
              {str(c.events, "image") && (
                <div data-reveal="scale" className="relative mt-12 aspect-[4/3] overflow-hidden rounded-[28px]">
                  <Image src={str(c.events, "image")} alt="Organizasyon masası" fill sizes="(max-width:1024px) 100vw, 40vw" className="object-cover" />
                </div>
              )}
            </div>
            <ul className="lg:col-span-6 lg:col-start-7">
              {events.map((e, i) => (
                <li key={e.id} data-reveal style={d(i * 40)}>
                  <Link href={`/organizasyon?tur=${e.key}#basvuru`} className="group flex items-center justify-between gap-6 border-b border-cream/10 py-5 transition hover:pl-3">
                    <span className="flex items-baseline gap-5">
                      <span className="w-6 text-xs tabular-nums text-gold/70">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-display text-[1.75rem] leading-none transition group-hover:text-gold sm:text-[2rem]">{e.name}</span>
                    </span>
                    <ArrowUpRight size={20} className="shrink-0 text-cream/40 transition group-hover:rotate-45 group-hover:text-gold" />
                  </Link>
                </li>
              ))}
              <li className="pt-10" data-reveal>
                <Link href="/organizasyon" className="btn-gold">
                  Organizasyon planlayın <ArrowRight size={16} />
                </Link>
              </li>
            </ul>
          </div>
        </section>
      )}

      {/* 10 · REZERVASYON */}
      {c.reservation.visible !== false && s.reservation.enabled && (
        <section id="rezervasyon" className="bg-ivory py-24 sm:py-36">
          <div className="container-x grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeading eyebrow={str(c.reservation, "eyebrow")} title={str(c.reservation, "title")} text={str(c.reservation, "text")} />
              {str(c.reservation, "image") && (
                <div data-reveal="scale" className="relative mt-12 hidden aspect-[4/5] overflow-hidden rounded-[28px] lg:block">
                  <Image src={str(c.reservation, "image")} alt="Bahçede kurulmuş uzun masa" fill sizes="40vw" className="object-cover" />
                </div>
              )}
            </div>
            <div className="lg:col-span-6 lg:col-start-7" data-reveal>
              <div className="rounded-[32px] border border-beige/80 bg-cream/60 p-6 sm:p-10">
                <ReservationForm seatingOptions={s.reservation.seatingOptions} maxGuests={s.reservation.maxGuests} maxDaysAhead={s.reservation.maxDaysAhead} compact />
              </div>
              <p className="mt-5 text-center text-sm text-charcoal/60">
                Telefonla rezervasyon:{" "}
                <a href={telLink(b.phone)} className="font-semibold text-forest">
                  {b.phone}
                </a>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 11 · KONUM */}
      {c.location.visible !== false && (
        <section className="bg-cream py-24 sm:py-36">
          <div className="container-x grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeading eyebrow={str(c.location, "eyebrow")} title={str(c.location, "title")} text={str(c.location, "text")} />
              <address className="mt-10 flex gap-4 not-italic" data-reveal>
                <MapPin className="mt-1 shrink-0 text-gold" size={20} />
                <span className="text-[15px] leading-relaxed">{b.address}</span>
              </address>
              {str(c.location, "directions") && <p className="mt-4 pl-9 text-sm text-charcoal/60" data-reveal>{str(c.location, "directions")}</p>}
              <div className="mt-10 flex flex-wrap gap-3" data-reveal>
                <a href={directions} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  <Navigation size={16} /> Yol tarifi al
                </a>
                <a href={openMap} target="_blank" rel="noopener noreferrer" className="btn-ghost text-forest">
                  Konumu aç
                </a>
                <a href={waze} target="_blank" rel="noopener noreferrer" className="btn-ghost text-forest">
                  Waze ile git
                </a>
              </div>
              <div className="mt-12 rounded-[24px] bg-ivory p-6" data-reveal>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className={`h-2 w-2 rounded-full ${status.open ? "bg-emerald-500" : "bg-red-500"}`} /> {status.label}
                  <span className="font-normal text-charcoal/55">· {status.detail}</span>
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                    const w = s.hours.weekly.find((x) => x.day === day);
                    return (
                      <div key={day} className="flex justify-between gap-2">
                        <dt className="text-charcoal/60">{["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][day]}</dt>
                        <dd className="tabular-nums">{!w || w.closed ? "Kapalı" : `${w.open}–${w.close === "24:00" ? "00:00" : w.close}`}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </div>
            <div className="min-h-[420px] lg:col-span-7" data-reveal="scale">
              <MapEmbed query={b.mapsQuery} lat={b.lat} lng={b.lng} title={`${b.name} konumu`} />
            </div>
          </div>
        </section>
      )}

      {/* 12 · SSS */}
      {c.faq.visible !== false && faqItems.length > 0 && (
        <section className="bg-ivory py-24 sm:py-36">
          <div className="container-x grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <SectionHeading eyebrow={str(c.faq, "eyebrow")} title={str(c.faq, "title")} text={str(c.faq, "text")} />
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              {faqItems.map((f, i) => (
                <details key={i} className="group border-b border-beige py-6" data-reveal style={d(i * 50)}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-2xl text-forest [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-beige transition group-open:rotate-45 group-open:bg-forest group-open:text-cream">
                      <Plus size={16} />
                    </span>
                  </summary>
                  <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-charcoal/70">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
        </section>
      )}

      {/* 13 · İLETİŞİM */}
      {c.contact.visible !== false && (
        <section className="bg-forest py-24 text-cream sm:py-32">
          <div className="container-x">
            <SectionHeading eyebrow={str(c.contact, "eyebrow")} title={str(c.contact, "title")} text={str(c.contact, "text")} tone="light" />
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: telLink(b.phone), icon: Phone, label: "Telefon", value: b.phone },
                { href: waLink(b.whatsapp), icon: WhatsAppIcon, label: "WhatsApp", value: "Hemen yazın", ext: true },
                { href: `mailto:${b.email}`, icon: Mail, label: "E-posta", value: b.email },
                ...(s.social.instagram ? [{ href: s.social.instagram, icon: Instagram, label: "Instagram", value: "@" + s.social.instagram.replace(/\/$/, "").split("/").pop(), ext: true }] : [{ href: "/iletisim", icon: ArrowRight, label: "İletişim formu", value: "Mesaj gönderin" }]),
              ].map((x, i) => (
                <a key={x.label} href={x.href} {...(x.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} data-reveal style={d(i * 80)} className="group rounded-[24px] border border-cream/15 p-7 transition hover:border-gold hover:bg-deep/40">
                  <x.icon size={22} />
                  <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">{x.label}</p>
                  <p className="mt-2 break-all font-display text-xl">{x.value}</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
