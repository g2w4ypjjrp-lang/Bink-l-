"use server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded, UserError } from "@/lib/actions";
import { audit } from "@/lib/audit";
import { sanitizeText } from "@/lib/security";

const newCode = (prefix: string) => `${prefix}-${randomBytes(4).toString("hex")}`;
const refresh = () => revalidatePath("/admin/qr");

export async function createTables(input: unknown) {
  return guarded("qr.manage", async (u) => {
    const d = z.object({ from: z.coerce.number().int().min(1).max(9999), to: z.coerce.number().int().min(1).max(9999), area: z.string().max(60).optional(), capacity: z.coerce.number().int().min(1).max(100).default(4) }).parse(input);
    if (d.to < d.from || d.to - d.from > 200) throw new UserError("Geçerli bir aralık girin (en fazla 200 masa).");
    const existing = new Set((await db.table.findMany({ where: { number: { gte: d.from, lte: d.to } }, select: { number: true } })).map((t) => t.number));
    let n = 0;
    for (let num = d.from; num <= d.to; num++) {
      if (existing.has(num)) continue;
      const t = await db.table.create({ data: { number: num, name: `Masa ${num}`, area: d.area ? sanitizeText(d.area, 60) : null, capacity: d.capacity } });
      await db.qrCode.create({ data: { code: newCode(`m${num}`), label: `Masa ${num}`, type: "table", tableId: t.id } });
      n++;
    }
    await audit(u.id, "create", "table", null, `${n} masa oluşturuldu (${d.from}-${d.to})`);
    refresh();
    return n;
  });
}

export async function saveTable(input: unknown) {
  return guarded("qr.manage", async (u) => {
    const d = z.object({ id: z.string(), number: z.coerce.number().int().min(1).max(9999), name: z.string().max(60), area: z.string().max(60), capacity: z.coerce.number().int().min(1).max(100), active: z.boolean() }).parse(input);
    const t = await db.table.update({ where: { id: d.id }, data: { number: d.number, name: sanitizeText(d.name, 60) || `Masa ${d.number}`, area: sanitizeText(d.area, 60) || null, capacity: d.capacity, active: d.active } });
    await db.qrCode.updateMany({ where: { tableId: t.id, type: "table" }, data: { label: t.name ?? `Masa ${t.number}`, active: d.active } });
    await audit(u.id, "update", "table", t.id, t.name ?? "");
    refresh();
  });
}

export async function deleteTables(ids: string[]) {
  return guarded("qr.manage", async (u) => {
    const r = await db.table.deleteMany({ where: { id: { in: ids } } });
    await audit(u.id, "delete", "table", ids.join(","), `${r.count} masa silindi`);
    refresh();
  });
}

/** Masa sipariş anahtarını yeniler — eski QR baskıları sipariş veremez hale gelir (QR kodun kendisi değişmez) */
export async function rotateTableToken(id: string) {
  return guarded("qr.manage", async (u) => {
    await db.table.update({ where: { id }, data: { orderToken: randomBytes(12).toString("hex") } });
    await audit(u.id, "update", "table", id, "Masa sipariş anahtarı yenilendi");
    refresh();
  });
}

export async function saveQr(input: unknown) {
  return guarded("qr.manage", async (u) => {
    const d = z.object({ id: z.string().optional(), label: z.string().trim().min(1).max(80), type: z.enum(["general", "custom", "table"]), targetPath: z.string().trim().regex(/^\/[a-z0-9\-/?=&#._%]*$/i, "Hedef '/' ile başlayan site içi bir yol olmalı").max(200), active: z.boolean(), tableId: z.string().optional().nullable() }).parse(input);
    const data = { label: sanitizeText(d.label, 80), type: d.type, targetPath: d.targetPath, active: d.active, tableId: d.type === "table" ? d.tableId || null : null };
    const qr = d.id ? await db.qrCode.update({ where: { id: d.id }, data }) : await db.qrCode.create({ data: { ...data, code: newCode(d.type === "general" ? "menu" : "qr") } });
    await audit(u.id, d.id ? "update" : "create", "qr_code", qr.id, qr.label);
    refresh();
  });
}

export async function toggleQr(ids: string[], active: boolean) {
  return guarded("qr.manage", async (u) => {
    await db.qrCode.updateMany({ where: { id: { in: ids } }, data: { active } });
    await audit(u.id, "update", "qr_code", ids.join(","), active ? "QR aktif" : "QR pasif");
    refresh();
  });
}

export async function deleteQrs(ids: string[]) {
  return guarded("qr.manage", async (u) => {
    await db.qrCode.deleteMany({ where: { id: { in: ids } } });
    await audit(u.id, "delete", "qr_code", ids.join(","));
    refresh();
  });
}
