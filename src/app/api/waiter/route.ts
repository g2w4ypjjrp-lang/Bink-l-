import { z } from "zod";
import { db } from "@/lib/db";
import { guardPublic, json, readJson, withErrors } from "@/lib/api";
import { notifyAdmin } from "@/lib/notify";
import { getSettings } from "@/lib/settings";

const schema = z.object({ table: z.coerce.number().int().min(1), token: z.string().min(10).max(60), reason: z.literal("bill").default("bill") });

/** Masadan hesap isteme — panel bildirim merkezine düşer (garson çağırma özelliği kaldırıldı) */
export const POST = withErrors("api.waiter", async (req: Request) => {
  const blocked = await guardPublic(req, "waiter", 3, 5 * 60_000);
  if (blocked) return blocked;
  // Hesap isteme, QR sipariş sistemiyle birlikte açılıp kapanır
  if (!(await getSettings()).menu.orderingEnabled) return json({ error: "Bu özellik şu an kapalı. Lütfen ekibimize doğrudan seslenin." }, 400);
  const p = schema.safeParse(await readJson(req));
  if (!p.success) return json({ error: "Geçersiz istek." }, 422);
  const table = await db.table.findUnique({ where: { number: p.data.table } });
  if (!table || !table.active || table.orderToken !== p.data.token) return json({ error: "Masa doğrulanamadı." }, 403);
  await notifyAdmin("order", `Masa ${table.number} hesap istiyor`, table.area ?? undefined, "/admin/siparisler");
  return json({ ok: true });
});
