/** Cloudflare Workers (workerd) üzerinde mi çalışıyoruz? */
export const isWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
