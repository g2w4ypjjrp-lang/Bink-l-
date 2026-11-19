export const LOCALES = ["tr", "en", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_NAMES: Record<Locale, string> = { tr: "Türkçe", en: "English", de: "Deutsch" };

const dict = {
  tr: {
    menu: "Menü", search: "Menüde ara…", all: "Tümü", favorites: "Favoriler", table: "Masa", soldOut: "Tükendi", new: "Yeni", popular: "Popüler",
    featured: "Şefin Önerisi", daily: "Günün Ürünü", vegetarian: "Vejetaryen", vegan: "Vegan", glutenFree: "Glutensiz", spicy: "Acılık", campaign: "Kampanya",
    ingredients: "İçindekiler", allergens: "Alerjenler", calories: "Kalori", portion: "Porsiyon", prepTime: "Hazırlanma", minutes: "dk",
    addToCart: "Sepete ekle", cart: "Sepet", yourOrder: "Siparişiniz", note: "Not", itemNote: "Ürün notu (ör. az pişmiş)", orderNote: "Sipariş notu",
    sendOrder: "Siparişi gönder", total: "Toplam", empty: "Sepetiniz boş", noResults: "Aramanızla eşleşen ürün bulunamadı.", noFavorites: "Henüz favori ürününüz yok. Ürünlerdeki kalp simgesine dokunarak ekleyebilirsiniz.",
    orderSent: "Siparişiniz alındı", orderStatus: "Sipariş durumu", close: "Kapat", callWaiter: "Garson çağır", backToMenu: "Menüye dön", yourName: "Adınız (opsiyonel)",
    status_new: "Alındı", status_preparing: "Hazırlanıyor", status_ready: "Hazır", status_delivered: "Teslim edildi", status_cancelled: "İptal edildi",
    campaigns: "Kampanyalar", dailySpecials: "Günün Önerileri", today: "Bugün", open: "Açık", closed: "Kapalı", orderDisabled: "Siparişlerinizi masanıza gelen ekibimize iletebilirsiniz.",
    priceNote: "Fiyatlara KDV dahildir.", call: "Ara", directions: "Yol tarifi", remove: "Çıkar", quantity: "Adet", orderNumber: "Sipariş no", reservation: "Rezervasyon",
    allergenInfo: "Alerjen bilgisi", vegOnly: "Vejetaryen", oldPrice: "Eski fiyat", unavailable: "Şu an servis dışı",
  },
  en: {
    menu: "Menu", search: "Search the menu…", all: "All", favorites: "Favourites", table: "Table", soldOut: "Sold out", new: "New", popular: "Popular",
    featured: "Chef's pick", daily: "Daily special", vegetarian: "Vegetarian", vegan: "Vegan", glutenFree: "Gluten-free", spicy: "Spice level", campaign: "Offer",
    ingredients: "Ingredients", allergens: "Allergens", calories: "Calories", portion: "Portion", prepTime: "Prep time", minutes: "min",
    addToCart: "Add to order", cart: "Order", yourOrder: "Your order", note: "Note", itemNote: "Item note (e.g. medium rare)", orderNote: "Order note",
    sendOrder: "Send order", total: "Total", empty: "Your order is empty", noResults: "No dishes match your search.", noFavorites: "No favourites yet. Tap the heart icon on any dish to save it.",
    orderSent: "Order received", orderStatus: "Order status", close: "Close", callWaiter: "Call waiter", backToMenu: "Back to menu", yourName: "Your name (optional)",
    status_new: "Received", status_preparing: "Preparing", status_ready: "Ready", status_delivered: "Served", status_cancelled: "Cancelled",
    campaigns: "Offers", dailySpecials: "Today's specials", today: "Today", open: "Open", closed: "Closed", orderDisabled: "Please place your order with our team at your table.",
    priceNote: "Prices include VAT.", call: "Call", directions: "Directions", remove: "Remove", quantity: "Qty", orderNumber: "Order no", reservation: "Reservation",
    allergenInfo: "Allergen info", vegOnly: "Vegetarian", oldPrice: "Was", unavailable: "Currently unavailable",
  },
  de: {
    menu: "Speisekarte", search: "Speisekarte durchsuchen…", all: "Alle", favorites: "Favoriten", table: "Tisch", soldOut: "Ausverkauft", new: "Neu", popular: "Beliebt",
    featured: "Empfehlung", daily: "Tagesgericht", vegetarian: "Vegetarisch", vegan: "Vegan", glutenFree: "Glutenfrei", spicy: "Schärfe", campaign: "Angebot",
    ingredients: "Zutaten", allergens: "Allergene", calories: "Kalorien", portion: "Portion", prepTime: "Zubereitung", minutes: "Min.",
    addToCart: "Hinzufügen", cart: "Bestellung", yourOrder: "Ihre Bestellung", note: "Notiz", itemNote: "Hinweis (z. B. medium)", orderNote: "Bestellhinweis",
    sendOrder: "Bestellung senden", total: "Gesamt", empty: "Ihre Bestellung ist leer", noResults: "Keine passenden Gerichte gefunden.", noFavorites: "Noch keine Favoriten. Tippen Sie auf das Herz, um ein Gericht zu speichern.",
    orderSent: "Bestellung eingegangen", orderStatus: "Bestellstatus", close: "Schließen", callWaiter: "Kellner rufen", backToMenu: "Zur Speisekarte", yourName: "Ihr Name (optional)",
    status_new: "Eingegangen", status_preparing: "In Zubereitung", status_ready: "Fertig", status_delivered: "Serviert", status_cancelled: "Storniert",
    campaigns: "Angebote", dailySpecials: "Tagesempfehlungen", today: "Heute", open: "Geöffnet", closed: "Geschlossen", orderDisabled: "Bitte bestellen Sie bei unserem Team am Tisch.",
    priceNote: "Preise inkl. MwSt.", call: "Anrufen", directions: "Route", remove: "Entfernen", quantity: "Menge", orderNumber: "Bestell-Nr.", reservation: "Reservierung",
    allergenInfo: "Allergeninfo", vegOnly: "Vegetarisch", oldPrice: "Vorher", unavailable: "Derzeit nicht verfügbar",
  },
} as const;

export type Dict = { [K in keyof (typeof dict)["tr"]]: string };
export function getDict(locale: string): Dict {
  return (dict as Record<string, Dict>)[locale] ?? dict.tr;
}
export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}
