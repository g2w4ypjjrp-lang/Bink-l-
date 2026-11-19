import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { dateFromISO, todayISO, addDaysISO, waLink, normalizePhone } from "@/lib/utils";
import { customerMessage } from "@/lib/messages";
import { ReservationsAdmin } from "./ReservationsAdmin";

export const metadata = { title: "Rezervasyonlar" };

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ id?: string; view?: string; status?: string }> }) {
  const user = await requirePagePermission(["reservations.view", "reservations.manage"]);
  const sp = await searchParams;
  const [rows, s] = await Promise.all([
    db.reservation.findMany({
      where: { OR: [{ date: { gte: dateFromISO(addDaysISO(todayISO(), -180)) } }, { status: "pending" }] },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      include: { notes: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } } },
      take: 5000,
    }),
    getSettings(),
  ]);
  const data = await Promise.all(
    rows.map(async (r) => ({
      id: r.id, code: r.code, name: r.name, phone: r.phone, email: r.email ?? "", guests: r.guests, children: r.children, date: r.date.toISOString().slice(0, 10), time: r.time,
      seating: r.seating ?? "", occasion: r.occasion ?? "", specialRequest: r.specialRequest ?? "", description: r.description ?? "", status: r.status, source: r.source, createdAt: r.createdAt.toISOString(),
      notes: r.notes.map((n) => ({ id: n.id, body: n.body, user: n.user?.name ?? "Sistem", at: n.createdAt.toISOString() })),
      wa: { confirmed: waLink(r.phone, (await customerMessage(r, "confirmed")) ?? ""), rejected: waLink(r.phone, (await customerMessage(r, "rejected")) ?? "") },
      tel: `+${normalizePhone(r.phone)}`,
    }))
  );
  return <ReservationsAdmin rows={data} canManage={hasPermission(user.permissions, "reservations.manage")} seating={s.reservation.seatingOptions} today={todayISO()} openId={sp.id} initialView={sp.view === "day" ? "day" : "list"} initialStatus={sp.status} />;
}
