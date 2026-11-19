"use server";
import { guarded, UserError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { markPublished } from "@/lib/publish";

/** Cloudflare Workers Builds Deploy Hook'unu tetikler: site birkaç dakika içinde yeniden derlenip yayınlanır. */
export async function publishSite() {
  return guarded(["menu.manage", "pages.manage", "gallery.manage", "campaigns.manage", "settings.manage"], async (u) => {
    const hook = process.env.DEPLOY_HOOK_URL;
    if (!hook) throw new UserError("Yayın bağlantısı (DEPLOY_HOOK_URL) tanımlı değil. Cloudflare ayarlarını kontrol edin.");
    const r = await fetch(hook, { method: "POST" });
    if (!r.ok) throw new UserError(`Yayın başlatılamadı (Cloudflare yanıtı: ${r.status}). Lütfen birkaç dakika sonra tekrar deneyin.`);
    await markPublished(u.email);
    await audit(u.id, "publish", "site", null, "Değişiklikler sitede yayınlandı");
    return { at: new Date().toISOString() };
  });
}
