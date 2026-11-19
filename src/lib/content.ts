import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { DEFAULT_CONTENT, PAGES } from "./page-schema";

export type SectionContent = Record<string, unknown> & { visible?: boolean };
export type PageContent = Record<string, SectionContent>;

export type PageRecord = {
  key: string;
  title: string;
  slug: string;
  content: PageContent;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  ogImage: string | null;
  canonical: string | null;
  noindex: boolean;
};

export const getPage = unstable_cache(
  async (key: string): Promise<PageRecord> => {
    const def = PAGES.find((p) => p.key === key);
    const row = await db.page.findUnique({ where: { key } });
    const defaults = DEFAULT_CONTENT[key] ?? {};
    const stored = (row?.content as PageContent) ?? {};
    const content: PageContent = {};
    for (const s of new Set([...Object.keys(defaults), ...Object.keys(stored)])) {
      content[s] = { visible: true, ...(defaults[s] ?? {}), ...(stored[s] ?? {}) };
    }
    return {
      key,
      title: row?.title ?? def?.title ?? key,
      slug: row?.slug ?? def?.slug ?? "/",
      content,
      seoTitle: row?.seoTitle ?? null,
      seoDescription: row?.seoDescription ?? null,
      seoKeywords: row?.seoKeywords ?? null,
      ogImage: row?.ogImage ?? null,
      canonical: row?.canonical ?? null,
      noindex: row?.noindex ?? false,
    };
  },
  ["page-v1"],
  { tags: ["pages"], revalidate: 3600 }
);

export function str(section: SectionContent | undefined, key: string): string {
  const v = section?.[key];
  return typeof v === "string" ? v : "";
}

export function list<T = Record<string, string>>(section: SectionContent | undefined, key: string): T[] {
  const v = section?.[key];
  return Array.isArray(v) ? (v as T[]) : [];
}
