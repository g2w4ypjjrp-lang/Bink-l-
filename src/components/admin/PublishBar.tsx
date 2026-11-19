"use client";
import { useState, useTransition } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { publishSite } from "@/app/admin/(panel)/publish-actions";
import type { PublishState } from "@/lib/publish";

const fmt = (iso: string) => new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Panelin üstünde: yayınlanmamış değişiklik uyarısı + "Değişiklikleri sitede yayınla" butonu. */
export function PublishBar({ state }: { state: PublishState }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const hasChanges = state.pending > 0 && !done;
  const publish = () =>
    start(async () => {
      const r = await publishSite();
      if (r.ok) {
        setDone(true);
        setMsg({ ok: true, text: "Yayın başlatıldı. Değişiklikler yaklaşık 3–5 dakika içinde sitede görünecek." });
      } else setMsg({ ok: false, text: r.error });
    });
  return (
    <div className={`mb-6 flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${hasChanges ? "border-amber-300 bg-amber-50" : "border-forest/10 bg-white"}`}>
      <div className="flex items-start gap-2">
        {hasChanges ? <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />}
        <div>
          <p className="font-semibold text-charcoal">
            {hasChanges ? `Sitede yayınlanmamış ${state.pending} değişiklik var` : done ? "Yayın başlatıldı" : "Site güncel"}
          </p>
          <p className="text-xs text-charcoal/60">
            {msg ? msg.text : state.lastAt ? `Son yayın: ${fmt(state.lastAt)}${state.by ? ` · ${state.by}` : ""}` : "Henüz panelden yayın yapılmadı."}
            {!msg && hasChanges && " Menü, fiyat, fotoğraf ve sayfa değişiklikleri siz yayınlayana kadar ziyaretçilere görünmez."}
          </p>
          {msg && !msg.ok && <p className="mt-1 text-xs font-semibold text-red-700">{msg.text}</p>}
        </div>
      </div>
      <button
        onClick={publish}
        disabled={pending || !state.hookConfigured}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-forest px-4 font-semibold text-cream transition hover:bg-deep disabled:opacity-50"
        title={state.hookConfigured ? "" : "DEPLOY_HOOK_URL tanımlı değil"}
      >
        <UploadCloud size={16} /> {pending ? "Başlatılıyor…" : "Değişiklikleri sitede yayınla"}
      </button>
    </div>
  );
}
