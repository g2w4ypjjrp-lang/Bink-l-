"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Upload, ImageIcon, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/* ───────── Toast ───────── */
type Toast = { id: number; kind: "ok" | "error"; text: string };
const ToastCtx = createContext<(kind: "ok" | "error", text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ───────── Confirm ───────── */
type ConfirmOpts = { title: string; text?: string; confirm?: string; danger?: boolean };
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export const useConfirm = () => useContext(ConfirmCtx);

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const push = useCallback((kind: "ok" | "error", text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  const ask = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setConfirm({ ...o, resolve })), []);
  return (
    <ToastCtx.Provider value={push}>
      <ConfirmCtx.Provider value={ask}>
        {children}
        <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex flex-col gap-2" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={cn("pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl animate-fade-up", t.kind === "ok" ? "bg-forest text-cream" : "bg-red-700 text-white")}>
              {t.kind === "ok" ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />} {t.text}
            </div>
          ))}
        </div>
        {confirm && (
          <Modal
            title={confirm.title}
            onClose={() => {
              confirm.resolve(false);
              setConfirm(null);
            }}
            size="sm"
            footer={
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    confirm.resolve(false);
                    setConfirm(null);
                  }}
                >
                  Vazgeç
                </Button>
                <Button
                  variant={confirm.danger ? "danger" : "primary"}
                  autoFocus
                  onClick={() => {
                    confirm.resolve(true);
                    setConfirm(null);
                  }}
                >
                  {confirm.confirm ?? "Onayla"}
                </Button>
              </>
            }
          >
            {confirm.text && <p className="text-sm text-charcoal/70">{confirm.text}</p>}
          </Modal>
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

/** Server action sonucunu toast ile gösteren yardımcı */
export function useRun() {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async <T,>(p: Promise<{ ok: boolean; error?: string; message?: string; data?: T; fields?: Record<string, string> }>, okText?: string) => {
      setPending(true);
      try {
        const r = await p;
        if (r.ok) {
          if (okText || r.message) toast("ok", r.message || okText!);
        } else toast("error", r.error || "Hata");
        return r;
      } catch {
        toast("error", "Bağlantı hatası");
        return { ok: false as const, error: "Bağlantı hatası" };
      } finally {
        setPending(false);
      }
    },
    [toast]
  );
  return { run, pending };
}

/* ───────── Button ───────── */
export function Button({ variant = "primary", size = "md", loading, className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft" | "gold"; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-9 px-3 text-[13px]" : "h-11 px-4 text-sm",
        variant === "primary" && "bg-forest text-cream hover:bg-deep",
        variant === "gold" && "bg-gold text-deep hover:bg-[#c8ab74]",
        variant === "ghost" && "border border-charcoal/12 bg-white text-charcoal hover:bg-cream",
        variant === "soft" && "bg-forest/8 text-forest hover:bg-forest/15",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ───────── Modal / Drawer ───────── */
export function Modal({ title, onClose, children, footer, size = "md", side = false }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; size?: "sm" | "md" | "lg" | "xl"; side?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className={cn("fixed inset-0 z-[150] flex", side ? "justify-end" : "items-end justify-center sm:items-center sm:p-4")} role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-deep/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          "relative flex max-h-[94svh] w-full flex-col bg-white shadow-2xl",
          side ? "h-full max-h-none max-w-xl animate-[fade-up_.35s_ease_both]" : "animate-fade-up rounded-t-2xl sm:rounded-2xl",
          !side && { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl", xl: "sm:max-w-5xl" }[size]
        )}
      >
        <div className="flex items-center justify-between border-b border-charcoal/8 px-5 py-4">
          <h2 className="font-sans text-base font-semibold tracking-normal text-charcoal">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-cream" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-charcoal/8 px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ───────── Form alanları ───────── */
export function F({ label, children, hint, error, className }: { label: string; children: React.ReactNode; hint?: string; error?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-charcoal/75">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11.5px] text-charcoal/50">{hint}</span>}
      {error && <span className="mt-1 block text-[11.5px] font-medium text-red-600">{error}</span>}
    </label>
  );
}
export const inputCls = "block h-10 w-full rounded-lg border border-charcoal/15 bg-white px-3 text-sm outline-none transition placeholder:text-charcoal/35 focus:border-forest focus:ring-3 focus:ring-forest/10 disabled:bg-cream/50";
export const textareaCls = "block min-h-24 w-full rounded-lg border border-charcoal/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-forest focus:ring-3 focus:ring-forest/10";

export function Toggle({ checked, onChange, label, name }: { checked: boolean; onChange?: (v: boolean) => void; label?: string; name?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" name={name} className="peer sr-only" checked={checked} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="relative h-6 w-10 rounded-full bg-charcoal/15 transition peer-checked:bg-forest peer-focus-visible:ring-2 peer-focus-visible:ring-gold after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
      {label && <span className="text-charcoal/80">{label}</span>}
    </label>
  );
}

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "yellow" | "red" | "blue" | "gold" | "purple" }) {
  const cls = {
    gray: "bg-charcoal/8 text-charcoal/70",
    green: "bg-emerald-100 text-emerald-800",
    yellow: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    blue: "bg-sky-100 text-sky-800",
    gold: "bg-gold/20 text-gold-dark",
    purple: "bg-violet-100 text-violet-800",
  }[tone];
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold", cls)}>{children}</span>;
}

export function Card({ title, actions, children, className, pad = true }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn("rounded-2xl border border-charcoal/8 bg-white", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal/6 px-5 py-3.5">
          {title && <h2 className="font-sans text-[14.5px] font-semibold tracking-normal text-charcoal">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[2rem] leading-none text-forest">{title}</h1>
        {description && <p className="mt-2 text-sm text-charcoal/60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: React.ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto rounded-xl bg-charcoal/5 p-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)} className={cn("whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition", value === t.key ? "bg-white text-forest shadow-sm" : "text-charcoal/60 hover:text-charcoal")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center text-sm text-charcoal/50">
      {icon}
      <p className="mt-2">{text}</p>
    </div>
  );
}

/* ───────── Görsel / video yükleme ───────── */
export async function uploadFile(file: File): Promise<{ url: string; thumbUrl?: string; width?: number; height?: number; type: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Yükleme başarısız");
  return d;
}

export function ImageInput({ value, onChange, accept = "image/*", label = "Görsel yükle", aspect = "aspect-video" }: { value: string; onChange: (url: string) => void; accept?: string; label?: string; aspect?: string }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const isVideo = /\.(mp4|webm)$/i.test(value);
  return (
    <div className="flex items-start gap-3">
      <div className={cn("relative w-40 shrink-0 overflow-hidden rounded-xl border border-dashed border-charcoal/20 bg-cream/50", aspect)}>
        {value ? (
          isVideo ? (
            <video src={value} className="h-full w-full object-cover" muted />
          ) : (
            <img src={value} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <span className="flex h-full w-full items-center justify-center text-charcoal/30">
            <ImageIcon size={26} />
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="animate-spin" />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              const r = await uploadFile(f);
              onChange(r.url);
            } catch (err) {
              toast("error", (err as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => ref.current?.click()} loading={busy}>
          <Upload size={14} /> {label}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <Trash2 size={14} /> Kaldır
          </Button>
        )}
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="veya URL / yol" className="h-8 w-48 rounded-md border border-charcoal/10 px-2 text-[11px] text-charcoal/60" />
      </div>
    </div>
  );
}
