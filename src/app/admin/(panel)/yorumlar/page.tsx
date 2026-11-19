import { requirePagePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { ReviewsAdmin } from "./ReviewsAdmin";

export const metadata = { title: "Yorumlar" };

export default async function ReviewsPage() {
  await requirePagePermission("reviews.manage");
  const [rows, s] = await Promise.all([db.review.findMany({ orderBy: [{ featured: "desc" }, { date: "desc" }] }), getSettings()]);
  return <ReviewsAdmin googleUrl={s.business.googleReviewsUrl} rows={rows.map((r) => ({ id: r.id, authorName: r.authorName, rating: r.rating, body: r.body, date: r.date.toISOString().slice(0, 10), photo: r.photo ?? "", source: r.source, sourceUrl: r.sourceUrl ?? "", featured: r.featured, visible: r.visible }))} />;
}
