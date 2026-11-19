import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth";
import { getPage } from "@/lib/content";
import { PAGES } from "@/lib/page-schema";
import { PageEditor } from "./PageEditor";

export default async function EditPage({ params }: { params: Promise<{ key: string }> }) {
  await requirePagePermission("pages.manage");
  const { key } = await params;
  const def = PAGES.find((p) => p.key === key);
  if (!def) notFound();
  const page = await getPage(key);
  return <PageEditor def={def} content={page.content} />;
}
