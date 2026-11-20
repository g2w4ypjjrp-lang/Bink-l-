"use client";
import { fmtD } from "@/lib/format";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, UtensilsCrossed, QrCode, ClipboardList, CalendarDays, PartyPopper, Images, Megaphone, Star, MessageSquare, BarChart3, FileText, Globe, Users,
  Settings, ShieldCheck, Bell, PanelLeftClose, PanelLeftOpen, Menu as MenuIcon, X, LogOut, ExternalLink, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeafMark } from "@/components/site/Logo";
import { logoutAction } from "@/app/admin/login/actions";

export type NavItem = { href: string; label: string; icon: string; badge?: number };
const ICONS = { LayoutDashboard, UtensilsCrossed, QrCode, ClipboardList, CalendarDays, PartyPopper, Images, Megaphone, Star, MessageSquare, BarChart3, FileText, Globe, Users, Settings, ShieldCheck, Bell };

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string };

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch {}
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "az önce";
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  return fmtD(iso);
}

function Bellmenu() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ items: Notif[]; unread: number }>({ items: [], unread: 0 });
  const last = useRef<string | null>(null);
  const router = useRouter();
  const load = useCallback(async () => {
    if (document.hidden) return; // arka plandaki sekme sunucuyu yormasın
    const r = await fetch("/api/admin/notifications", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const d = (await r.json()) as { items: Notif[]; unread: number };
    const newest = d.items[0]?.id ?? null;
    if (last.current && newest && newest !== last.current && !d.items[0].read) {
      beep();
      router.refresh();
    }
    last.current = newest;
    setData(d);
  }, [router]);
  useEffect(() => {
    load();
    const i = setInterval(load, 20000);
    const vis = () => !document.hidden && load();
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [load]);
  async function mark(body: object) {
    await fetch("/api/admin/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-cream" aria-label={`Bildirimler (${data.unread} okunmamış)`}>
        <Bell size={19} />
        {data.unread > 0 && <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{data.unread > 99 ? "99+" : data.unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-charcoal/8 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-charcoal/6 px-4 py-3">
              <p className="text-sm font-semibold">Bildirimler</p>
              {data.unread > 0 && (
                <button onClick={() => mark({ all: true })} className="text-xs font-semibold text-forest">
                  Tümünü okundu yap
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {data.items.length === 0 && <li className="px-4 py-10 text-center text-sm text-charcoal/50">Bildirim yok</li>}
              {data.items.map((n) => (
                <li key={n.id}>
                  <Link prefetch={false}
                    href={n.link || "/admin/bildirimler"}
                    onClick={() => {
                      setOpen(false);
                      if (!n.read) mark({ ids: [n.id] });
                    }}
                    className={cn("flex gap-3 border-b border-charcoal/5 px-4 py-3 hover:bg-cream/60", !n.read && "bg-gold/8")}
                  >
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-gold")} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{n.title}</span>
                      {n.body && <span className="block truncate text-xs text-charcoal/55">{n.body}</span>}
                      <span className="block text-[11px] text-charcoal/40">{timeAgo(n.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link prefetch={false} href="/admin/bildirimler" onClick={() => setOpen(false)} className="block border-t border-charcoal/6 py-2.5 text-center text-xs font-semibold text-forest">
              Bildirim merkezi
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function Shell({ nav, user, children }: { nav: { group: string; items: NavItem[] }[]; user: { name: string; email: string; roleName: string }; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sb_admin_collapsed") === "1");
    } catch {}
  }, []);
  useEffect(() => setMobile(false), [pathname]);
  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("sb_admin_collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });
  };
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (mini: boolean) => (
    <nav aria-label="Yönetim menüsü" className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center gap-2.5 px-4", mini && "justify-center px-0")}>
        <LeafMark className="h-8 w-8 shrink-0 text-gold" />
        {!mini && (
          <span className="leading-none text-cream">
            <span className="block font-display text-xl">Saklı Bahçe</span>
            <span className="block text-[10px] uppercase tracking-[0.25em] text-cream/50">Yönetim</span>
          </span>
        )}
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        {nav.map((g) => (
          <div key={g.group} className="mt-4">
            {!mini && <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cream/35">{g.group}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = ICONS[it.icon as keyof typeof ICONS] ?? LayoutDashboard;
                const active = isActive(it.href);
                return (
                  <li key={it.href}>
                    <Link prefetch={false}
                      href={it.href}
                      title={mini ? it.label : undefined}
                      className={cn("group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition", active ? "bg-cream/12 text-cream" : "text-cream/65 hover:bg-cream/6 hover:text-cream", mini && "justify-center px-0")}
                    >
                      {active && <span className="absolute left-0 top-2 h-6 w-[3px] rounded-r bg-gold" />}
                      <Icon size={18} className={active ? "text-gold" : ""} />
                      {!mini && <span className="flex-1 truncate">{it.label}</span>}
                      {!!it.badge && <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-deep", mini && "absolute right-1 top-0.5 h-4 min-w-4 text-[9px]")}>{it.badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className={cn("border-t border-cream/10 p-3", mini && "px-2")}>
        <button onClick={toggle} className={cn("hidden h-9 w-full items-center gap-2 rounded-lg px-3 text-xs text-cream/55 hover:bg-cream/6 hover:text-cream lg:flex", mini && "justify-center px-0")} aria-label={mini ? "Menüyü genişlet" : "Menüyü daralt"}>
          {mini ? <PanelLeftOpen size={17} /> : <><PanelLeftClose size={17} /> Daralt</>}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden bg-deep transition-[width] duration-300 lg:block", collapsed ? "w-[76px]" : "w-[252px]")}>{sidebar(collapsed)}</aside>
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-deep/50" onClick={() => setMobile(false)} />
          <aside className="absolute inset-y-0 left-0 w-[272px] bg-deep shadow-2xl animate-fade-up">
            <button onClick={() => setMobile(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-cream/70" aria-label="Kapat">
              <X size={20} />
            </button>
            {sidebar(false)}
          </aside>
        </div>
      )}
      <div className={cn("flex min-w-0 flex-1 flex-col transition-[padding] duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-[252px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-charcoal/6 bg-white/85 px-3 backdrop-blur-xl sm:px-6">
          <button onClick={() => setMobile(true)} className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-cream lg:hidden" aria-label="Menüyü aç">
            <MenuIcon size={20} />
          </button>
          <div className="flex-1" />
          <a href="/" target="_blank" className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-charcoal/70 hover:bg-cream sm:flex">
            <ExternalLink size={15} /> Siteyi gör
          </a>
          <a href="/menu" target="_blank" className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium text-charcoal/70 hover:bg-cream sm:flex">
            <QrCode size={15} /> Menü
          </a>
          <Bellmenu />
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="flex h-10 items-center gap-2 rounded-xl px-2 hover:bg-cream" aria-haspopup="menu" aria-expanded={menuOpen}>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-xs font-bold text-cream">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-[13px] font-semibold">{user.name}</span>
                <span className="block text-[11px] text-charcoal/50">{user.roleName}</span>
              </span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-xl border border-charcoal/8 bg-white py-1 shadow-xl">
                  <p className="truncate px-4 py-2 text-xs text-charcoal/50">{user.email}</p>
                  <Link prefetch={false} href="/admin/profil" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-cream">
                    <UserCircle size={16} /> Profil & şifre
                  </Link>
                  <form action={logoutAction}>
                    <button className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50">
                      <LogOut size={16} /> Çıkış yap
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
