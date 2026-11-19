import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { PAGES } from "@/lib/page-schema";
import { PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Sayfalar" };

export default async function PagesList() {
  await requirePagePermission("pages.manage");
  const rows = await db.page.findMany();
  return (
    <div>
      <PageHeader title="Sayfa Yönetimi" description="Sitedeki tüm yazıları, görselleri ve bölümleri geliştirici desteğine gerek kalmadan düzenleyin." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PAGES.map((p) => {
          const r = rows.find((x) => x.key === p.key);
          return (
            <Link key={p.key} href={`/admin/sayfalar/${p.key}`} className="group rounded-2xl border border-charcoal/8 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <FileText className="text-gold-dark" size={22} />
              <h2 className="mt-4 font-sans text-base font-semibold tracking-normal">{p.title}</h2>
              <p className="mt-1 text-xs text-charcoal/50">{p.slug} · {p.sections.length} bölüm</p>
              <p className="mt-4 flex items-center justify-between text-xs text-charcoal/50">
                {r ? `Son güncelleme ${r.updatedAt.toLocaleDateString("tr-TR")}` : "Varsayılan içerik"}
                <ArrowRight size={15} className="text-forest transition group-hover:translate-x-1" />
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
