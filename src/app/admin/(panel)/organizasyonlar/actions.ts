"use server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/security";
import { sendMessage } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { slugify } from "@/lib/utils";

const STATUSES = ["new", "contacted", "quoted", "approved", "rejected", "completed"] as const;
const refresh = () => { revalidatePath("/admin/organizasyonlar"); revalidatePath("/organizasyon"); revalidatePath("/"); };

export async function setEventStatus(ids: string[], status: (typeof STATUSES)[number]) {
  return guarded("events.manage", async (u) => {
    z.enum(STATUSES).parse(status);
    await db.eventRequest.updateMany({ where: { id: { in: ids } }, data: { status } });
    await audit(u.id, "status", "event_request", ids.join(","), `Organizasyon durumu: ${status}`);
    refresh();
  });
}

export async function saveQuote(id: string, input: unknown) {
  return guarded("events.manage", async (u) => {
    const d = z.object({ amount: z.coerce.number().min(0).max(100_000_000).nullable(), details: z.string().max(4000), sendEmail: z.boolean() }).parse(input);
    const r = await db.eventRequest.update({ where: { id }, data: { quoteAmount: d.amount === null ? null : new Prisma.Decimal(d.amount), quoteDetails: sanitizeText(d.details, 4000) || null, status: "quoted" } });
    if (d.sendEmail && r.email) {
      const s = await getSettings();
      await sendMessage("email", r.email, `Sayın ${r.name},\n${r.eventType} organizasyonunuz için teklifimiz:\n\nTutar: ${d.amount?.toLocaleString("tr-TR")} ₺\n\n${d.details}\n\nSorularınız için ${s.business.phone}\n${s.business.name}`, { subject: `${r.eventType} teklifi — ${r.code}`, entity: "event_request", entityId: r.id });
    }
    await audit(u.id, "update", "event_request", id, `Teklif: ${d.amount ?? "-"}`);
    refresh();
  });
}

export async function addEventNote(id: string, body: string) {
  return guarded("events.manage", async (u) => {
    await db.eventRequestNote.create({ data: { requestId: id, userId: u.id, body: sanitizeText(z.string().min(1).max(2000).parse(body), 2000) } });
    refresh();
  });
}

export async function deleteEventRequests(ids: string[]) {
  return guarded("events.manage", async (u) => {
    await db.eventRequest.deleteMany({ where: { id: { in: ids } } });
    await audit(u.id, "delete", "event_request", ids.join(","));
    refresh();
  });
}

export async function saveEventType(input: unknown) {
  return guarded("events.manage", async (u) => {
    const d = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(80), description: z.string().max(500), image: z.string().max(300), active: z.boolean() }).parse(input);
    const data = { name: sanitizeText(d.name, 80), description: sanitizeText(d.description, 500) || null, image: d.image || null, active: d.active };
    const e = d.id ? await db.event.update({ where: { id: d.id }, data }) : await db.event.create({ data: { ...data, key: slugify(d.name) || `tur-${Date.now()}`, sortOrder: await db.event.count() } });
    await audit(u.id, d.id ? "update" : "create", "event", e.id, e.name);
    refresh();
  });
}

export async function moveEventType(id: string, dir: -1 | 1) {
  return guarded("events.manage", async () => {
    const list = await db.event.findMany({ orderBy: { sortOrder: "asc" } });
    const i = list.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await db.$transaction(list.map((x, k) => db.event.update({ where: { id: x.id }, data: { sortOrder: k } })));
    refresh();
  });
}

export async function deleteEventType(id: string) {
  return guarded("events.manage", async (u) => {
    await db.event.delete({ where: { id } });
    await audit(u.id, "delete", "event", id);
    refresh();
  });
}
