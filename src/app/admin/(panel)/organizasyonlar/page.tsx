import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { toNumber, waLink, normalizePhone } from "@/lib/utils";
import { EventsAdmin } from "./EventsAdmin";

export const metadata = { title: "Organizasyonlar" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requirePagePermission("events.manage");
  const [reqs, types, sp] = await Promise.all([
    db.eventRequest.findMany({ orderBy: { createdAt: "desc" }, include: { notes: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } } }, take: 3000 }),
    db.event.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { requests: true } } } }),
    searchParams,
  ]);
  return (
    <EventsAdmin
      openId={sp.id}
      requests={reqs.map((r) => ({
        id: r.id, code: r.code, eventType: r.eventType, name: r.name, phone: r.phone, email: r.email ?? "", date: r.date?.toISOString().slice(0, 10) ?? "", guests: r.guests, budget: r.budget ?? "",
        specialRequest: r.specialRequest ?? "", description: r.description ?? "", status: r.status, quoteAmount: r.quoteAmount ? toNumber(r.quoteAmount) : null, quoteDetails: r.quoteDetails ?? "", createdAt: r.createdAt.toISOString(),
        notes: r.notes.map((n) => ({ id: n.id, body: n.body, user: n.user?.name ?? "Sistem", at: n.createdAt.toISOString() })), tel: `+${normalizePhone(r.phone)}`, wa: waLink(r.phone, `Merhaba ${r.name}, BinKılıç Saklı Bahçe'den yazıyoruz. ${r.eventType} organizasyonu başvurunuz (${r.code}) hakkında görüşmek isteriz.`),
      }))}
      types={types.map((t) => ({ id: t.id, key: t.key, name: t.name, description: t.description ?? "", image: t.image ?? "", active: t.active, count: t._count.requests }))}
    />
  );
}
