import type { Metadata, Viewport } from "next";

export const viewport: Viewport = { themeColor: "#10291D", width: "device-width", initialScale: 1, viewportFit: "cover" };
export const metadata: Metadata = { robots: { index: true, follow: true } };

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-cream">{children}</div>;
}
