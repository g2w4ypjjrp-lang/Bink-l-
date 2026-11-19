"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import { Logo } from "./Logo";
import { useOpenStatus } from "./LiveStatus";

const NAV = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/menu", label: "Menü" },
  { href: "/galeri", label: "Galeri" },
  { href: "/organizasyon", label: "Organizasyon" },
  { href: "/kampanyalar", label: "Kampanyalar" },
  { href: "/iletisim", label: "İletişim" },
];

export function Header({ logo, phone, telHref, status: initialStatus }: { logo?: string; phone: string; telHref: string; status: { open: boolean; label: string; detail: string } }) {
  const status = useOpenStatus(initialStatus);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const solid = scrolled || open;
  // Menü açıkken backdrop-blur KULLANILMAZ: blur, içindeki "fixed" mobil menüyü üst çubuğun boyuna hapseder (arka plan tam ekranı kaplamaz).
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${open ? "bg-ivory" : solid ? "bg-ivory/92 shadow-[0_1px_0_rgba(36,39,34,0.06)] backdrop-blur-xl" : "bg-gradient-to-b from-deep/50 to-transparent"}`}>
      <div className={`container-x flex items-center justify-between transition-all duration-500 ${solid ? "h-[72px]" : "h-[88px]"}`}>
        <Link href="/" aria-label="Ana sayfa" className="relative z-10">
          <Logo logo={logo} tone={solid ? "dark" : "light"} />
        </Link>
        <nav aria-label="Ana menü" className="hidden lg:block">
          <ul className={`flex items-center gap-8 text-[13.5px] font-medium tracking-wide ${solid ? "text-charcoal" : "text-cream"}`}>
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={`link-underline py-1 ${pathname.startsWith(n.href) ? "text-gold" : ""}`}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          <span className={`hidden items-center gap-2 text-xs xl:flex ${solid ? "text-charcoal/70" : "text-cream/85"}`}>
            <span className={`h-2 w-2 rounded-full ${status.open ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.2)]" : "bg-red-400"}`} />
            {status.label}
          </span>
          <a href={telHref} className={`hidden h-11 w-11 items-center justify-center rounded-full border transition md:flex ${solid ? "border-forest/20 text-forest hover:bg-forest hover:text-cream" : "border-cream/30 text-cream hover:bg-cream hover:text-forest"}`} aria-label={`Ara: ${phone}`}>
            <Phone size={17} />
          </a>
          <Link href="/rezervasyon" className={`hidden sm:inline-flex ${solid ? "btn-primary" : "btn-light"} !py-3`}>
            Rezervasyon
          </Link>
          <button onClick={() => setOpen((v) => !v)} className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full lg:hidden ${solid ? "text-forest" : "text-cream"}`} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Menüyü kapat" : "Menüyü aç"}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      <div id="mobile-nav" className={`fixed inset-0 top-0 -z-0 h-dvh overflow-y-auto bg-ivory transition-[opacity,visibility] duration-500 lg:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`}>
        <nav aria-label="Mobil menü" className="container-x flex h-full flex-col pb-10 pt-28">
          <ul className="space-y-1">
            {[{ href: "/", label: "Ana Sayfa" }, ...NAV, { href: "/rezervasyon", label: "Rezervasyon" }].map((n, i) => (
              <li key={n.href} style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms" }} className={`transition-all duration-500 ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
                <Link href={n.href} className="block border-b border-beige/70 py-3.5 font-display text-[2rem] leading-tight text-forest">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex gap-3">
            <a href={telHref} className="btn-ghost flex-1 text-forest">
              <Phone size={16} /> Ara
            </a>
            <Link href="/rezervasyon" className="btn-primary flex-1">
              Rezervasyon
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
