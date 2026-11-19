import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { LeafMark } from "@/components/site/Logo";

export const metadata = { title: "Giriş" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-deep lg:block">
        <Image src="/uploads/venue/yol.webp" alt="" fill priority sizes="50vw" className="object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/30 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-cream">
          <LeafMark className="h-12 w-12 text-gold" />
          <p className="mt-6 font-display text-5xl leading-tight">BinKılıç Saklı Bahçe</p>
          <p className="mt-3 text-cream/70">Yönetim Paneli — menü, rezervasyon, sipariş ve organizasyonları tek yerden yönetin.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <LeafMark className="h-10 w-10 text-gold lg:hidden" />
          <h1 className="mt-4 font-display text-4xl text-forest">Panele giriş</h1>
          <p className="mt-2 text-sm text-charcoal/60">Hesap bilgilerinizle giriş yapın.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
