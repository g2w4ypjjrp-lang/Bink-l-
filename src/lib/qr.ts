import "server-only";
import QRCode from "qrcode";
import { APP_URL } from "./seo";

export const qrUrl = (code: string) => `${APP_URL}/q/${code}`;
const QR_OPTS = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#10291D", light: "#FFFFFF" } };

export async function qrPng(code: string, width = 1024) {
  return QRCode.toBuffer(qrUrl(code), { ...QR_OPTS, width, type: "png" });
}
export async function qrSvg(code: string) {
  return QRCode.toString(qrUrl(code), { ...QR_OPTS, type: "svg" });
}
