import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { db } from "./db";

import { DEFAULT_SETTINGS, type Settings, type SettingsKey } from "./settings-defaults";
export { DEFAULT_SETTINGS, type Settings, type SettingsKey, type WeeklyHour } from "./settings-defaults";


function merge<T>(def: T, val: unknown): T {
  if (!val || typeof val !== "object" || Array.isArray(val)) return def;
  return { ...def, ...(val as object) } as T;
}

export const getSettings = unstable_cache(
  async (): Promise<Settings> => {
    const rows = await db.setting.findMany();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const out = {} as Record<string, unknown>;
    for (const k of Object.keys(DEFAULT_SETTINGS) as SettingsKey[]) out[k] = merge(DEFAULT_SETTINGS[k], map[k]);
    return out as Settings;
  },
  ["settings-v1"],
  { tags: ["settings"], revalidate: 3600 }
);

export async function saveSetting<K extends SettingsKey>(key: K, value: Partial<Settings[K]>) {
  const current = (await db.setting.findUnique({ where: { key } }))?.value as object | undefined;
  const merged = { ...DEFAULT_SETTINGS[key], ...(current ?? {}), ...value };
  await db.setting.upsert({ where: { key }, update: { value: merged as object }, create: { key, value: merged as object } });
  revalidateTag("settings");
}
