import { db } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Tüm iş verilerinin JSON yedeği (oturumlar hariç). Tam veritabanı yedeği için scripts/backup.sh (pg_dump) kullanılır. */
export async function GET() {
  const user = await apiUser("system.manage");
  if (!user) return new Response("Yetkisiz", { status: 401 });
  const [settings, pages, specialDays, categories, categoryTranslations, products, productImages, productTranslations, allergens, productAllergens, tables, qrCodes, orders, orderItems, payments, reservations, reservationNotes, events, eventRequests, eventRequestNotes, galleryCategories, gallery, campaigns, reviews, contactMessages, roles, permissions, rolePermissions, users] = await Promise.all([
    db.setting.findMany(), db.page.findMany(), db.specialDay.findMany(), db.category.findMany(), db.categoryTranslation.findMany(), db.product.findMany(), db.productImage.findMany(), db.productTranslation.findMany(),
    db.allergen.findMany(), db.productAllergen.findMany(), db.table.findMany(), db.qrCode.findMany(), db.order.findMany(), db.orderItem.findMany(), db.payment.findMany(), db.reservation.findMany(), db.reservationNote.findMany(),
    db.event.findMany(), db.eventRequest.findMany(), db.eventRequestNote.findMany(), db.galleryCategory.findMany(), db.galleryItem.findMany(), db.campaign.findMany(), db.review.findMany(), db.contactMessage.findMany(),
    db.role.findMany(), db.permission.findMany(), db.rolePermission.findMany(), db.user.findMany({ select: { id: true, email: true, name: true, roleId: true, active: true, createdAt: true } }),
  ]);
  const body = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), data: { settings, pages, specialDays, categories, categoryTranslations, products, productImages, productTranslations, allergens, productAllergens, tables, qrCodes, orders, orderItems, payments, reservations, reservationNotes, events, eventRequests, eventRequestNotes, galleryCategories, gallery, campaigns, reviews, contactMessages, roles, permissions, rolePermissions, users } }, null, 1);
  await audit(user.id, "backup", "system", null, `JSON yedek indirildi (${Math.round(body.length / 1024)} KB)`);
  return new Response(body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="sakli-bahce-yedek-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" } });
}
