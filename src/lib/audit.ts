import "server-only";
import { db } from "./db";
import { clientIp } from "./security";

export async function audit(userId: string | null, action: string, entity: string, entityId?: string | null, summary?: string, meta?: unknown) {
  try {
    await db.auditLog.create({
      data: { userId, action, entity, entityId: entityId ?? null, summary, meta: meta === undefined ? undefined : JSON.parse(JSON.stringify(meta)), ip: await clientIp() },
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}

export async function logError(source: string, err: unknown, path?: string) {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(`[${source}]`, e);
  try {
    await db.errorLog.create({ data: { source, message: e.message.slice(0, 2000), stack: e.stack?.slice(0, 8000), path } });
  } catch {
    /* veritabanı erişilemiyorsa sessiz geç */
  }
}
