import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Yönetim Paneli", template: "%s · Saklı Bahçe Yönetim" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f4f2ec] text-charcoal">{children}</div>;
}
