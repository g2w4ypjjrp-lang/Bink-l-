import "server-only";
import type { Transporter } from "nodemailer";
import { isWorkers } from "./runtime";
import { db } from "./db";
import { getSettings } from "./settings";

/** Panel içi bildirim (bildirim merkezi) */
export async function notifyAdmin(type: "reservation" | "order" | "event" | "message" | "system", title: string, body?: string, link?: string) {
  await db.notification.create({ data: { type, title, body, link } });
}

let transporter: Transporter | null | undefined;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  // Cloudflare Workers'ta SMTP (TCP) kullanılamaz; e-posta sağlayıcısı HTTP API ile eklenebilir
  if (isWorkers || !host) return (transporter = null);
  const nodemailer = (eval("require") as NodeRequire)("nodemailer") as typeof import("nodemailer");
  transporter = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;
  return transporter;
}

export type Channel = "email" | "sms" | "whatsapp";

/**
 * Dış kanal mesajı. E-posta SMTP ayarlıysa gerçekten gönderilir.
 * SMS / WhatsApp Business API sağlayıcıları (Netgsm, Twilio, Meta Cloud API vb.)
 * `providers` nesnesine eklenerek etkinleştirilir; eklenene kadar mesaj "skipped" olarak kaydedilir
 * ve panelde tek tıkla WhatsApp/SMS bağlantısı ile manuel gönderilebilir.
 */
const providers: Partial<Record<Channel, (to: string, body: string, subject?: string) => Promise<void>>> = {
  email: async (to, body, subject) => {
    const t = getTransporter();
    if (!t) throw new Error("SMTP yapılandırılmamış");
    const s = await getSettings();
    await t.sendMail({
      from: process.env.SMTP_FROM || `"${s.business.name}" <${s.business.email}>`,
      to,
      subject: subject || s.business.name,
      text: body,
      html: `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;padding:32px;background:#F6F1E7;color:#242722"><h2 style="color:#173D2B;font-weight:normal">${s.business.name}</h2>${body
        .split("\n")
        .map((l) => `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6">${l.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</p>`)
        .join("")}</div>`,
    });
  },
};

export async function sendMessage(channel: Channel, to: string | null | undefined, body: string, opts: { subject?: string; entity?: string; entityId?: string } = {}) {
  if (!to) return;
  const record = await db.outboundMessage.create({ data: { channel, to, body, subject: opts.subject, entity: opts.entity, entityId: opts.entityId } });
  const provider = providers[channel];
  if (!provider || (channel === "email" && !getTransporter())) {
    await db.outboundMessage.update({ where: { id: record.id }, data: { status: "skipped", error: "Sağlayıcı yapılandırılmamış" } });
    return;
  }
  try {
    await provider(to, body, opts.subject);
    await db.outboundMessage.update({ where: { id: record.id }, data: { status: "sent" } });
  } catch (e) {
    await db.outboundMessage.update({ where: { id: record.id }, data: { status: "failed", error: String(e).slice(0, 500) } });
  }
}

export const isEmailConfigured = () => !!process.env.SMTP_HOST;
