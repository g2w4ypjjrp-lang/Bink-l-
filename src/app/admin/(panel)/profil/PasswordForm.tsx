"use client";
import { useState } from "react";
import { Button, F, inputCls, useRun } from "@/components/admin/ui";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const { run, pending } = useRun();
  return (
    <form className="grid max-w-md gap-3" onSubmit={async (e) => { e.preventDefault(); if (f.next !== f.again) return alert("Yeni şifreler eşleşmiyor"); const r = await run(changePassword(f), "Şifre değiştirildi"); if (r.ok) setF({ current: "", next: "", again: "" }); }}>
      <F label="Mevcut şifre"><input type="password" autoComplete="current-password" className={inputCls} value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></F>
      <F label="Yeni şifre" hint="En az 10 karakter, büyük/küçük harf ve rakam"><input type="password" autoComplete="new-password" className={inputCls} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></F>
      <F label="Yeni şifre (tekrar)"><input type="password" autoComplete="new-password" className={inputCls} value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></F>
      <div><Button loading={pending}>Şifreyi güncelle</Button></div>
    </form>
  );
}
