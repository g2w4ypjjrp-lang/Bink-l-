import { apiUser } from "@/lib/auth";
import { json, withErrors } from "@/lib/api";
import { isSameOrigin, rateLimit } from "@/lib/security";
import { storeUpload } from "@/lib/storage";
import { audit } from "@/lib/audit";

export const POST = withErrors("api.admin.upload", async (req: Request) => {
  if (!isSameOrigin(req)) return json({ error: "Geçersiz istek kaynağı." }, 403);
  const user = await apiUser(["menu.manage", "gallery.manage", "campaigns.manage", "pages.manage", "seo.manage", "settings.manage", "reviews.manage", "events.manage"]);
  if (!user) return json({ error: "Yetkisiz." }, 401);
  if (!rateLimit(`upload:${user.id}`, 60, 60_000).ok) return json({ error: "Çok fazla yükleme. Biraz bekleyin." }, 429);
  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return json({ error: "Dosya bulunamadı." }, 400);
  try {
    const stored = await storeUpload(file);
    await audit(user.id, "upload", "file", null, stored.url, { name: file.name, bytes: stored.bytes });
    return json(stored);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
