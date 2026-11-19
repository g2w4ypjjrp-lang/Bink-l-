import { getSettings } from "@/lib/settings";
import { PageHero } from "@/components/site/PageHero";

// Statik: derleme (Yayınla) sırasında bir kez HTML olarak üretilir; Worker çalışmaz.
export const dynamic = "force-static";

export const metadata = { title: "KVKK Aydınlatma Metni", alternates: { canonical: "/kvkk" } };

export default async function Kvkk() {
  const s = await getSettings();
  const b = s.business;
  return (
    <>
      <PageHero eyebrow="Yasal" title="KVKK Aydınlatma Metni" image="/uploads/venue/yol.webp" />
      <section className="bg-ivory py-20">
        <div className="container-x max-w-3xl space-y-6 text-[15px] leading-relaxed text-charcoal/80 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-forest">
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, veri sorumlusu sıfatıyla <strong>{b.name}</strong> ({b.address}) olarak kişisel verilerinizi aşağıda açıklanan amaçlarla işlemekteyiz.
          </p>
          <h2>İşlenen veriler</h2>
          <p>Rezervasyon, organizasyon başvurusu ve iletişim formları aracılığıyla ilettiğiniz ad soyad, telefon, e-posta, tarih, kişi sayısı ve talep açıklamalarınız; QR menü siparişlerinde masa numarası ve sipariş içeriği.</p>
          <h2>İşleme amaçları</h2>
          <p>Rezervasyon ve organizasyon taleplerinizin alınması, değerlendirilmesi ve sizinle iletişime geçilmesi; siparişlerinizin hazırlanması; hizmet kalitesinin artırılması ve yasal yükümlülüklerin yerine getirilmesi.</p>
          <h2>Hukuki sebep ve aktarım</h2>
          <p>Verileriniz KVKK m.5/2-c (sözleşmenin kurulması ve ifası) ve m.5/2-f (meşru menfaat) kapsamında işlenir; yasal zorunluluklar dışında üçüncü kişilerle paylaşılmaz. Sitemiz çerez tabanlı reklam takibi yapmaz; ziyaret istatistikleri anonim olarak tutulur.</p>
          <h2>Haklarınız</h2>
          <p>KVKK m.11 kapsamındaki haklarınızı kullanmak için <a className="text-forest underline" href={`mailto:${b.email}`}>{b.email}</a> adresine başvurabilirsiniz.</p>
        </div>
      </section>
    </>
  );
}
