import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { isEmailConfigured } from "@/lib/notify";
import { waLink, normalizePhone } from "@/lib/utils";
import { MessagesAdmin } from "./MessagesAdmin";

export const metadata = { title: "Mesajlar" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requirePagePermission("messages.manage");
  const [msgs, sp] = await Promise.all([db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 3000 }), searchParams]);
  return (
    <MessagesAdmin
      openId={sp.id}
      smtp={isEmailConfigured()}
      rows={msgs.map((m) => ({ id: m.id, name: m.name, phone: m.phone ?? "", email: m.email ?? "", subject: m.subject ?? "", message: m.message, status: m.status, archived: m.archived, createdAt: m.createdAt.toISOString(), wa: m.phone ? waLink(m.phone, `Merhaba ${m.name}, BinKılıç Saklı Bahçe'ye mesajınız için teşekkürler. `) : "", tel: m.phone ? `+${normalizePhone(m.phone)}` : "" }))}
    />
  );
}
