import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, text, align = "left", tone = "dark", className }: { eyebrow?: string; title?: string; text?: string; align?: "left" | "center"; tone?: "dark" | "light"; className?: string }) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", "max-w-2xl", className)}>
      {eyebrow && (
        <p data-reveal className={cn("eyebrow", align === "center" && "justify-center")}>
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 data-reveal style={{ ["--reveal-delay" as string]: "80ms" }} className={cn("h-display mt-5 text-[2.6rem] sm:text-5xl lg:text-[3.6rem]", tone === "light" ? "text-cream" : "text-forest")}>
          {title}
        </h2>
      )}
      {text && (
        <p data-reveal style={{ ["--reveal-delay" as string]: "160ms" }} className={cn("mt-6 text-[15.5px] leading-relaxed", tone === "light" ? "text-cream/75" : "text-charcoal/70")}>
          {text}
        </p>
      )}
    </div>
  );
}

export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("prose-brand", className)}>
      {text.split(/\n{2,}|\n/).filter(Boolean).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
