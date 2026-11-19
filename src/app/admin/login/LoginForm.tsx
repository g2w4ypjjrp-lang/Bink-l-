"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-charcoal/70">E-posta</span>
        <input name="email" type="email" autoComplete="username" required className="h-12 w-full rounded-xl border border-charcoal/15 bg-white px-4 outline-none focus:border-forest focus:ring-4 focus:ring-forest/10" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-charcoal/70">Şifre</span>
        <span className="relative block">
          <input name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="h-12 w-full rounded-xl border border-charcoal/15 bg-white px-4 pr-12 outline-none focus:border-forest focus:ring-4 focus:ring-forest/10" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-charcoal/50" aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>
      {state?.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest font-semibold text-cream transition hover:bg-deep disabled:opacity-60">
        {pending && <Loader2 size={16} className="animate-spin" />} Giriş yap
      </button>
    </form>
  );
}
