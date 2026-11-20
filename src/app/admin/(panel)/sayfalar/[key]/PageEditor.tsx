"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, ExternalLink, RotateCcw, Eye, EyeOff } from "lucide-react";
import type { PageDef, Field } from "@/lib/page-schema";
import { Button, F, inputCls, textareaCls, Toggle, ImageInput, Card, useRun, useConfirm } from "@/components/admin/ui";
import { savePageContent, resetPageSection } from "../actions";

type Content = Record<string, Record<string, unknown>>;

function FieldInput({ f, value, onChange }: { f: Field; value: unknown; onChange: (v: unknown) => void }) {
  if (f.type === "textarea") return <textarea className={`${textareaCls} min-h-28`} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
  if (f.type === "image") return <ImageInput value={String(value ?? "")} onChange={onChange} />;
  if (f.type === "video") return <ImageInput value={String(value ?? "")} onChange={onChange} accept="video/mp4,video/webm" label="Video yükle" />;
  if (f.type === "boolean") return <Toggle checked={!!value} onChange={onChange} />;
  if (f.type === "list") {
    const rows = (Array.isArray(value) ? value : []) as Record<string, unknown>[];
    const update = (i: number, k: string, v: unknown) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
    return (
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="relative rounded-xl border border-charcoal/10 bg-cream/30 p-3 pr-12">
            <div className="grid gap-2 sm:grid-cols-2">
              {f.fields?.map((sf) => (
                <F key={sf.key} label={sf.label} className={sf.type === "textarea" ? "sm:col-span-2" : ""}>
                  {sf.type === "textarea" ? <textarea className={`${textareaCls} min-h-16`} value={String(row[sf.key] ?? "")} onChange={(e) => update(i, sf.key, e.target.value)} /> : <input className={inputCls} value={String(row[sf.key] ?? "")} onChange={(e) => update(i, sf.key, e.target.value)} />}
                </F>
              ))}
            </div>
            <div className="absolute right-2 top-2 flex flex-col gap-1">
              <button type="button" onClick={() => i > 0 && onChange(rows.map((r, j) => (j === i - 1 ? rows[i] : j === i ? rows[i - 1] : r)))} className="rounded p-1 hover:bg-white" aria-label="Yukarı"><ArrowUp size={14} /></button>
              <button type="button" onClick={() => i < rows.length - 1 && onChange(rows.map((r, j) => (j === i + 1 ? rows[i] : j === i ? rows[i + 1] : r)))} className="rounded p-1 hover:bg-white" aria-label="Aşağı"><ArrowDown size={14} /></button>
              <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="rounded p-1 text-red-600 hover:bg-white" aria-label="Sil"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        <Button type="button" size="sm" variant="ghost" onClick={() => onChange([...rows, Object.fromEntries((f.fields ?? []).map((sf) => [sf.key, ""]))])}><Plus size={14} /> Öğe ekle</Button>
      </div>
    );
  }
  return <input className={inputCls} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
}

export function PageEditor({ def, content }: { def: PageDef; content: Content }) {
  const [c, setC] = useState<Content>(content);
  const [dirty, setDirty] = useState(false);
  const { run, pending } = useRun();
  const confirm = useConfirm();
  const set = (s: string, k: string, v: unknown) => { setC((x) => ({ ...x, [s]: { ...(x[s] ?? {}), [k]: v } })); setDirty(true); };
  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link prefetch={false} href="/admin/sayfalar" className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal/55"><ArrowLeft size={13} /> Sayfalar</Link>
          <h1 className="mt-1 font-display text-[2rem] leading-none text-forest">{def.title}</h1>
        </div>
        <a href={def.slug} target="_blank" className="inline-flex h-11 items-center gap-2 rounded-xl border border-charcoal/12 bg-white px-4 text-sm font-semibold"><ExternalLink size={15} /> Sayfayı aç</a>
      </div>
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block" aria-label="Bölümler">
          <ul className="sticky top-24 space-y-0.5">
            {def.sections.map((s) => (
              <li key={s.key}><a href={`#s-${s.key}`} className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px] text-charcoal/70 hover:bg-white">{s.label}{c[s.key]?.visible === false && <EyeOff size={12} />}</a></li>
            ))}
          </ul>
        </nav>
        <div className="space-y-4">
          {def.sections.map((s) => (
            <div id={`s-${s.key}`} key={s.key} className="scroll-mt-24">
              <Card
                title={s.label}
                actions={
                  <>
                    <Toggle checked={c[s.key]?.visible !== false} onChange={(v) => set(s.key, "visible", v)} label={c[s.key]?.visible !== false ? "Görünür" : "Gizli"} />
                    <button onClick={async () => { if (await confirm({ title: `"${s.label}" varsayılana döndürülsün mü?`, text: "Bu bölümde yaptığınız değişiklikler silinir." })) { await run(resetPageSection(def.key, s.key), "Varsayılana döndü"); location.reload(); } }} className="rounded-lg p-1.5 text-charcoal/50 hover:bg-cream" title="Varsayılana döndür" aria-label="Varsayılana döndür"><RotateCcw size={14} /></button>
                  </>
                }
              >
                {s.description && <p className="mb-4 rounded-lg bg-cream/70 px-3 py-2 text-xs text-charcoal/60">{s.description}</p>}
                <div className={c[s.key]?.visible === false ? "opacity-50" : ""}>
                  <div className="grid gap-4 md:grid-cols-2">
                    {s.fields.map((f) => (
                      <F key={f.key} label={f.label} hint={f.help} className={["textarea", "list", "image", "video"].includes(f.type) ? "md:col-span-2" : ""}>
                        <FieldInput f={f} value={c[s.key]?.[f.key]} onChange={(v) => set(s.key, f.key, v)} />
                      </F>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-charcoal/8 bg-white/90 backdrop-blur lg:pl-[252px]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-3 px-6 py-3">
          {dirty && <span className="flex items-center gap-1.5 text-sm text-amber-700"><Eye size={14} /> Kaydedilmemiş değişiklikler</span>}
          <Button loading={pending} disabled={!dirty} onClick={async () => { const r = await run(savePageContent(def.key, c), "Sayfa yayınlandı"); if (r.ok) setDirty(false); }}>Kaydet ve yayınla</Button>
        </div>
      </div>
    </div>
  );
}
