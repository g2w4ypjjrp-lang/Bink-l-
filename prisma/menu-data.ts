/**
 * BinKılıç Saklı Bahçe — gerçek menü (basılı menü kartından aktarıldı, Kasım 2026).
 * Fiyatı menü kartında boş olan ürünler `active: false` (menüde gizli) olarak eklenir;
 * fiyat panelden girilip ürün yayına alınabilir.
 */
import { Prisma, type PrismaClient } from "@prisma/client";

export type MenuItem = {
  name: string; en: string; de: string; price: number;
  desc?: string; descEn?: string; descDe?: string;
  ingredients?: string; ingredientsEn?: string; ingredientsDe?: string;
  portion?: string; img?: string; allergens?: string[];
  veg?: boolean; vegan?: boolean; gf?: boolean; spice?: number;
  featured?: boolean; popular?: boolean; active?: boolean;
};
export type MenuCategory = {
  slug: string; name: string; en: string; de: string;
  desc?: string; descEn?: string; descDe?: string;
  image?: string; from?: string; to?: string; items: MenuItem[];
};

const I = (n: string) => `/uploads/seed/${n}.webp`;

const SERPME_TR = "Sahanda yumurta, beyaz peynir, kaşar peyniri, çeçil peyniri, ekşimikli biber, siyah zeytin, yeşil zeytin, salam, reçel, bal, çikolata, tereyağı, kaymak, patates kızartması, pişi, sigara böreği, domates, salatalık, yeşillik tabağı, mevsim meyvesi";
const SERPME_EN = "Fried eggs, white cheese, kashar cheese, string cheese, ekşimik pepper spread, black & green olives, salami, jam, honey, chocolate spread, butter, clotted cream, fries, pişi, cheese rolls, tomatoes, cucumber, greens, seasonal fruit";
const SERPME_DE = "Spiegeleier, Weißkäse, Kaşar-Käse, Fadenkäse, Ekşimik-Paprikacreme, schwarze & grüne Oliven, Salami, Marmelade, Honig, Schokoaufstrich, Butter, Kaymak, Pommes, Pişi, Käseröllchen, Tomaten, Gurken, Grünzeug, Obst der Saison";
const TABAK_TR = "Haşlanmış yumurta, beyaz peynir, kaşar peyniri, çeçil peyniri, siyah zeytin, salam, bal, reçel, tereyağı, kaymak, domates, salatalık, sigara böreği, mevsim meyvesi";
const TABAK_EN = "Boiled egg, white cheese, kashar cheese, string cheese, black olives, salami, honey, jam, butter, clotted cream, tomatoes, cucumber, cheese rolls, seasonal fruit";
const TABAK_DE = "Gekochtes Ei, Weißkäse, Kaşar-Käse, Fadenkäse, schwarze Oliven, Salami, Honig, Marmelade, Butter, Kaymak, Tomaten, Gurken, Käseröllchen, Obst der Saison";

const KG = { portion: "1 kg", desc: "Fiyat kilo fiyatıdır.", descEn: "Price per kilogram.", descDe: "Preis pro Kilogramm." };

export const REAL_MENU: MenuCategory[] = [
  {
    slug: "kahvalti", name: "Kahvaltı", en: "Breakfast", de: "Frühstück", image: I("breakfast-board"),
    items: [
      {
        name: "Serpme Kahvaltı", en: "Turkish Breakfast Spread", de: "Türkisches Frühstück", price: 1500, portion: "2 kişilik",
        desc: "Kahvaltı sofrası 2 kişiliktir. 1 demlik çay servis edilir.", descEn: "Breakfast spread for 2, served with a pot of tea.", descDe: "Frühstück für 2 Personen, mit einer Kanne Tee.",
        ingredients: SERPME_TR, ingredientsEn: SERPME_EN, ingredientsDe: SERPME_DE,
        img: "breakfast-board", allergens: ["milk", "eggs", "gluten"], veg: false, featured: true, popular: true,
      },
      {
        name: "Kahvaltı Tabağı", en: "Breakfast Plate", de: "Frühstücksteller", price: 800, portion: "1 kişilik",
        desc: "Kahvaltı tabağı tek kişiliktir. 2 bardak çayla sınırlıdır.", descEn: "Single-portion breakfast plate, includes 2 glasses of tea.", descDe: "Frühstücksteller für 1 Person, inkl. 2 Gläser Tee.",
        ingredients: TABAK_TR, ingredientsEn: TABAK_EN, ingredientsDe: TABAK_DE,
        img: "breakfast-board", allergens: ["milk", "eggs", "gluten"], featured: true,
      },
    ],
  },
  {
    slug: "kahvalti-ekstralari", name: "Ekstralar", en: "Extras", de: "Extras", image: I("breakfast-eggs"),
    items: [
      { name: "Sade Omlet", en: "Plain Omelette", de: "Omelett natur", price: 200, allergens: ["eggs"], veg: true, gf: true },
      { name: "Kaşarlı Omlet", en: "Omelette with Kashar Cheese", de: "Omelett mit Kaşar-Käse", price: 250, allergens: ["eggs", "milk"], veg: true, gf: true },
      { name: "Menemen", en: "Menemen", de: "Menemen", price: 250, desc: "Domates, biber ve yumurta.", descEn: "Scrambled eggs with tomatoes and peppers.", descDe: "Rührei mit Tomaten und Paprika.", img: "breakfast-eggs", allergens: ["eggs"], veg: true, gf: true, popular: true },
      { name: "Kavurmalı Yumurta", en: "Eggs with Kavurma", de: "Eier mit Kavurma", price: 350, allergens: ["eggs"], gf: true },
      { name: "Pastırmalı Yumurta", en: "Eggs with Pastırma", de: "Eier mit Pastırma", price: 400, allergens: ["eggs"], gf: true },
      { name: "Sucuklu Yumurta", en: "Eggs with Sucuk", de: "Eier mit Sucuk", price: 300, allergens: ["eggs"], gf: true },
      { name: "Kuymak", en: "Kuymak (Cornmeal & Cheese)", de: "Kuymak (Maisgrieß mit Käse)", price: 350, allergens: ["milk"], veg: true },
      { name: "Gözleme Çeşitleri", en: "Gözleme (Assorted)", de: "Gözleme (verschiedene)", price: 250, allergens: ["gluten", "milk"], veg: true },
      { name: "Yumurtalı Ekmek", en: "Egg-Dipped Bread", de: "Brot in Ei gebraten", price: 200, allergens: ["gluten", "eggs"], veg: true },
      { name: "Patates Kızartması", en: "French Fries", de: "Pommes frites", price: 250, img: "fries", vegan: true, veg: true, gf: true },
      { name: "Patlıcan Kızartması", en: "Fried Aubergine", de: "Frittierte Aubergine", price: 250, vegan: true, veg: true, gf: true },
      { name: "Biber Kızartması", en: "Fried Peppers", de: "Frittierte Paprika", price: 250, vegan: true, veg: true, gf: true },
      { name: "Pişi", en: "Pişi (Fried Dough)", de: "Pişi (Teigfladen)", price: 200, allergens: ["gluten"], veg: true },
      { name: "Mantı", en: "Turkish Mantı", de: "Türkische Mantı", price: 350, allergens: ["gluten", "milk", "eggs"] },
    ],
  },
  {
    slug: "izgaralar", name: "Izgaralar", en: "Grills", de: "Grill",
    desc: "Izgara fiyatları kilo fiyatıdır.", descEn: "Grill prices are per kilogram.", descDe: "Grillpreise verstehen sich pro Kilogramm.", image: I("grill"),
    items: [
      { name: "Antrikot", en: "Entrecôte", de: "Entrecôte", price: 3000, ...KG, img: "steak", gf: true, featured: true },
      { name: "Kuzu Pirzola", en: "Lamb Chops", de: "Lammkoteletts", price: 3200, ...KG, gf: true, featured: true, popular: true },
      { name: "Kuzu Külbastı", en: "Lamb Külbastı", de: "Lamm-Külbastı", price: 3000, ...KG, gf: true },
      { name: "Kuzu Lokum", en: "Lamb Tenderloin (Lokum)", de: "Lammfilet (Lokum)", price: 3000, ...KG, gf: true },
      { name: "Köfte", en: "Grilled Köfte", de: "Gegrillte Köfte", price: 2000, ...KG, img: "grill", allergens: ["gluten"], popular: true },
      { name: "Kanat", en: "Chicken Wings", de: "Hähnchenflügel", price: 2000, ...KG, gf: true },
      { name: "Sucuk", en: "Grilled Sucuk", de: "Gegrillte Sucuk", price: 2000, ...KG, gf: true },
    ],
  },
  {
    slug: "mezeler", name: "Mezeler", en: "Meze", de: "Meze",
    items: [
      { name: "Semizotu", en: "Purslane with Yoghurt", de: "Portulak mit Joghurt", price: 300, allergens: ["milk"], veg: true, gf: true },
      { name: "Haydari", en: "Haydari (Yoghurt & Herbs)", de: "Haydari (Joghurt & Kräuter)", price: 300, allergens: ["milk"], veg: true, gf: true },
      { name: "Amerikan Salatası", en: "Russian Salad", de: "Russischer Salat", price: 300, allergens: ["eggs"], veg: true, gf: true },
      { name: "Atom", en: "Atom (Spicy Yoghurt)", de: "Atom (scharfer Joghurt)", price: 300, allergens: ["milk"], veg: true, gf: true, spice: 2 },
      { name: "Havuç Tarator", en: "Carrot Tarator", de: "Karotten-Tarator", price: 300, allergens: ["milk", "nuts"], veg: true, gf: true },
      { name: "Beyin", en: "Brain Salad", de: "Hirnsalat", price: 0, gf: true, active: false },
    ],
  },
  {
    slug: "salatalar", name: "Salatalar", en: "Salads", de: "Salate", image: I("salad"),
    items: [
      { name: "Çoban Salata", en: "Shepherd's Salad", de: "Hirtensalat", price: 300, desc: "Domates, salatalık, biber, soğan.", descEn: "Tomato, cucumber, pepper, onion.", descDe: "Tomate, Gurke, Paprika, Zwiebel.", vegan: true, veg: true, gf: true },
      { name: "Mevsim Salata", en: "Seasonal Salad", de: "Saisonsalat", price: 300, img: "salad", vegan: true, veg: true, gf: true },
    ],
  },
  {
    slug: "tatlilar", name: "Tatlılar", en: "Desserts", de: "Desserts",
    items: [
      { name: "Şekerpare", en: "Şekerpare", de: "Şekerpare", price: 0, allergens: ["gluten", "eggs", "milk"], veg: true, active: false },
      { name: "Kemalpaşa", en: "Kemalpaşa", de: "Kemalpaşa", price: 0, allergens: ["gluten", "milk", "eggs"], veg: true, active: false },
    ],
  },
  {
    slug: "sicak-icecekler", name: "Sıcak İçecekler", en: "Hot Drinks", de: "Heißgetränke", image: I("tea"),
    items: [
      { name: "Demlik Çay", en: "Pot of Tea", de: "Tee (Kanne)", price: 400, img: "tea", vegan: true, veg: true, gf: true, popular: true },
      { name: "Semaverde Çay", en: "Tea in Samovar", de: "Tee im Samowar", price: 700, vegan: true, veg: true, gf: true },
      { name: "Çay", en: "Tea (Glass)", de: "Tee (Glas)", price: 40, vegan: true, veg: true, gf: true },
      { name: "Türk Kahvesi", en: "Turkish Coffee", de: "Türkischer Kaffee", price: 150, vegan: true, veg: true, gf: true },
      { name: "Nescafe", en: "Nescafé", de: "Nescafé", price: 150, veg: true, gf: true },
      { name: "Süt", en: "Milk", de: "Milch", price: 150, allergens: ["milk"], veg: true, gf: true },
      { name: "Demleme Ihlamur", en: "Linden Tea", de: "Lindenblütentee", price: 150, vegan: true, veg: true, gf: true },
      { name: "Karışık Kış Çayı", en: "Winter Herbal Tea", de: "Winter-Kräutertee", price: 150, vegan: true, veg: true, gf: true },
    ],
  },
  {
    slug: "soguk-icecekler", name: "Soğuk İçecekler", en: "Cold Drinks", de: "Kaltgetränke", image: I("lemonade"),
    items: [
      { name: "Kola", en: "Cola", de: "Cola", price: 100, vegan: true, veg: true, gf: true },
      { name: "Fanta", en: "Fanta", de: "Fanta", price: 100, vegan: true, veg: true, gf: true },
      { name: "Gazoz", en: "Gazoz (Turkish Soda Pop)", de: "Gazoz (Limonade)", price: 100, vegan: true, veg: true, gf: true },
      { name: "Limonlu Soda", en: "Lemon Mineral Water", de: "Mineralwasser mit Zitrone", price: 50, vegan: true, veg: true, gf: true },
      { name: "Sade Soda", en: "Mineral Water", de: "Mineralwasser", price: 40, vegan: true, veg: true, gf: true },
      { name: "Ev Yapımı Limonata", en: "Homemade Lemonade", de: "Hausgemachte Limonade", price: 150, img: "lemonade", vegan: true, veg: true, gf: true, featured: true },
      { name: "Ayran", en: "Ayran", de: "Ayran", price: 70, allergens: ["milk"], veg: true, gf: true },
      { name: "Su", en: "Water", de: "Wasser", price: 30, vegan: true, veg: true, gf: true },
    ],
  },
];

const slugOf = (s: string) =>
  s.toLowerCase().replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Menüyü (kategoriler + ürünler + çeviriler + alerjenler) veritabanına yazar. */
export async function writeMenu(db: PrismaClient, menu: MenuCategory[] = REAL_MENU) {
  const allergenMap = Object.fromEntries((await db.allergen.findMany()).map((a) => [a.key, a.id]));
  let n = 0;
  for (const [ci, c] of menu.entries()) {
    const cat = await db.category.create({
      data: {
        slug: c.slug, name: c.name, description: c.desc, image: c.image, sortOrder: ci, availableFrom: c.from, availableTo: c.to,
        translations: { create: [{ locale: "en", name: c.en, description: c.descEn }, { locale: "de", name: c.de, description: c.descDe }] },
      },
    });
    for (const [pi, p] of c.items.entries()) {
      await db.product.create({
        data: {
          slug: `${c.slug}-${slugOf(p.name)}`, name: p.name, description: p.desc, ingredients: p.ingredients, price: new Prisma.Decimal(p.price),
          categoryId: cat.id, portion: p.portion, spiceLevel: p.spice ?? 0,
          vegetarian: !!(p.veg || p.vegan), vegan: !!p.vegan, glutenFree: !!p.gf, featured: !!p.featured, popular: !!p.popular, isNew: false,
          active: p.active !== false, sortOrder: pi,
          images: p.img ? { create: [{ url: I(p.img), alt: p.name, sortOrder: 0 }] } : undefined,
          translations: {
            create: [
              { locale: "en", name: p.en, description: p.descEn, ingredients: p.ingredientsEn },
              { locale: "de", name: p.de, description: p.descDe, ingredients: p.ingredientsDe },
            ],
          },
          allergens: p.allergens?.length ? { create: p.allergens.filter((a) => allergenMap[a]).map((a) => ({ allergenId: allergenMap[a] })) } : undefined,
        },
      });
      n++;
    }
  }
  return n;
}
