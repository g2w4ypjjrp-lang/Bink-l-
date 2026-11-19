import Link from "next/link";
import { Instagram, Facebook, Youtube, MapPin, Phone, Mail, ArrowUpRight } from "lucide-react";
import type { Settings } from "@/lib/settings";
import { DAY_NAMES } from "@/lib/hours";
import { telLink, waLink } from "@/lib/utils";
import { Logo } from "./Logo";

export function Footer({ s, directionsUrl }: { s: Settings; directionsUrl: string }) {
  const b = s.business;
  const ordered = [1, 2, 3, 4, 5, 6, 0].map((d) => s.hours.weekly.find((w) => w.day === d)).filter(Boolean);
  const socials = [
    { href: s.social.instagram, icon: Instagram, label: "Instagram" },
    { href: s.social.facebook, icon: Facebook, label: "Facebook" },
    { href: s.social.youtube, icon: Youtube, label: "YouTube" },
  ].filter((x) => x.href);
  return (
    <footer className="relative overflow-hidden bg-deep text-cream/80 grain">
      <div className="leaf-pattern pointer-events-none absolute inset-0 opacity-40" />
      <div className="container-x relative">
        <div className="grid gap-12 border-b border-cream/10 py-20 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo logo={b.logo} tone="light" />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-cream/65">{b.description}</p>
            {socials.length > 0 && (
              <div className="mt-8 flex gap-3">
                {socials.map(({ href, icon: Icon, label }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/15 transition hover:border-gold hover:text-gold">
                    <Icon size={18} />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">İletişim</h2>
            <address className="mt-6 space-y-4 text-sm not-italic">
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="flex gap-3 hover:text-cream">
                <MapPin size={17} className="mt-0.5 shrink-0 text-gold" />
                <span>{b.address}</span>
              </a>
              <a href={telLink(b.phone)} className="flex items-center gap-3 hover:text-cream">
                <Phone size={17} className="text-gold" /> {b.phone}
              </a>
              <a href={`mailto:${b.email}`} className="flex items-center gap-3 hover:text-cream">
                <Mail size={17} className="text-gold" /> {b.email}
              </a>
              <a href={waLink(b.whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-gold hover:text-cream">
                WhatsApp ile yazın <ArrowUpRight size={14} />
              </a>
            </address>
          </div>
          <div className="lg:col-span-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">Çalışma Saatleri</h2>
            <dl className="mt-6 space-y-2 text-sm">
              {ordered.map((w) => (
                <div key={w!.day} className="flex justify-between gap-4 border-b border-cream/5 pb-2">
                  <dt>{DAY_NAMES[w!.day]}</dt>
                  <dd className="tabular-nums text-cream/60">{w!.closed ? "Kapalı" : `${w!.open} – ${w!.close === "24:00" ? "00:00" : w!.close}`}</dd>
                </div>
              ))}
            </dl>
            {s.hours.note && <p className="mt-4 text-xs text-cream/50">{s.hours.note}</p>}
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">Keşfet</h2>
            <ul className="mt-6 space-y-3 text-sm">
              {[["/menu", "Dijital Menü"], ["/rezervasyon", "Rezervasyon"], ["/organizasyon", "Organizasyon"], ["/galeri", "Galeri"], ["/kampanyalar", "Kampanyalar"], ["/hakkimizda", "Hakkımızda"], ["/iletisim", "İletişim"]].map(([h, l]) => (
                <li key={h}>
                  <Link href={h} className="link-underline hover:text-cream">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-col gap-3 py-8 text-xs text-cream/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {b.name}. Tüm hakları saklıdır.</p>
          <div className="flex gap-6">
            <Link href="/kvkk" className="hover:text-cream">KVKK Aydınlatma Metni</Link>
            <Link href="/gorsel-kaynaklari" className="hover:text-cream">Görsel kaynakları</Link>
            <Link href="/admin" prefetch={false} className="hover:text-cream" rel="nofollow">Yönetim</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
