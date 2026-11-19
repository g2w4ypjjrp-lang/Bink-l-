"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { computeOpenStatus, type OpenStatus, type SpecialDayLite } from "@/lib/hours";
import type { WeeklyHour } from "@/lib/settings-defaults";

/**
 * "Şu an açık / kapalı" bilgisi.
 * Sayfalar statik HTML olarak üretildiği için durum, ziyaretçinin tarayıcısında hesaplanır.
 * Hesap her zaman Europe/Istanbul saatine göre yapılır (telefonun saat diliminden bağımsız) ve dakikada bir yenilenir.
 */
export type HoursData = { weekly: WeeklyHour[]; specials: { date: string; type: string; title: string; closed: boolean; open: string | null; close: string | null }[] };

const Ctx = createContext<OpenStatus | null>(null);

export function StatusProvider({ hours, initial, children }: { hours: HoursData; initial: OpenStatus; children: React.ReactNode }) {
  const [status, setStatus] = useState<OpenStatus>(initial);
  useEffect(() => {
    const specials: SpecialDayLite[] = hours.specials.map((s) => ({ ...s, date: new Date(s.date) }));
    const tick = () => setStatus(computeOpenStatus(hours.weekly, specials));
    tick();
    const i = setInterval(tick, 60_000);
    return () => clearInterval(i);
  }, [hours]);
  return <Ctx.Provider value={status}>{children}</Ctx.Provider>;
}

export function useOpenStatus(fallback?: OpenStatus): OpenStatus {
  return useContext(Ctx) ?? fallback ?? { open: false, label: "", detail: "" };
}

/** Durum noktası + metin; sınıflar çağıran yerden gelir. */
export function StatusDot({ className, openClass, closedClass }: { className?: string; openClass: string; closedClass: string }) {
  const s = useOpenStatus();
  return <span className={`${className ?? ""} ${s.open ? openClass : closedClass}`} />;
}
export function StatusLabel() {
  return <>{useOpenStatus().label}</>;
}
export function StatusDetail() {
  return <>{useOpenStatus().detail}</>;
}
