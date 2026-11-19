"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Mobilde alttan açılan, masaüstünde ortalanan erişilebilir panel */
export function Sheet({ onClose, label, children, footer }: { onClose: () => void; label: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", k);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <button className="absolute inset-0 bg-deep/55 backdrop-blur-[2px] animate-[fade-up_.3s_ease_both]" onClick={onClose} aria-label="Kapat" tabIndex={-1} />
      <div
        ref={ref}
        tabIndex={-1}
        className="relative flex max-h-[92svh] w-full max-w-lg flex-col overflow-hidden rounded-t-[30px] bg-ivory shadow-2xl outline-none animate-[fade-up_.4s_var(--ease-soft)_both] sm:rounded-[30px]"
        onTouchStart={(e) => {
          const el = e.currentTarget.querySelector("[data-scroll]") as HTMLElement | null;
          startY.current = el && el.scrollTop > 0 ? null : e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 110) onClose();
          startY.current = null;
        }}
      >
        <span className="absolute left-1/2 top-2 z-10 h-1.5 w-11 -translate-x-1/2 rounded-full bg-cream/80 sm:hidden" aria-hidden="true" />
        <button onClick={onClose} className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/90 text-charcoal shadow backdrop-blur" aria-label="Kapat">
          <X size={18} />
        </button>
        <div data-scroll className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-beige/70 bg-ivory p-4 pb-[max(env(safe-area-inset-bottom),16px)]">{footer}</div>}
      </div>
    </div>
  );
}
