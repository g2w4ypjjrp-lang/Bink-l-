import "server-only";
import { APP_URL } from "./seo";

/** QR kodun gösterdiği adres. Görsel (PNG/SVG/PDF) panelde, tarayıcıda üretilir: src/components/admin/QrImage.tsx */
export const qrUrl = (code: string) => `${APP_URL}/q/${code}`;
