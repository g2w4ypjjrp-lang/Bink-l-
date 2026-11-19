"use client";
import { useState } from "react";
import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, F, inputCls, textareaCls, Toggle, ImageInput, Card, PageHeader, Badge, useRun } from "@/components/admin/ui";
import { saveSeo } from "../sayfalar/actions";

type P = { key: string; title: string; slug: string; seoTitle: string; seoDescription: string; seoKeywords: string; ogImage: string; canonical: string; noindex: boolean };

function score(p: P) {
  const issues: string[] = [];
  if (!p.seoTitle) issues.push("SEO başlığı yok");
  else if (p.seoTitle.length < 30 || p.seoTitle.length > 65) issues.push("Başlık 30–65 karakter olmalı");
  if (!p.seoDescription) issues.push("Meta açıklama yok");
  else if (p.seoDescription.length < 70 || p.seoDescription.length > 160) issues.push("Açıklama 70–160 karakter olmalı");
  if (p.noindex) issues.push("Arama motorlarından gizli (noindex)");
  return issues;
}

export function SeoAdmin({ pages, appUrl, checks }: { pages: P[]; appUrl: string; checks: { productsNoSeo: number; imgsNoAlt: number } }) {
  const [sel, setSel] = useState(pages[0].key);
  const [all, setAll] = useState(pages);
  const p = all.find((x) => x.key === sel)!;
  const { run, pending } = useRun();
  const set = (k: keyof P, v: unknown) => setAll((a) => a.map((x) => (x.key === sel ? { ...x, [k]: v } : x)));
  const url = `${appUrl}${p.canonical || p.slug}`.replace(/\/$/, "") || appUrl;
  return (
    <div>
      <PageHeader title="SEO Yönetimi" description="Her sayfa için başlık, açıklama, sosyal medya görseli, canonical ve indeksleme ayarları." actions={<><a href="/sitemap.xml" target="_blank" className="inline-flex h-11 items-center gap-2 rounded-xl border border-charcoal/12 bg-white px-4 text-sm font-semibold">sitemap.xml <ExternalLink size={14} /></a><a href="/robots.txt" target="_blank" className="inline-flex h-11 items-center gap-2 rounded-xl border border-charcoal/12 bg-white px-4 text-sm font-semibold">robots.txt <ExternalLink size={14} /></a></>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-charcoal/8 bg-white p-4 text-sm"><p className="text-charcoal/55">Yapısal veri</p><p className="mt-1 font-semibold">Restaurant · LocalBusiness · Menu · FAQ · Breadcrumb</p></div>
        <div className="rounded-2xl border border-charcoal/8 bg-white p-4 text-sm"><p className="text-charcoal/55">SEO başlığı olmayan aktif ürün</p><p className="mt-1 font-semibold">{checks.productsNoSeo} <span className="text-xs font-normal text-charcoal/50">(ürün adı kullanılır)</span></p></div>
        <div className="rounded-2xl border border-charcoal/8 bg-white p-4 text-sm"><p className="text-charcoal/55">Alt metni olmayan galeri görseli</p><p className={cn("mt-1 font-semibold", checks.imgsNoAlt && "text-amber-700")}>{checks.imgsNoAlt}</p></div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <ul className="space-y-1">
          {all.map((x) => {
            const iss = score(x);
            return (
              <li key={x.key}>
                <button onClick={() => setSel(x.key)} className={cn("flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm", sel === x.key ? "bg-white shadow-sm" : "hover:bg-white/60")}>
                  <span><span className="block font-semibold">{x.title}</span><span className="text-xs text-charcoal/50">{x.slug}</span></span>
                  {iss.length ? <AlertTriangle size={15} className="text-amber-600" /> : <CheckCircle2 size={15} className="text-emerald-600" />}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="space-y-4">
          <Card title={`${p.title} — SEO`}>
            <div className="grid gap-4">
              <F label={`SEO başlığı (${p.seoTitle.length}/65)`} hint="Boş bırakılırsa varsayılan başlık kullanılır"><input className={inputCls} maxLength={70} value={p.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></F>
              <F label={`Meta açıklama (${p.seoDescription.length}/160)`}><textarea className={textareaCls} maxLength={170} value={p.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></F>
              <F label="Anahtar kelimeler" hint="Virgülle ayırın — ör. Çatalca restoran, Binkılıç kahvaltı"><input className={inputCls} value={p.seoKeywords} onChange={(e) => set("seoKeywords", e.target.value)} /></F>
              <div className="grid gap-4 sm:grid-cols-2">
                <F label="Slug (URL)" hint="Sayfa adresleri SEO dostu ve sabittir"><input className={inputCls} value={p.slug} disabled /></F>
                <F label="Canonical" hint="Boş = sayfanın kendi adresi"><input className={inputCls} value={p.canonical} onChange={(e) => set("canonical", e.target.value)} placeholder={p.slug} /></F>
              </div>
              <F label="OG / paylaşım görseli (1200×630 önerilir)"><ImageInput value={p.ogImage} onChange={(v) => set("ogImage", v)} /></F>
              <Toggle checked={p.noindex} onChange={(v) => set("noindex", v)} label="Arama motorlarından gizle (noindex)" />
              {score(p).length > 0 && <div className="flex flex-wrap gap-1.5">{score(p).map((i) => <Badge key={i} tone="yellow">{i}</Badge>)}</div>}
              <div><Button loading={pending} onClick={() => run(saveSeo(p), "SEO kaydedildi")}>Kaydet</Button></div>
            </div>
          </Card>
          <Card title="Google önizlemesi">
            <div className="max-w-xl font-[arial,sans-serif]">
              <p className="truncate text-xs text-[#202124]">{url}</p>
              <p className="truncate text-xl text-[#1a0dab]">{p.seoTitle || `${p.title} | BinKılıç Saklı Bahçe`}</p>
              <p className="line-clamp-2 text-sm text-[#4d5156]">{p.seoDescription || "Meta açıklama girilmedi."}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
