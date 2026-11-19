"use client";
import { fmtDT } from "@/lib/format";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ClipboardList, PartyPopper, MessageSquare, Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, PageHeader, Tabs } from "@/components/admin/ui";

type N = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string };
const ICON: Record<string, typeof Bell> = { reservation: CalendarDays, order: ClipboardList, event: PartyPopper, message: MessageSquare, system: Bell };
const LABEL: Record<string, string> = { all: "Tümü", reservation: "Rezervasyon", order: "Sipariş", event: "Organizasyon", message: "Mesaj" };

export function NotificationCenter() {
  const [items, setItems] = useState<N[]>([]);
  const [type, setType] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/notifications?all=1", { cache: "no-store" });
    if (r.ok) setItems((await r.json()).items);
  }, []);
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);
  const mark = async (body: object) => { await fetch("/api/admin/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); load(); };
  const list = items.filter((n) => (type === "all" || n.type === type) && (!unreadOnly || !n.read));
  return (
    <div className="max-w-4xl">
      <PageHeader title="Bildirim Merkezi" description="Yeni rezervasyon, sipariş, organizasyon başvurusu ve mesaj bildirimleri (15 sn'de bir yenilenir)." actions={<Button variant="ghost" onClick={() => mark({ all: true })}><CheckCheck size={15} /> Tümünü okundu yap</Button>} />
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={type} onChange={setType} tabs={Object.entries(LABEL).map(([key, label]) => ({ key, label }))} />
        <label className="mb-5 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-forest" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} /> Yalnızca okunmamış</label>
      </div>
      <ul className="overflow-hidden rounded-2xl border border-charcoal/8 bg-white">
        {list.length === 0 && <li className="py-16 text-center text-sm text-charcoal/50">Bildirim yok.</li>}
        {list.map((n) => {
          const I = ICON[n.type] ?? Bell;
          return (
            <li key={n.id} className={cn("flex items-start gap-3 border-b border-charcoal/5 px-4 py-3.5 last:border-0", !n.read && "bg-gold/8")}>
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest/8 text-forest"><I size={16} /></span>
              <Link href={n.link || "#"} onClick={() => !n.read && mark({ ids: [n.id] })} className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="text-sm text-charcoal/60">{n.body}</p>}
                <p className="mt-0.5 text-xs text-charcoal/45">{fmtDT(n.createdAt)}</p>
              </Link>
              {!n.read && <button onClick={() => mark({ ids: [n.id] })} className="text-xs font-semibold text-forest">Okundu</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
