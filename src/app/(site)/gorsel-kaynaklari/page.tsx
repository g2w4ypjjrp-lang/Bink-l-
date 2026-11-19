import credits from "@/lib/image-credits.json";
import { PageHero } from "@/components/site/PageHero";

// Statik: derleme (Yayınla) sırasında bir kez HTML olarak üretilir; Worker çalışmaz.
export const dynamic = "force-static";

export const metadata = { title: "Görsel Kaynakları", alternates: { canonical: "/gorsel-kaynaklari" }, robots: { index: false, follow: true } };

type Credit = { item: string; title: string; author: string; license: string; source: string };

export default function Credits() {
  const list = credits as Credit[];
  return (
    <>
      <PageHero eyebrow="Atıf" title="Görsel Kaynakları" text="Menüde kullanılan bazı fotoğraflar açık lisanslı (Wikimedia Commons) temsili görsellerdir. Lisans koşulları gereği yazar ve lisans bilgileri aşağıda listelenmiştir." image="/uploads/seed/forest-mist.webp" />
      <section className="bg-ivory py-16">
        <div className="container-x max-w-4xl">
          {list.length === 0 ? (
            <p className="text-charcoal/60">Şu anda atıf gerektiren görsel bulunmuyor.</p>
          ) : (
            <ul className="divide-y divide-beige rounded-2xl border border-beige bg-white text-sm">
              {list.map((c) => (
                <li key={c.item + c.source} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                  <span className="font-semibold text-forest">{c.item}</span>
                  <span className="text-charcoal/70">
                    <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{c.title}</a> · {c.author} · {c.license}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
