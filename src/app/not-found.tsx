import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-forest px-6 text-center text-cream">
      <p className="eyebrow">404</p>
      <h1 className="h-display mt-6 text-6xl sm:text-7xl">Bu patika bir yere çıkmıyor</h1>
      <p className="mt-6 max-w-md text-cream/70">Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.</p>
      <div className="mt-10 flex gap-3">
        <Link href="/" className="btn-light">Ana sayfa</Link>
        <Link href="/menu" className="btn-ghost text-cream">Menü</Link>
      </div>
    </main>
  );
}
