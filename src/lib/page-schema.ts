/** Yönetilebilir sayfa içerikleri: alan tanımları + varsayılan metinler.
 *  Admin > Sayfa Yönetimi ekranı bu şemadan otomatik form üretir. */

export type FieldType = "text" | "textarea" | "image" | "video" | "url" | "boolean" | "list";
export type Field = { key: string; label: string; type: FieldType; help?: string; fields?: Field[] };
export type Section = { key: string; label: string; description?: string; fields: Field[] };
export type PageDef = { key: string; title: string; slug: string; sections: Section[] };

// İşletmenin gerçek fotoğrafları (venue/); eşleşmeyenler temsili görsel (seed/)
const VENUE: Record<string, string> = { hero:"teras", "forest-mist":"yol", garden:"yol", "forest-path":"yol", nature:"teras", "long-table":"tabela", "table-dinner":"tabela", "wedding-table":"teras", proposal:"pencere", party:"cay", restaurant:"tabela", "food-spread":"tabela", "breakfast-eggs":"tabela", grill:"cay" };
const img = (n: string) => (VENUE[n] ? `/uploads/venue/${VENUE[n]}.webp` : `/uploads/seed/${n}.webp`);

const heading = (extra: Field[] = []): Field[] => [
  { key: "eyebrow", label: "Üst başlık", type: "text" },
  { key: "title", label: "Başlık", type: "text" },
  { key: "text", label: "Metin", type: "textarea" },
  ...extra,
];

export const PAGES: PageDef[] = [
  {
    key: "home",
    title: "Ana Sayfa",
    slug: "/",
    sections: [
      { key: "hero", label: "Hero (Karşılama)", fields: [
        { key: "eyebrow", label: "Üst başlık", type: "text" },
        { key: "title", label: "Slogan", type: "text" },
        { key: "text", label: "Alt metin", type: "textarea" },
        { key: "image", label: "Arka plan görseli", type: "image" },
        { key: "video", label: "Arka plan videosu (opsiyonel, mp4)", type: "video" },
        { key: "menuButton", label: "Menü butonu metni", type: "text" },
      ] },
      { key: "story", label: "Marka Hikâyesi", fields: heading([{ key: "image", label: "Görsel", type: "image" }, { key: "image2", label: "İkinci görsel", type: "image" }, { key: "signature", label: "İmza / alt not", type: "text" }]) },
      { key: "atmosphere", label: "Saklı Bahçe Atmosferi", fields: heading([
        { key: "image", label: "Büyük görsel", type: "image" },
        { key: "items", label: "Özellikler", type: "list", fields: [{ key: "title", label: "Başlık", type: "text" }, { key: "text", label: "Açıklama", type: "textarea" }] },
      ]) },
      { key: "featured", label: "Öne Çıkan Lezzetler", description: "Ürünler Menü > Ürünler ekranında 'Öne çıkan' işaretiyle seçilir.", fields: heading() },
      { key: "menu", label: "Dijital Menü Tanıtımı", fields: heading([{ key: "image", label: "Görsel", type: "image" }, { key: "button", label: "Buton metni", type: "text" }]) },
      { key: "campaigns", label: "Kampanyalar", description: "Kampanyalar ekranında 'Ana sayfada göster' seçilenler listelenir.", fields: heading() },
      { key: "gallery", label: "Fotoğraf Galerisi", description: "Galeride 'Ana sayfada göster' seçilen görseller listelenir.", fields: heading() },
      { key: "nature", label: "Bahçe ve Doğa Deneyimi", fields: heading([
        { key: "image", label: "Arka plan görseli (parallax)", type: "image" },
        { key: "items", label: "Deneyimler", type: "list", fields: [{ key: "title", label: "Başlık", type: "text" }, { key: "text", label: "Açıklama", type: "textarea" }] },
      ]) },
      { key: "reviews", label: "Misafir Yorumları", fields: heading() },
      { key: "events", label: "Organizasyonlar", fields: heading([{ key: "image", label: "Görsel", type: "image" }]) },
      { key: "location", label: "Konum ve Yol Tarifi", fields: heading([{ key: "directions", label: "Ulaşım notu", type: "textarea" }]) },
      { key: "faq", label: "Sık Sorulan Sorular", fields: heading([
        { key: "items", label: "Sorular", type: "list", fields: [{ key: "q", label: "Soru", type: "text" }, { key: "a", label: "Cevap", type: "textarea" }] },
      ]) },
      { key: "contact", label: "İletişim", fields: heading() },
    ],
  },
  {
    key: "about",
    title: "Hakkımızda",
    slug: "/hakkimizda",
    sections: [
      { key: "hero", label: "Sayfa Başlığı", fields: heading([{ key: "image", label: "Görsel", type: "image" }]) },
      { key: "story", label: "Kuruluş Hikâyesi", fields: heading([{ key: "image", label: "Görsel", type: "image" }]) },
      { key: "family", label: "Aile İşletmesi", fields: heading([{ key: "image", label: "Görsel", type: "image" }]) },
      { key: "nature", label: "Doğaya Bağlılık", fields: heading([{ key: "image", label: "Görsel", type: "image" }]) },
      { key: "hospitality", label: "Misafir Ağırlama Anlayışı", fields: heading() },
      { key: "experience", label: "Restoran & Bahçe Deneyimi", fields: heading([{ key: "image", label: "Görsel 1", type: "image" }, { key: "image2", label: "Görsel 2", type: "image" }, { key: "image3", label: "Görsel 3", type: "image" }]) },
      { key: "timeline", label: "Tarihçe", fields: heading([
        { key: "items", label: "Kilometre taşları", type: "list", fields: [{ key: "year", label: "Yıl", type: "text" }, { key: "title", label: "Başlık", type: "text" }, { key: "text", label: "Açıklama", type: "textarea" }] },
      ]) },
      { key: "mission", label: "Misyon", fields: heading() },
      { key: "vision", label: "Vizyon", fields: heading() },
      { key: "values", label: "Değerler", fields: heading([
        { key: "items", label: "Değerler", type: "list", fields: [{ key: "title", label: "Başlık", type: "text" }, { key: "text", label: "Açıklama", type: "textarea" }] },
      ]) },
    ],
  },
  {
    key: "gallery",
    title: "Galeri",
    slug: "/galeri",
    sections: [{ key: "hero", label: "Sayfa Başlığı", fields: heading([{ key: "image", label: "Görsel", type: "image" }]) }],
  },
  {
    key: "organization",
    title: "Organizasyonlar",
    slug: "/organizasyon",
    sections: [
      { key: "hero", label: "Sayfa Başlığı", fields: heading([{ key: "image", label: "Görsel", type: "image" }]) },
      { key: "intro", label: "Giriş", fields: heading([{ key: "image", label: "Görsel", type: "image" }]) },
      { key: "process", label: "Süreç", fields: heading([
        { key: "items", label: "Adımlar", type: "list", fields: [{ key: "title", label: "Başlık", type: "text" }, { key: "text", label: "Açıklama", type: "textarea" }] },
      ]) },
      { key: "form", label: "Başvuru Formu", fields: heading() },
    ],
  },
  {
    key: "contact",
    title: "İletişim",
    slug: "/iletisim",
    sections: [
      { key: "hero", label: "Sayfa Başlığı", fields: heading([{ key: "image", label: "Görsel", type: "image" }]) },
      { key: "form", label: "İletişim Formu", fields: heading() },
    ],
  },
  {
    key: "campaigns",
    title: "Kampanyalar",
    slug: "/kampanyalar",
    sections: [{ key: "hero", label: "Sayfa Başlığı", fields: heading([{ key: "image", label: "Görsel", type: "image" }]) }],
  },
  {
    key: "menu",
    title: "Dijital Menü",
    slug: "/menu",
    sections: [{ key: "hero", label: "Menü Başlığı", fields: [{ key: "title", label: "Başlık", type: "text" }, { key: "text", label: "Alt metin", type: "textarea" }, { key: "image", label: "Kapak görseli", type: "image" }] }],
  },
];

export const DEFAULT_CONTENT: Record<string, Record<string, Record<string, unknown>>> = {
  home: {
    hero: {
      visible: true,
      eyebrow: "Binkılıç · Çatalca · İstanbul",
      title: "Doğanın İçinde, Lezzetin Kalbinde",
      text: "Şehrin gürültüsünden bir saat uzakta, ağaçların gölgesinde serpme kahvaltılar, közde pişen lezzetler ve aile sofrası sıcaklığı.",
      image: img("hero"),
      video: "",
      menuButton: "Menüye Göz At",
      reservationButton: "Rezervasyon Yap",
    },
    story: {
      visible: true,
      eyebrow: "Hikâyemiz",
      title: "Bir aile sofrasından doğan saklı bir bahçe",
      text: "BinKılıç Saklı Bahçe, Binkılıç'ın yaşlı meşeleri arasında, ailemizin yıllardır sürdürdüğü misafirperverliği paylaşmak için kuruldu. Her sabah fırından çıkan ekmek, köyden gelen tereyağı ve bal; her akşam közün başında pişen etler… Burada her şey bir aile sofrasının samimiyetiyle hazırlanır.\n\nAmacımız basit: Doğanın sakinliğini, iyi yemeğin keyfini ve sevdiklerinizle geçirilen zamanın değerini aynı masada buluşturmak.",
      image: img("forest-path"),
      image2: img("breakfast-board"),
      signature: "— BinKılıç Ailesi",
    },
    atmosphere: {
      visible: true,
      eyebrow: "Saklı Bahçe Atmosferi",
      title: "Ağaçların altında, zamanın yavaşladığı yer",
      text: "Gölgeli kamelyalar, çiçekli patikalar ve akşamları yanan sıcak ışıklar. Kahvaltıdan gün batımına kadar her saat ayrı bir güzellik.",
      image: img("garden"),
      items: [
        { title: "Orman içinde masalar", text: "Meşe ve çam ağaçlarının gölgesinde, birbirinden ferah aralıklarla yerleştirilmiş masalar." },
        { title: "Çocuklar için güvenli alan", text: "Doğayla iç içe oyun alanı; siz keyif yaparken çocuklarınız özgürce koşsun." },
        { title: "Akşam ışıkları", text: "Gün batımıyla birlikte yanan sıcak ışıklar altında romantik akşam yemekleri." },
      ],
    },
    featured: { visible: true, eyebrow: "Öne Çıkanlar", title: "Sofranın yıldızları", text: "Mutfağımızın en çok sevilen, misafirlerimizin tekrar tekrar istediği lezzetler." },
    menu: {
      visible: true,
      eyebrow: "Dijital Menü",
      title: "Menümüz bir dokunuş uzağınızda",
      text: "Masanızdaki QR kodu okutun ya da aşağıdaki butona dokunun. Fotoğraflı ürünler, alerjen bilgileri ve güncel fiyatlarla menümüz Türkçe, İngilizce ve Almanca olarak elinizde.",
      image: img("breakfast-eggs"),
      button: "Menüyü Aç",
    },
    campaigns: { visible: true, eyebrow: "Kampanyalar", title: "Bu dönem bahçede", text: "" },
    gallery: { visible: true, eyebrow: "Galeri", title: "Saklı Bahçe'den kareler", text: "" },
    nature: {
      visible: true,
      eyebrow: "Bahçe & Doğa",
      title: "Bir öğle yemeğinden fazlası",
      text: "Kuş sesleri, temiz hava ve yeşilin her tonu. Saklı Bahçe'de geçirdiğiniz zaman, sofradan kalktıktan sonra da devam eder.",
      image: img("forest-mist"),
      items: [
        { title: "Orman yürüyüşü", text: "Bahçemizden başlayan patikalarda kısa bir yürüyüşle sindirim keyfi." },
        { title: "Temiz hava", text: "İstanbul'un merkezine bir saat uzaklıkta, Trakya'nın en yeşil köşelerinden birinde." },
        { title: "Mevsimin ürünleri", text: "Menümüz yerel üreticilerin mevsim ürünleriyle şekillenir." },
      ],
    },
    reviews: { visible: true, eyebrow: "Misafirlerimiz", title: "Sizden gelenler", text: "Misafirlerimizin Google'da paylaştığı deneyimlerden seçtiklerimiz." },
    events: {
      visible: true,
      eyebrow: "Organizasyonlar",
      title: "Hayatınızın en güzel anları, doğanın kucağında",
      text: "Doğum günlerinden nişanlara, evlilik tekliflerinden kurumsal davetlere kadar her organizasyonu sizin hayalinize göre planlıyoruz.",
      image: img("wedding-table"),
    },
    reservation: {
      visible: true,
      eyebrow: "Rezervasyon",
      title: "Masanızı ayıralım",
      text: "Özellikle hafta sonları yoğunluk yaşıyoruz. Rezervasyon talebinizi iletin, sizi arayarak onaylayalım.",
      image: img("long-table"),
    },
    location: {
      visible: true,
      eyebrow: "Konum",
      title: "Saklı ama uzak değil",
      text: "Binkılıç köyünün içinden Saray yoluna sapın; tabelalarımızı takip ederek ormanın içindeki bahçemize ulaşabilirsiniz.",
      directions: "İstanbul merkezden yaklaşık 60–75 dakika. Ücretsiz otopark mevcuttur.",
    },
    faq: {
      visible: true,
      eyebrow: "Sık Sorulan Sorular",
      title: "Merak edilenler",
      text: "",
      items: [
        { q: "Serpme kahvaltı saat kaça kadar servis ediliyor?", a: "Kahvaltı servisimiz her gün açılıştan 14:00'e kadar devam eder." },
        { q: "Otopark var mı?", a: "Evet, misafirlerimiz için ücretsiz otoparkımız bulunmaktadır." },
        { q: "Evcil hayvanımla gelebilir miyim?", a: "Bahçe alanımızda tasmalı evcil dostlarınızı ağırlamaktan mutluluk duyarız." },
        { q: "Organizasyonlar için fiyat nasıl belirleniyor?", a: "Kişi sayısı, tarih ve menü tercihlerine göre size özel teklif hazırlıyoruz. Organizasyon sayfamızdaki formu doldurmanız yeterli." },
        { q: "Vejetaryen ve vegan seçenekleriniz var mı?", a: "Evet. Dijital menümüzde vejetaryen ve vegan ürünler özel olarak işaretlenmiştir." },
      ],
    },
    contact: { visible: true, eyebrow: "İletişim", title: "Bize ulaşın", text: "Sorularınız ve organizasyon talepleriniz için bize her zaman yazabilirsiniz." },
  },
  about: {
    hero: { visible: true, eyebrow: "Hakkımızda", title: "Doğanın misafiri, sofranın ev sahibi", text: "Binkılıç'ın ormanlarında, bir ailenin misafirperverliğiyle büyüyen saklı bir bahçe.", image: img("forest-path") },
    story: {
      visible: true,
      eyebrow: "Kuruluş Hikâyemiz",
      title: "Her şey bir bahçe sofrasıyla başladı",
      text: "Yıllar önce ailemizin bahçesinde dostlar için kurulan uzun bir kahvaltı sofrası, zamanla komşuların, sonra da şehirden gelen misafirlerin buluşma noktası oldu. O sofradaki samimiyeti korumak için BinKılıç Saklı Bahçe'yi kurduk.\n\nBugün hâlâ aynı özenle, aynı malzemelerle ve aynı sıcaklıkla misafirlerimizi ağırlıyoruz.",
      image: img("breakfast-board"),
    },
    family: {
      visible: true,
      eyebrow: "Aile İşletmesi",
      title: "Mutfakta da, bahçede de aile",
      text: "Mutfağımızdaki tarifler kuşaktan kuşağa aktarıldı. Servisten bahçenin bakımına kadar her işin başında ailemizden biri var; çünkü misafirlerimizi evimize kabul ediyoruz.",
      image: img("long-table"),
    },
    nature: {
      visible: true,
      eyebrow: "Doğaya Bağlılık",
      title: "Ağaçlara dokunmadan büyümek",
      text: "Bahçemiz, var olan ağaçların arasına yerleşti. Tek kullanımlık plastikten kaçınıyor, yerel üreticilerle çalışıyor, atıkları ayrıştırıyoruz. Doğanın içinde olmanın sorumluluğunu taşıyoruz.",
      image: img("forest-mist"),
    },
    hospitality: {
      visible: true,
      eyebrow: "Misafir Ağırlama Anlayışımız",
      title: "Acele yok, özen var",
      text: "Burada masalar çevrilmez, misafir aceleye getirilmez. Çayınız tazelenir, çocuklarınız güvende oynar, siz doğanın ritmine uyum sağlarsınız.",
    },
    experience: {
      visible: true,
      eyebrow: "Restoran & Bahçe Deneyimi",
      title: "Sabah kahvaltısından akşam ışıklarına",
      text: "Gün boyu değişen bir menü ve atmosfer: Sabah serpme kahvaltı, öğlen közde ızgaralar, akşam ışıklar altında romantik yemekler.",
      image: img("breakfast-eggs"),
      image2: img("grill"),
      image3: img("garden"),
    },
    timeline: {
      visible: true,
      eyebrow: "Tarihçe",
      title: "Yolculuğumuz",
      text: "",
      items: [
        { year: "Başlangıç", title: "Aile bahçesi", text: "Ailemizin bahçesinde dostlar için kurulan ilk kahvaltı sofraları." },
        { year: "Kuruluş", title: "Saklı Bahçe kapılarını açtı", text: "Bahçemizi misafirlerimize açarak ilk servisimizi verdik." },
        { year: "Büyüme", title: "Organizasyonlar", text: "Doğum günleri, nişanlar ve kurumsal davetler için alanlarımızı genişlettik." },
        { year: "Bugün", title: "Dijital deneyim", text: "QR menüyle misafirlerimize daha hızlı hizmet veriyoruz." },
      ],
    },
    mission: { visible: true, eyebrow: "Misyonumuz", title: "Misyon", text: "Doğanın içinde, taze ve yerel malzemelerle hazırlanan lezzetleri, aile sıcaklığında bir hizmetle sunarak misafirlerimize şehirden uzak, huzurlu ve unutulmaz bir deneyim yaşatmak." },
    vision: { visible: true, eyebrow: "Vizyonumuz", title: "Vizyon", text: "İstanbul'un doğa içindeki en sevilen, en güvenilir aile restoranı ve organizasyon mekânı olmak; doğaya saygılı işletmecilikte örnek gösterilmek." },
    values: {
      visible: true,
      eyebrow: "Değerlerimiz",
      title: "Bizi biz yapanlar",
      text: "",
      items: [
        { title: "Doğallık", text: "Mevsiminde, yerel ve katkısız malzeme." },
        { title: "Samimiyet", text: "Her misafir, ailemizin bir ferdi." },
        { title: "Özen", text: "Sofradaki her detayda emek ve dikkat." },
        { title: "Saygı", text: "Doğaya, komşularımıza ve misafirlerimizin zamanına." },
      ],
    },
  },
  gallery: { hero: { visible: true, eyebrow: "Galeri", title: "Saklı Bahçe'den kareler", text: "Bahçemiz, sofralarımız ve birlikte biriktirdiğimiz güzel anlar.", image: img("garden") } },
  organization: {
    hero: { visible: true, eyebrow: "Organizasyonlar", title: "Özel günleriniz, doğanın kucağında", text: "Doğum gününden nişana, evlilik teklifinden kurumsal davete; size özel planlanan organizasyonlar.", image: img("wedding-table") },
    intro: {
      visible: true,
      eyebrow: "Neden Saklı Bahçe?",
      title: "Doğal dekor, kişisel dokunuş",
      text: "Ormanın kendisi en güzel dekor. Biz de buna sizin hikâyenizi ekliyoruz: Menü, süsleme, müzik ve akış planını birlikte tasarlıyor, gün boyu her detayla ilgileniyoruz.",
      image: img("party"),
    },
    process: {
      visible: true,
      eyebrow: "Süreç",
      title: "Dört adımda organizasyonunuz",
      text: "",
      items: [
        { title: "Başvuru", text: "Formu doldurun; tarih, kişi sayısı ve beklentilerinizi paylaşın." },
        { title: "Görüşme", text: "Ekibimiz sizi arayarak detayları konuşur, dilerseniz mekânı birlikte gezeriz." },
        { title: "Teklif", text: "Size özel menü ve hizmet içeriğiyle şeffaf bir teklif hazırlarız." },
        { title: "Büyük gün", text: "Siz anın tadını çıkarın; geri kalan her şey bizde." },
      ],
    },
    form: { visible: true, eyebrow: "Başvuru", title: "Organizasyon talebi oluşturun", text: "Formu doldurun, en geç 24 saat içinde size dönüş yapalım." },
  },
  contact: {
    hero: { visible: true, eyebrow: "İletişim", title: "Yolunuz düşsün", text: "Telefon, WhatsApp ya da form üzerinden bize her zaman ulaşabilirsiniz.", image: img("forest-path") },
    form: { visible: true, eyebrow: "Mesaj Gönderin", title: "Size nasıl yardımcı olabiliriz?", text: "Mesajınızı bırakın, en kısa sürede dönüş yapalım." },
  },
  reservation: {
    hero: {
      visible: true,
      eyebrow: "Rezervasyon",
      title: "Masanız sizi bekliyor",
      text: "Birkaç bilgi ile rezervasyon talebinizi oluşturun. Talebiniz ekibimiz tarafından onaylandığında size haber vereceğiz.",
      image: img("long-table"),
      policy: "Rezervasyonlar, belirtilen saatten itibaren 20 dakika süreyle tutulur. 10 kişi üzeri gruplar için lütfen telefonla bilgi alınız.",
    },
  },
  campaigns: { hero: { visible: true, eyebrow: "Kampanyalar", title: "Bahçedeki fırsatlar", text: "Dönemsel menüler, özel gün kampanyaları ve sürprizler.", image: img("breakfast-board") } },
  menu: { hero: { visible: true, title: "Menü", text: "Doğanın içinde, lezzetin kalbinde.", image: img("breakfast-board") } },
};
