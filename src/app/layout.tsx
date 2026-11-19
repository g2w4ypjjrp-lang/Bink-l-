import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

// Yalnızca "latin" alt kümesi önceden yüklenir; Türkçe karakterler (ğ, ş, ı) latin-ext dosyasından unicode-range ile otomatik gelir.
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap", adjustFontFallback: true });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: "BinKılıç Saklı Bahçe", template: "%s | BinKılıç Saklı Bahçe" },
  applicationName: "BinKılıç Saklı Bahçe",
  formatDetection: { telephone: true, address: true },
  icons: { icon: "/brand/icon.svg", apple: "/brand/apple-touch-icon.png" },
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
      </head>
      <body>{children}</body>
    </html>
  );
}
