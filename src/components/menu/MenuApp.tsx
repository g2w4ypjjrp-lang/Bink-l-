"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Heart, Globe, Phone, MapPin, ShoppingBag, Receipt, ChevronRight, Clock, Leaf, Sprout, WheatOff, Check } from "lucide-react";
import type { MenuData, MenuProduct, MenuCategory } from "@/lib/menu";
import { getDict, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { sendEvent } from "@/components/site/Tracker";
import { useOpenStatus } from "@/components/site/LiveStatus";
import { isLocale } from "@/lib/i18n";
import { DietIcons, Price, Tags, fmt, normalize, readLS, writeLS, priceInfo } from "./shared";
import { ProductSheet } from "./ProductSheet";
import { CartSheet, type CartItem } from "./CartSheet";

type Props = {
  data: MenuData;
  initialLocale: string;
  locales: string[];
  currency: string;
  showPrices: boolean;
  orderingEnabled: boolean;
  footerNote: string;
  /** Aktif masalar; hangi masada olunduğu adres çubuğundaki ?table=&t= ile tarayıcıda belirlenir. */
  tables: { number: number; name: string | null }[];
  business: { name: string; phone: string; tel: string; wa: string; address: string; logo: string };
  status: { open: boolean; label: string; detail: string };
  cover: { title: string; text: string; image: string };
};

type Filter = "veg" | "vegan" | "gf" | "fav";

function nowMinutesIstanbul() {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  return (Number(p.find((x) => x.type === "hour")?.value) % 24) * 60 + Number(p.find((x) => x.type === "minute")?.value);
}
/** Menü kutucukları için ~240 px küçük sürüm (yayın sırasında üretilir: x.webp → x_s.webp) */
const smallImage = (u: string) => (u.startsWith("/uploads/") ? u.replace(/\.(webp|jpe?g|png|avif|gif)$/i, "_s.webp") : u);
const toMin = (t: string) => Number(t.split(":")[0]) * 60 + Number(t.split(":")[1] || 0);

export function MenuApp(props: Props) {
  const { data, currency, showPrices, orderingEnabled, business, cover } = props;
  const status = useOpenStatus(props.status);
  const [locale, setLocale] = useState<Locale>(props.initialLocale as Locale);
  // Sayfa statik olduğundan adres parametreleri tarayıcıda okunur
  const [url, setUrl] = useState<{ table: { number: number; token: string; name: string | null } | null; product: string | null; fromQr: boolean } | null>(null);
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const n = Number(sp.get("table"));
    const row = Number.isInteger(n) && n > 0 ? props.tables.find((x) => x.number === n) : undefined;
    const lang = sp.get("lang");
    if (lang && isLocale(lang) && props.locales.includes(lang)) setLocale(lang as Locale);
    setUrl({ table: row ? { number: row.number, token: sp.get("t") || "", name: row.name } : null, product: sp.get("urun"), fromQr: sp.get("src") === "qr" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const table = url?.table ?? null;
  const t = getDict(locale);
  const L = useCallback((o: Record<string, string>) => o[locale] || o.tr || "", [locale]);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Set<Filter>>(new Set());
  const [favorites, setFavorites] = useState<string[]>([]);
  const [active, setActive] = useState<string>("");
  const [product, setProduct] = useState<MenuProduct | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    setNowMin(nowMinutesIstanbul());
    const i = setInterval(() => setNowMin(nowMinutesIstanbul()), 60000);
    return () => clearInterval(i);
  }, []);
  const [orders, setOrders] = useState<{ id: string; number: number; status: string }[]>([]);
  const canOrder = orderingEnabled && !!table?.token;
  const cartKey = `sb_cart_${table?.number ?? 0}`;
  const navRef = useRef<HTMLDivElement>(null);
  const seenCats = useRef(new Set<string>());

  // ── yerel depolama
  useEffect(() => {
    if (!url) return;
    const saved = readLS<string | null>("sb_locale", null);
    if (saved && props.locales.includes(saved) && !new URLSearchParams(location.search).get("lang")) setLocale(saved as Locale);
    setFavorites(readLS("sb_favs", []));
    setCart(readLS(cartKey, []));
    sendEvent({ type: "menu_view", path: "/menu" + (table ? `?table=${table.number}` : ""), qr: url.fromQr, ref: document.referrer || undefined });
    if (table) {
      const url = new URL(location.href);
      url.searchParams.delete("src");
      writeLS("sb_menu_url", url.pathname + url.search);
      if (url.searchParams.has("src")) {
        url.searchParams.delete("src");
        history.replaceState(history.state, "", url.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  useEffect(() => writeLS("sb_locale", locale), [locale]);
  useEffect(() => writeLS("sb_favs", favorites), [favorites]);
  useEffect(() => writeLS(cartKey, cart), [cart, cartKey]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // ── aktif siparişlerin canlı takibi
  const pollOrders = useCallback(async () => {
    const stored = readLS<{ id: string; at: number }[]>("sb_orders", []).filter((o) => Date.now() - o.at < 6 * 3600_000);
    writeLS("sb_orders", stored);
    const res = await Promise.all(
      stored.slice(-3).map((o) =>
        fetch(`/api/orders/${o.id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d ? { id: o.id, number: d.number, status: d.status } : null))
          .catch(() => null)
      )
    );
    setOrders(res.filter((x): x is { id: string; number: number; status: string } => !!x && x.status !== "delivered" && x.status !== "cancelled"));
  }, []);
  useEffect(() => {
    pollOrders();
    const i = setInterval(pollOrders, 10000);
    return () => clearInterval(i);
  }, [pollOrders]);

  // ── kategori ağacı
  const tops = useMemo(() => data.categories.filter((c) => !c.parentId || !data.categories.some((x) => x.id === c.parentId)), [data.categories]);
  const childrenOf = useCallback((id: string) => data.categories.filter((c) => c.parentId === id), [data.categories]);
  const topOf = useCallback(
    (catId: string) => {
      const c = data.categories.find((x) => x.id === catId);
      return c?.parentId && data.categories.some((x) => x.id === c.parentId) ? c.parentId : catId;
    },
    [data.categories]
  );

  // ── filtreleme
  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return data.products.filter((p) => {
      if (filters.has("veg") && !p.vegetarian) return false;
      if (filters.has("vegan") && !p.vegan) return false;
      if (filters.has("gf") && !p.glutenFree) return false;
      if (filters.has("fav") && !favorites.includes(p.id)) return false;
      if (!q) return true;
      return normalize([L(p.name), p.name.tr, L(p.description), L(p.ingredients), p.tags.join(" ")].join(" ")).includes(q);
    });
  }, [data.products, query, filters, favorites, L]);

  const sections = useMemo(
    () =>
      tops
        .map((cat) => {
          const items = visible.filter((p) => topOf(p.categoryId) === cat.id);
          const subs = childrenOf(cat.id);
          const groups: { sub: MenuCategory | null; items: MenuProduct[] }[] = [{ sub: null, items: items.filter((p) => !p.subcategoryId && p.categoryId === cat.id) }];
          for (const s of subs) groups.push({ sub: s, items: items.filter((p) => p.subcategoryId === s.id || p.categoryId === s.id) });
          const placed = new Set(groups.flatMap((g) => g.items.map((i) => i.id)));
          groups[0].items.push(...items.filter((i) => !placed.has(i.id)));
          return { cat, groups: groups.filter((g) => g.items.length), count: items.length };
        })
        .filter((s) => s.count > 0),
    [tops, visible, childrenOf, topOf]
  );
  const dailies = useMemo(() => data.products.filter((p) => p.daily || p.featured).slice(0, 8), [data.products]);
  const searching = query.trim().length > 0 || filters.size > 0;

  // ── scrollspy
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.cat.slug)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) {
          const slug = vis[0].target.id;
          setActive(slug);
          const cat = sections.find((s) => s.cat.slug === slug)?.cat;
          if (cat && !seenCats.current.has(cat.id)) {
            seenCats.current.add(cat.id);
            sendEvent({ type: "category_view", path: "/menu", entityId: cat.id, entityName: cat.name.tr });
          }
        }
      },
      { rootMargin: "-140px 0px -60% 0px" }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [sections]);
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>(`[data-cat="${active}"]`);
    if (el && navRef.current) navRef.current.scrollTo({ left: el.offsetLeft - 16, behavior: "smooth" });
  }, [active]);

  // ── ürün detayı (geri tuşu ile kapanır)
  const openProduct = useCallback((p: MenuProduct) => {
    setProduct(p);
    history.pushState({ sheet: p.id }, "");
    sendEvent({ type: "product_view", path: "/menu", entityId: p.id, entityName: p.name.tr });
  }, []);
  const closeProduct = useCallback(() => {
    if (history.state?.sheet) history.back();
    else setProduct(null);
  }, []);
  useEffect(() => {
    const on = () => {
      setProduct(null);
      setCartOpen(false);
    };
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  useEffect(() => {
    if (url?.product) {
      const p = data.products.find((x) => x.slug === url.product);
      if (p) openProduct(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  // URL hash ile kategoriye git (/menu#tatlilar)
  useEffect(() => {
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) setTimeout(() => document.getElementById(h)?.scrollIntoView(), 50);
  }, []);

  function goTo(slug: string) {
    const el = document.getElementById(slug);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 128, behavior: "smooth" });
  }
  const toggleFilter = (f: Filter) =>
    setFilters((s) => {
      const n = new Set(s);
      if (n.has(f)) n.delete(f);
      else n.add(f);
      return n;
    });
  const toggleFav = (id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  function addToCart(p: MenuProduct, qty: number, note: string) {
    setCart((c) => {
      const i = c.findIndex((x) => x.productId === p.id && (x.note || "") === (note || ""));
      if (i >= 0) return c.map((x, k) => (k === i ? { ...x, quantity: Math.min(50, x.quantity + qty) } : x));
      return [...c, { productId: p.id, quantity: qty, note }];
    });
    flash(`${L(p.name)} · ${t.addToCart} ✓`);
  }
  const cartCount = cart.reduce((a, i) => a + i.quantity, 0);
  const cartTotal = cart.reduce((a, i) => {
    const p = data.products.find((x) => x.id === i.productId);
    return a + (p ? priceInfo(p).current * i.quantity : 0);
  }, 0);

  async function callWaiter(reason: "bill") {
    if (!table?.token) return;
    const r = await fetch("/api/waiter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: table.number, token: table.token, reason }) });
    const d = await r.json().catch(() => ({}));
    flash(r.ok ? (locale === "tr" ? "Ekibimize haber verildi ✓" : locale === "de" ? "Unser Team wurde benachrichtigt ✓" : "Our team has been notified ✓") : d.error || "Hata");
  }


  return (
    <div className="mx-auto max-w-3xl pb-32">
      {/* Kapak */}
      <header className="relative isolate overflow-hidden rounded-b-[32px] bg-deep px-5 pb-7 pt-[max(env(safe-area-inset-top),1.25rem)] text-cream">
        {cover.image && <Image src={cover.image} alt="" fill priority quality={55} sizes="(max-width:768px) 100vw, 768px" className="-z-10 object-cover opacity-55" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-deep/40 via-deep/30 to-deep/95" />
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label={business.name}>
            {business.logo ? (
              <Image src={business.logo} alt={business.name} width={120} height={40} className="h-9 w-auto" />
            ) : (
              <span className="leading-none">
                <span className="block font-display text-2xl">BinKılıç</span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.35em] text-cream/75">Saklı Bahçe</span>
              </span>
            )}
          </Link>
          <div className="relative">
            <button onClick={() => setLangOpen((v) => !v)} className="flex h-10 items-center gap-1.5 rounded-full bg-cream/15 px-3.5 text-sm font-semibold backdrop-blur" aria-haspopup="listbox" aria-expanded={langOpen}>
              <Globe size={16} /> {locale.toUpperCase()}
            </button>
            {langOpen && (
              <ul role="listbox" className="absolute right-0 top-12 z-30 w-40 overflow-hidden rounded-2xl bg-ivory py-1 text-charcoal shadow-2xl">
                {props.locales.map((l) => (
                  <li key={l}>
                    <button
                      role="option"
                      aria-selected={l === locale}
                      onClick={() => {
                        setLocale(l as Locale);
                        setLangOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-cream"
                    >
                      {LOCALE_NAMES[l as Locale] ?? l} {l === locale && <Check size={15} className="text-forest" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="mt-14">
          {table && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-xs font-bold text-deep">
              {t.table} {table.number}
            </span>
          )}
          <h1 className="font-display text-5xl leading-none">{locale === "tr" ? cover.title || t.menu : t.menu}</h1>
          {locale === "tr" && cover.text && <p className="mt-2 text-sm text-cream/75">{cover.text}</p>}
          <p className="mt-4 flex items-center gap-2 text-xs text-cream/80">
            <span className={cn("h-2 w-2 rounded-full", status.open ? "bg-emerald-400" : "bg-red-400")} />
            {status.open ? t.open : t.closed}
            {locale === "tr" && <span className="text-cream/55">· {status.detail}</span>}
          </p>
        </div>
      </header>

      {/* Yapışkan arama + kategoriler */}
      <div className="sticky top-0 z-20 bg-cream/95 pb-2 pt-3 backdrop-blur-md">
        <div className="px-4">
          <label className="relative block">
            <span className="sr-only">{t.search}</span>
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" enterKeyHint="search" placeholder={t.search} className="h-12 w-full rounded-full border border-beige bg-ivory pl-11 pr-11 text-[15px] outline-none transition focus:border-forest focus:ring-4 focus:ring-forest/10" />
            {query && (
              <button onClick={() => setQuery("")} aria-label={t.close} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-beige/60">
                <X size={15} />
              </button>
            )}
          </label>
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filtreler">
          {(
            [
              ["fav", t.favorites, Heart],
              ["veg", t.vegetarian, Leaf],
              ["vegan", t.vegan, Sprout],
              ["gf", t.glutenFree, WheatOff],
            ] as const
          ).map(([k, label, Icon]) => (
            <button key={k} onClick={() => toggleFilter(k)} aria-pressed={filters.has(k)} className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition", filters.has(k) ? "border-forest bg-forest text-cream" : "border-beige bg-ivory text-charcoal/75")}>
              <Icon size={14} fill={k === "fav" && filters.has(k) ? "currentColor" : "none"} /> {label}
              {k === "fav" && favorites.length > 0 && <span className="text-[11px] opacity-70">{favorites.length}</span>}
            </button>
          ))}
        </div>
        {!searching && (
          <nav ref={navRef} aria-label="Kategoriler" className="no-scrollbar mt-2 flex gap-1 overflow-x-auto px-4 pb-1">
            {sections.map(({ cat }) => (
              <button key={cat.id} data-cat={cat.slug} onClick={() => goTo(cat.slug)} className={cn("relative shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold transition", active === cat.slug ? "bg-gold/20 text-forest" : "text-charcoal/70")}>
                {L(cat.name)}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Aktif sipariş */}
      {orders.length > 0 && (
        <div className="mx-4 mt-3 space-y-2">
          {orders.map((o) => (
            <Link key={o.id} href={`/menu/siparis/${o.id}`} className="flex items-center justify-between rounded-2xl bg-forest px-4 py-3 text-sm text-cream">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
                </span>
                {t.orderNumber} #{o.number} · <b>{(t as Record<string, string>)[`status_${o.status}`] ?? o.status}</b>
              </span>
              <ChevronRight size={18} />
            </Link>
          ))}
        </div>
      )}

      {/* Kampanyalar & öneriler */}
      {!searching && (data.campaigns.length > 0 || dailies.length > 0) && (
        <section className="mt-5">
          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
            {data.campaigns.map((c) => (
              <article key={c.id} className="relative flex h-40 w-[82%] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-3xl bg-forest p-4 text-cream">
                {c.image && <Image src={c.image} alt="" fill sizes="80vw" className="object-cover opacity-60" />}
                <div className="absolute inset-0 bg-gradient-to-t from-deep/90 to-transparent" />
                <div className="relative">
                  <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-deep">{c.discountRate ? `%${c.discountRate}` : t.campaign}</span>
                  <h2 className="mt-2 font-display text-2xl leading-tight">{c.title}</h2>
                  {c.description && <p className="line-clamp-1 text-xs text-cream/75">{c.description}</p>}
                </div>
              </article>
            ))}
            {dailies.map((p) => (
              <button key={p.id} onClick={() => openProduct(p)} className="relative h-40 w-[42%] shrink-0 snap-start overflow-hidden rounded-3xl bg-beige text-left text-cream">
                {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="45vw" className="object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-deep/85 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-ivory/90 px-2 py-0.5 text-[10px] font-bold uppercase text-forest">{p.daily ? t.daily : t.featured}</span>
                <span className="absolute inset-x-3 bottom-3">
                  <span className="line-clamp-2 font-display text-lg leading-tight">{L(p.name)}</span>
                  {showPrices && <span className="text-xs font-semibold text-beige">{fmt(priceInfo(p).current, currency, locale)}</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Ürünler */}
      <div className="mt-4">
        {sections.length === 0 && (
          <p className="px-6 py-20 text-center text-sm text-charcoal/60">{filters.has("fav") && !query ? t.noFavorites : t.noResults}</p>
        )}
        {sections.map(({ cat, groups }) => {
          const outside = cat.availableFrom && cat.availableTo && nowMin !== null && (nowMin < toMin(cat.availableFrom) || nowMin > toMin(cat.availableTo));
          return (
            <section key={cat.id} id={cat.slug} className="scroll-mt-36 px-4 pt-7" aria-labelledby={`h-${cat.slug}`}>
              <div className="flex items-end justify-between gap-3 px-1">
                <h2 id={`h-${cat.slug}`} className="font-display text-[2rem] leading-none text-forest">
                  {L(cat.name)}
                </h2>
                {cat.availableFrom && cat.availableTo && (
                  <span className={cn("flex items-center gap-1 text-[11px] font-medium", outside ? "text-[#a8431f]" : "text-charcoal/65")}>
                    <Clock size={12} /> {cat.availableFrom}–{cat.availableTo}
                  </span>
                )}
              </div>
              {L(cat.description) && <p className="mt-2 px-1 text-sm text-charcoal/60">{L(cat.description)}</p>}
              {groups.map((g, gi) => (
                <div key={g.sub?.id ?? `main-${gi}`}>
                  {g.sub && <h3 className="mb-1 mt-5 px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-dark">{L(g.sub.name)}</h3>}
                  <ul className="mt-3 space-y-3">
                    {g.items.map((p) => (
                      <li key={p.id}>
                        <div className={cn("relative flex gap-3 rounded-[22px] bg-ivory p-3 shadow-[0_1px_0_rgba(36,39,34,0.05)] transition active:scale-[0.99]", !p.inStock && "opacity-60")}>
                          <button onClick={() => openProduct(p)} className="flex min-w-0 flex-1 flex-col text-left" aria-label={`${L(p.name)} — detay`}>
                            <Tags p={p} t={t} />
                            <span className="mt-1 text-[16px] font-semibold leading-snug text-charcoal">{L(p.name)}</span>
                            {L(p.description) && <span className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-charcoal/70">{L(p.description)}</span>}
                            <span className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                              {showPrices && <Price p={p} currency={currency} locale={locale} />}
                              <DietIcons p={p} t={t} />
                            </span>
                          </button>
                          {p.images[0] && (
                            <button onClick={() => openProduct(p)} className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-2xl bg-beige" tabIndex={-1} aria-hidden="true">
                              <Image src={smallImage(p.images[0].url)} alt="" fill sizes="104px" className="object-cover" />
                              {!p.inStock && <span className="absolute inset-0 flex items-center justify-center bg-charcoal/50 text-[11px] font-bold uppercase text-cream">{t.soldOut}</span>}
                            </button>
                          )}
                          <button onClick={() => toggleFav(p.id)} aria-label={t.favorites} aria-pressed={favorites.includes(p.id)} className={cn("absolute flex h-8 w-8 items-center justify-center rounded-full", p.images[0] ? "right-4 top-4 bg-ivory/90 backdrop-blur" : "right-2 top-2")}>
                            <Heart size={15} className={favorites.includes(p.id) ? "fill-[#c0532f] text-[#c0532f]" : "text-charcoal/50"} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {/* Alt bilgi */}
      <footer className="mx-4 mt-12 rounded-[28px] bg-forest p-6 text-sm text-cream/80">
        <p className="font-display text-2xl text-cream">{business.name}</p>
        <p className="mt-3 flex gap-2 text-xs leading-relaxed">
          <MapPin size={14} className="mt-0.5 shrink-0 text-gold" /> {business.address}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <a href={business.tel} className="flex h-12 items-center justify-center gap-2 rounded-full bg-cream/10 font-semibold text-cream">
            <Phone size={16} /> {t.call}
          </a>
          <a href={business.wa} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#1d7a46] font-semibold text-white">
            WhatsApp
          </a>
        </div>
        <p className="mt-5 text-[11px] leading-relaxed text-cream/55">{locale === "tr" ? props.footerNote : t.priceNote}</p>
        {!orderingEnabled && table && <p className="mt-2 text-[11px] text-cream/55">{t.orderDisabled}</p>}
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-cream/45">
          <span>V = {t.vegetarian}</span>
          <span>VG = {t.vegan}</span>
          <span>{t.allergenInfo}: {data.allergens.map((a) => `${a.icon ?? ""} ${a.name[locale] ?? a.name.tr}`).join(" · ")}</span>
        </div>
      </footer>

      {/* Alt eylem çubuğu */}
      {canOrder && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-3xl px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="flex gap-2">
            {canOrder && (
              <>
                <button onClick={() => callWaiter("bill")} className="flex h-14 items-center gap-2 rounded-full bg-ivory px-4 text-sm font-semibold text-forest shadow-lg ring-1 ring-beige">
                  <Receipt size={18} /> {locale === "tr" ? "Hesap iste" : locale === "de" ? "Rechnung" : "Request bill"}
                </button>
              </>
            )}
            {canOrder && cartCount > 0 && (
              <button onClick={() => { setCartOpen(true); history.pushState({ sheet: "cart" }, ""); }} className="flex h-14 flex-1 items-center justify-between rounded-full bg-forest px-5 text-cream shadow-[0_12px_30px_-10px_rgba(16,41,29,0.7)]">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="relative">
                    <ShoppingBag size={20} />
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-deep">{cartCount}</span>
                  </span>
                  <span className="ml-2">{t.cart}</span>
                </span>
                <span className="font-semibold">{fmt(cartTotal, currency, locale)}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed inset-x-0 top-4 z-[70] mx-auto w-fit max-w-[90%] rounded-full bg-charcoal px-5 py-3 text-sm font-medium text-cream shadow-xl">
          {toast}
        </div>
      )}

      {product && (
        <ProductSheet
          p={product}
          t={t}
          locale={locale}
          L={L}
          currency={currency}
          showPrices={showPrices}
          allergens={data.allergens}
          canOrder={canOrder}
          isFav={favorites.includes(product.id)}
          onFav={() => toggleFav(product.id)}
          onClose={closeProduct}
          onAdd={(qty, note) => {
            addToCart(product, qty, note);
            closeProduct();
          }}
        />
      )}
      {cartOpen && table && (
        <CartSheet
          items={cart}
          setItems={setCart}
          products={data.products}
          t={t}
          L={L}
          locale={locale}
          currency={currency}
          table={table}
          onClose={() => (history.state?.sheet ? history.back() : setCartOpen(false))}
          onSent={(id) => {
            const stored = readLS<{ id: string; at: number }[]>("sb_orders", []);
            writeLS("sb_orders", [...stored, { id, at: Date.now() }]);
            setCart([]);
            pollOrders();
          }}
        />
      )}
    </div>
  );
}
