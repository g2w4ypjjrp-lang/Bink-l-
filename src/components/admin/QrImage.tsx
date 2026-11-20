"use client";
/**
 * QR kodlar tarayıcıda üretilir (sunucuya / Cloudflare Worker'a hiç yük bindirmez).
 * Renk ve hata düzeltme ayarları önceki sunucu sürümüyle aynıdır; basılı kodlar değişmez.
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";

const OPTS = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#10291D", light: "#FFFFFF" } };

export const qrDataUrl = (url: string, width = 320) => QRCode.toDataURL(url, { ...OPTS, width });
export const qrSvgText = (url: string) => QRCode.toString(url, { ...OPTS, type: "svg" });

function save(href: string, fileName: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** QR'ı PNG (1200 px) veya SVG olarak indirir. */
export async function downloadQr(url: string, baseName: string, format: "png" | "svg") {
  if (format === "png") return save(await qrDataUrl(url, 1200), `${baseName}.png`);
  const blob = new Blob([await qrSvgText(url)], { type: "image/svg+xml" });
  const href = URL.createObjectURL(blob);
  save(href, `${baseName}.svg`);
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

export function QrImage({ url, size = 320, className, alt = "" }: { url: string; size?: number; className?: string; alt?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    qrDataUrl(url, size).then((s) => alive && setSrc(s)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [url, size]);
  return src ? <img src={src} alt={alt} className={className} /> : <span className={`block animate-pulse bg-cream ${className ?? ""}`} aria-hidden />;
}
