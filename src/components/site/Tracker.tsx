"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function sessionId(): string {
  try {
    let s = sessionStorage.getItem("sb_sid");
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("sb_sid", s);
    }
    return s;
  } catch {
    return "";
  }
}

export function sendEvent(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ sid: sessionId(), ...payload });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch {
    /* yok say */
  }
}

/** Çerezsiz sayfa görüntüleme takibi */
export function Tracker({ type = "pageview" }: { type?: "pageview" | "menu_view" }) {
  const pathname = usePathname();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    sendEvent({ type, path: pathname, ref: document.referrer || undefined, utm: params.get("utm_source") || undefined, qr: params.get("src") === "qr" });
  }, [pathname, type]);
  return null;
}
