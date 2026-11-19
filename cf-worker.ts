/**
 * Cloudflare Worker girişi.
 * 1) Herkese açık sayfalar ve görseller statik dosyadır: Cloudflare onları Worker'ı hiç çalıştırmadan verir.
 * 2) Ziyaretçinin tetiklediği dinamik uçlar (QR, formlar, sipariş, sayaç) src/worker/fast.ts'de hafifçe karşılanır.
 * 3) Geri kalan her şey (yönetim paneli) Next.js'e (OpenNext) gider.
 */
// derleme sırasında üretilir (tsconfig dışında tutulur)
import nextWorker from "./.open-next/worker.js";
import { fast, type FastEnv } from "./src/worker/fast";

// derleme sırasında üretilir (tsconfig dışında tutulur)
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";

export default {
  async fetch(request: Request, env: FastEnv, ctx: unknown) {
    const res = await fast(request, env);
    if (res) return res;
    return nextWorker.fetch(request, env, ctx);
  },
};
