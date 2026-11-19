"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, LayoutGrid, Rows3, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryItemDTO = { id: string; type: string; url: string; thumbUrl: string | null; title: string | null; description: string | null; alt: string | null; categoryId: string | null; width: number | null; height: number | null };

export function GalleryGrid({ items, categories, showFilters = true, initialLayout = "masonry" }: { items: GalleryItemDTO[]; categories: { id: string; name: string }[]; showFilters?: boolean; initialLayout?: "grid" | "masonry" }) {
  const [cat, setCat] = useState<string>("all");
  const [layout, setLayout] = useState(initialLayout);
  const [index, setIndex] = useState<number | null>(null);
  const filtered = cat === "all" ? items : cat === "video" ? items.filter((i) => i.type === "video") : items.filter((i) => i.categoryId === cat);
  const usedCats = categories.filter((c) => items.some((i) => i.categoryId === c.id));
  const hasVideo = items.some((i) => i.type === "video");

  return (
    <div>
      {showFilters && (
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Galeri kategorileri">
            {[{ id: "all", name: "Tümü" }, ...usedCats, ...(hasVideo ? [{ id: "video", name: "Videolar" }] : [])].map((c) => (
              <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={cn("whitespace-nowrap rounded-full border px-4 py-2 text-sm transition", cat === c.id ? "border-forest bg-forest text-cream" : "border-beige text-charcoal/75 hover:border-forest")}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="hidden gap-1 rounded-full border border-beige p-1 sm:flex">
            <button aria-label="Masonry görünüm" aria-pressed={layout === "masonry"} onClick={() => setLayout("masonry")} className={cn("rounded-full p-2", layout === "masonry" && "bg-forest text-cream")}>
              <Rows3 size={16} />
            </button>
            <button aria-label="Izgara görünüm" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} className={cn("rounded-full p-2", layout === "grid" && "bg-forest text-cream")}>
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      )}
      <ul className={cn(layout === "masonry" ? "columns-2 gap-3 sm:gap-5 md:columns-3 [&>li]:mb-3 sm:[&>li]:mb-5" : "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4")}>
        {filtered.map((it, i) => (
          <li key={it.id} className="break-inside-avoid" data-reveal="scale" style={{ ["--reveal-delay" as string]: `${(i % 6) * 60}ms` }}>
            <button onClick={() => setIndex(i)} className="img-zoom group relative block w-full overflow-hidden rounded-2xl bg-beige/40" >
              {it.type === "video" ? (
                <div className={cn("relative w-full bg-deep", layout === "grid" ? "aspect-square" : "aspect-[4/5]")}>
                  {it.thumbUrl && <Image src={it.thumbUrl} alt={it.alt || ""} fill sizes="(max-width:768px) 50vw, 33vw" className="object-cover opacity-80" />}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ivory/90 text-forest">
                      <Play size={22} />
                    </span>
                  </span>
                </div>
              ) : layout === "grid" ? (
                <div className="relative aspect-square">
                  <Image src={it.thumbUrl || it.url} alt={it.alt || it.title || ""} fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover" />
                </div>
              ) : (
                <Image src={it.thumbUrl || it.url} alt={it.alt || it.title || ""} width={it.width || 1200} height={it.height || 800} sizes="(max-width:768px) 50vw, 33vw" className="h-auto w-full" />
              )}
              {it.title && (
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-deep/80 to-transparent p-4 pt-10 text-left text-sm text-cream opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  {it.title}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {index !== null && filtered[index] && <Lightbox items={filtered} index={index} setIndex={setIndex} />}
    </div>
  );
}

function Lightbox({ items, index, setIndex }: { items: GalleryItemDTO[]; index: number; setIndex: (i: number | null) => void }) {
  const it = items[index];
  const touch = useRef<number | null>(null);
  const prev = useCallback(() => setIndex((index - 1 + items.length) % items.length), [index, items.length, setIndex]);
  const next = useCallback(() => setIndex((index + 1) % items.length), [index, items.length, setIndex]);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [prev, next, setIndex]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={it.title || "Görsel"}
      className="fixed inset-0 z-[100] flex flex-col bg-deep/97 text-cream backdrop-blur"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
        touch.current = null;
      }}
    >
      <div className="flex items-center justify-between p-4 text-sm">
        <span className="tabular-nums text-cream/60">
          {index + 1} / {items.length}
        </span>
        <button ref={closeRef} onClick={() => setIndex(null)} aria-label="Kapat" className="rounded-full p-2 hover:bg-cream/10">
          <X size={26} />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-2 sm:px-16" onClick={(e) => e.target === e.currentTarget && setIndex(null)}>
        {it.type === "video" ? (
          <video src={it.url} controls autoPlay playsInline className="max-h-[78vh] max-w-full rounded-lg" />
        ) : (
          <div className="relative h-[78vh] w-full">
            <Image src={it.url} alt={it.alt || it.title || ""} fill sizes="100vw" className="object-contain" priority />
          </div>
        )}
        <button onClick={prev} aria-label="Önceki" className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-cream/10 p-3 hover:bg-cream/20 sm:block">
          <ChevronLeft />
        </button>
        <button onClick={next} aria-label="Sonraki" className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-cream/10 p-3 hover:bg-cream/20 sm:block">
          <ChevronRight />
        </button>
      </div>
      <div className="p-5 text-center">
        {it.title && <p className="font-display text-2xl">{it.title}</p>}
        {it.description && <p className="mt-1 text-sm text-cream/60">{it.description}</p>}
      </div>
    </div>
  );
}
