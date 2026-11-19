import Image from "next/image";

export function PageHero({ eyebrow, title, text, image }: { eyebrow?: string; title: string; text?: string; image?: string }) {
  return (
    <section className="relative isolate flex min-h-[62vh] items-end overflow-hidden bg-deep pb-16 pt-40 text-cream sm:min-h-[68vh] sm:pb-24">
      {image && <Image src={image} alt="" fill priority sizes="100vw" quality={60} className="-z-10 animate-ken-burns object-cover opacity-70" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-deep via-deep/45 to-deep/20" />
      <div className="container-x">
        {eyebrow && <p className="eyebrow animate-fade-up">{eyebrow}</p>}
        <h1 className="h-display mt-5 max-w-4xl animate-rise text-[3rem] [animation-delay:120ms] sm:text-6xl lg:text-[5.2rem]">{title}</h1>
        {text && <p className="mt-6 max-w-xl animate-rise text-base leading-relaxed text-cream/80 [animation-delay:240ms] sm:text-lg">{text}</p>}
      </div>
    </section>
  );
}
