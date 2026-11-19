import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { toNumber } from "@/lib/utils";
import { CampaignsAdmin } from "./CampaignsAdmin";

export const metadata = { title: "Kampanyalar" };
const isoTR = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d) : "");

export default async function CampaignsPage() {
  await requirePagePermission("campaigns.manage");
  const [rows, cats] = await Promise.all([db.campaign.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }), db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } })]);
  return (
    <CampaignsAdmin
      categories={cats}
      rows={rows.map((c) => ({ id: c.id, title: c.title, description: c.description ?? "", image: c.image ?? "", startsAt: isoTR(c.startsAt), endsAt: isoTR(c.endsAt), price: c.price ? toNumber(c.price) : "", discountRate: c.discountRate ?? "", categoryId: c.categoryId, active: c.active, showOnHome: c.showOnHome, showOnMenu: c.showOnMenu }))}
    />
  );
}
