/* eslint-disable @next/next/no-img-element */
/**
 * Marka logosu (public/brand/). Kaynak dosya ve üretim betiği: scripts/brand/
 *  - logo.webp        koyu yazılı — açık zeminler (kaydırılmış üst çubuk, mobil menü)
 *  - logo-light.webp  krem yazılı — koyu zeminler (ana görsel üstü, alt bilgi)
 *  - icon-64.png      yalnızca yaprak — küçük simge
 * Ayarlardan özel bir logo yüklenirse o kullanılır.
 */
const LOGO_W = 439;
const LOGO_H = 240;

export function LeafMark({ className = "h-9 w-9" }: { className?: string }) {
  return <img src="/brand/icon-64.png" alt="" aria-hidden="true" width={64} height={64} className={`${className} object-contain`} />;
}

export function Logo({ logo, name = "BinKılıç Saklı Bahçe", tone = "dark", className = "h-14" }: { logo?: string; name?: string; tone?: "dark" | "light"; className?: string }) {
  if (logo) return <img src={logo} alt={name} className={`${className} w-auto object-contain`} />;
  return (
    <img
      src={tone === "light" ? "/brand/logo-light.webp" : "/brand/logo.webp"}
      alt={name}
      width={LOGO_W}
      height={LOGO_H}
      fetchPriority="high"
      className={`${className} w-auto select-none object-contain transition-[height] duration-500`}
    />
  );
}
