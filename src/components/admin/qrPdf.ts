"use client";
/** Markalı, Türkçe karakterli QR masa kartlarını tarayıcıda PDF olarak üretir (A4'e 2x2). */
function loadScript(src: string) {
  return new Promise<void>((ok, err) => {
    if (document.querySelector(`script[src="${src}"]`)) return ok();
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => ok();
    el.onerror = () => err(new Error(src));
    document.head.appendChild(el);
  });
}

type Item = { id: string; title: string; subtitle?: string };

export async function downloadQrPdf(items: Item[], fileName = "qr-kodlar.pdf") {
  // Kütüphaneler statik dosyadan yüklenir (sunucu paketine girmez)
  await Promise.all([loadScript("/vendor/pdf-lib.min.js"), loadScript("/vendor/fontkit.umd.min.js")]);
  const w = window as unknown as { PDFLib: typeof import("pdf-lib"); fontkit: Parameters<import("pdf-lib").PDFDocument["registerFontkit"]>[0] };
  const { PDFDocument, rgb } = w.PDFLib;
  const fontkit = w.fontkit;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const load = (n: string) => fetch(`/fonts/${n}`).then((r) => r.arrayBuffer());
  const [serif, sansB, sans] = await Promise.all([
    load("CormorantGaramond_500Medium.ttf").then((b) => pdf.embedFont(b, { subset: false })),
    load("Manrope_600SemiBold.ttf").then((b) => pdf.embedFont(b, { subset: false })),
    load("Manrope_400Regular.ttf").then((b) => pdf.embedFont(b, { subset: false })),
  ]);
  pdf.setTitle("BinKılıç Saklı Bahçe — QR Kodlar");
  const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
  const A4 = { w: 595.28, h: 841.89 };
  const cardW = A4.w / 2, cardH = A4.h / 2;
  type F = typeof serif;
  const center = (f: F, t: string, size: number, x: number) => x + (cardW - f.widthOfTextAtSize(t, size)) / 2;

  for (let i = 0; i < items.length; i += 4) {
    const page = pdf.addPage([A4.w, A4.h]);
    for (let k = 0; k < 4 && i + k < items.length; k++) {
      const it = items[i + k];
      const x = (k % 2) * cardW;
      const y = A4.h - (Math.floor(k / 2) + 1) * cardH;
      const m = 14;
      page.drawRectangle({ x: x + m, y: y + m, width: cardW - 2 * m, height: cardH - 2 * m, color: hex("#F6F1E7"), borderColor: hex("#DCCDB8"), borderWidth: 0.8 });
      page.drawRectangle({ x: x + m, y: y + cardH - m - 70, width: cardW - 2 * m, height: 70, color: hex("#173D2B") });
      page.drawText("BinKılıç", { x: center(serif, "BinKılıç", 26, x), y: y + cardH - m - 38, size: 26, font: serif, color: hex("#F6F1E7") });
      page.drawText("SAKLI BAHÇE", { x: center(sansB, "SAKLI BAHÇE", 7.5, x) - 10, y: y + cardH - m - 56, size: 7.5, font: sansB, color: hex("#B89A62"), characterSpacing: 2.5 } as never);
      const png = await pdf.embedPng(await fetch(`/api/admin/qr/${it.id}?format=png&size=700`).then((r) => r.arrayBuffer()));
      const qs = 170;
      page.drawImage(png, { x: x + (cardW - qs) / 2, y: y + 92, width: qs, height: qs });
      page.drawText(it.title, { x: center(serif, it.title, 30, x), y: y + 290, size: 30, font: serif, color: hex("#173D2B") });
      const l1 = "Menü için okutun";
      const l2 = "Scan for menu · Menü scannen";
      page.drawText(l1, { x: center(sansB, l1, 10, x), y: y + 66, size: 10, font: sansB, color: hex("#242722") });
      page.drawText(l2, { x: center(sans, l2, 8, x), y: y + 52, size: 8, font: sans, color: hex("#84977D") });
      if (it.subtitle) page.drawText(it.subtitle, { x: center(sans, it.subtitle, 7, x), y: y + 32, size: 7, font: sans, color: hex("#84977D") });
    }
  }
  const bytes = await pdf.save();
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
