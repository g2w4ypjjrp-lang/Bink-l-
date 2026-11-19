import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getPage, str } from "@/lib/content";
import { activeCampaignWhere } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { pageMetadata, breadcrumb } from "@/lib/seo";
import { formatPrice, formatDateTR, toNumber } from "@/lib/utils";
import { PageHero } from "@/components/site/PageHero";
import { JsonLd } from "@/components/site/JsonLd";

// Statik: derleme (Yayınla) sırasında bir kez HTML olarak üretilir; Worker çalışmaz.
export const dynamic = "force-static";

export async function generateMetadata() {
  return pageMetadata("campaigns", { title: "Kampanyalar", description: "BinKılıç Saklı Bahçe güncel kampanyaları, dönemsel menüler ve özel gün fırsatları.", path: "/kampanyalar" });
}

export default async function Campaigns() {
  const [{ content: c }, items, s] = await Promise.all([getPage("campaigns"), db.campaign.findMany({ where: await activeCampaignWhere(), orderBy: { sortOrder: "asc" }, include: { category: true } }), getSettings()]);
  return (
    <>
      <PageHero eyebrow={str(c.hero, "eyebrow")} title={str(c.hero, "title")} text={str(c.hero, "text")} image={str(c.hero, "image")} />
      <section className="bg-ivory py-20 sm:py-28">
        <div className="container-x">
          {items.length === 0 ? (
            <p className="py-16 text-center text-charcoal/60">Şu an aktif bir kampanyamız bulunmuyor. Yeni fırsatlar için bizi takipte kalın.</p>
          ) : (
            <div className="space-y-6">
              {items.map((cp, i) => (
                <article key={cp.id} data-reveal className={`grid overflow-hidden rounded-[32px] bg-cream md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
                  <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[380px]">{cp.image && <Image src={cp.image} alt={cp.title} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />}</div>
                  <div className="flex flex-col justify-center p-8 sm:p-14">
                    {(cp.discountRate || cp.price) && (
                      <span className="w-fit rounded-full bg-gold px-3 py-1 text-xs font-bold text-deep">{cp.discountRate ? `%${cp.discountRate} indirim` : formatPrice(toNumber(cp.price), s.menu.currency)}</span>
                    )}
                    <h2 className="h-display mt-5 text-4xl text-forest sm:text-5xl">{cp.title}</h2>
                    {cp.description && <p className="mt-5 leading-relaxed text-charcoal/70">{cp.description}</p>}
                    <p className="mt-6 text-sm text-charcoal/55">
                      {cp.startsAt && `${formatDateTR(cp.startsAt)} – `}
                      {cp.endsAt ? `${formatDateTR(cp.endsAt)} tarihine kadar geçerlidir.` : "Süresiz kampanya."}
                    </p>
                    <div className="mt-8 flex gap-3">
                      {cp.category && (
                        <Link href={`/menu#${cp.category.slug}`} className="btn-primary">
                          Menüde gör
                        </Link>
                      )}
                      <Link href="/rezervasyon" className="btn-ghost text-forest">
                        Rezervasyon yap
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <JsonLd data={breadcrumb([{ name: "Kampanyalar", path: "/kampanyalar" }])} />
    </>
  );
}
