import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Card } from "@/components/admin/ui";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Profil" };

export default async function Profile() {
  const u = await requireUser();
  const logins = await db.loginLog.findMany({ where: { email: u.email }, orderBy: { createdAt: "desc" }, take: 10 });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Profil" description={`${u.name} · ${u.email} · ${u.roleName}`} />
      <div className="grid gap-4">
        <Card title="Şifre değiştir"><PasswordForm /></Card>
        <Card title="Son giriş denemeleriniz" pad={false}>
          <ul className="divide-y divide-charcoal/6 text-sm">
            {logins.map((l) => <li key={l.id} className="flex justify-between px-5 py-2.5"><span>{l.createdAt.toLocaleString("tr-TR")} · {l.ip}</span><span className={l.success ? "text-emerald-700" : "text-red-700"}>{l.success ? "Başarılı" : "Başarısız"}</span></li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
