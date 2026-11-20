import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

// Yalnızca "latin" alt kümesi önceden yüklenir; Türkçe karakterler (ğ, ş, ı) latin-ext dosyasından unicode-range ile otomatik gelir.
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap", adjustFontFallback: true });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const APP_URL = process.env.APP_URL || "http://localhost:3000";

const RELOAD_ON_CHUNK_ERROR = `(function(){var K="sb_chunk_reload";function go(){try{var l=+sessionStorage.getItem(K)||0;if(Date.now()-l<30000)return;sessionStorage.setItem(K,String(Date.now()))}catch(e){}location.reload()}
addEventListener("error",function(e){var t=e.target;if(t&&t.tagName==="SCRIPT"&&(t.src||"").indexOf("/_next/")>-1)go();else if(/ChunkLoadError|Loading chunk/.test(String(e.message||"")))go()},true);
addEventListener("unhandledrejection",function(e){var r=e.reason;if(/ChunkLoadError|Loading chunk/.test(String(r&&(r.name+" "+r.message))))go()})})()`;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "BinKılıç Saklı Bahçe", template: "%s | BinKılıç Saklı Bahçe" },
  applicationName: "BinKılıç Saklı Bahçe",
  formatDetection: { telephone: true, address: true },
  icons: { icon: [{ url: "/brand/icon-64.png", type: "image/png", sizes: "64x64" }, { url: "/brand/icon-512.png", type: "image/png", sizes: "512x512" }], apple: "/brand/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#173D2B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${cormorant.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {/* Yayından hemen sonra eski sayfa yeni olmayan bir betiği isterse: sayfayı bir kez kendiliğinden yenile */}
        <script dangerouslySetInnerHTML={{ __html: RELOAD_ON_CHUNK_ERROR }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
