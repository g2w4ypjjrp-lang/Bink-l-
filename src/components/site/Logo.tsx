import Image from "next/image";

export function LeafMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M32 6c12 9 17 21 15.5 35.5C37 37.5 29 28 32 6z" fill="currentColor" opacity=".9" />
      <path d="M32 6C20 15 15 27 16.5 41.5 27 37.5 35 28 32 6z" fill="currentColor" opacity=".55" />
      <path d="M32 18v40" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ logo, name = "BinKılıç Saklı Bahçe", tone = "dark" }: { logo?: string; name?: string; tone?: "dark" | "light" }) {
  if (logo) return <Image src={logo} alt={name} width={180} height={56} className="h-11 w-auto object-contain" priority />;
  const color = tone === "light" ? "text-cream" : "text-forest";
  return (
    <span className={`flex items-center gap-2.5 ${color}`}>
      <LeafMark className={`h-9 w-9 ${tone === "light" ? "text-gold" : "text-gold"}`} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.45rem] font-medium tracking-tight">BinKılıç</span>
        <span className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.38em] opacity-80">Saklı Bahçe</span>
      </span>
    </span>
  );
}
