import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { isWorkers } from "./runtime";

const log: ("warn" | "error")[] = process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Sunucu (Node): tek, paylaşılan bağlantı havuzu.
 * Cloudflare Workers: Neon sürücü adaptörü ile istek başına istemci (Workers, istekler arası bağlantı paylaşımına izin vermez).
 */
function nodeClient() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  // DB_DRIVER=neon (Netlify vb. sunucusuz Node): Neon sürücüsü (WebSocket) — veritabanı adındaki Türkçe karakterleri doğru çözer
  if (process.env.DB_DRIVER === "neon") {
    return (globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }), log }));
  }
  return (globalForPrisma.prisma ??= new PrismaClient({ log }));
}

async function workersFactory() {
  const { PrismaNeon } = await import("@prisma/adapter-neon");
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }), log });
}

let workersClientPromise: (() => Promise<PrismaClient>) | null = null;

async function workersClient(): Promise<PrismaClient> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const ctx = getCloudflareContext().ctx as unknown as { __prisma?: Promise<PrismaClient> };
  workersClientPromise ??= workersFactory;
  return (ctx.__prisma ??= workersClientPromise());
}

type Fn = (...a: unknown[]) => unknown;
/** Workers'ta model çağrısı: tembel ve "thenable"; $transaction([...]) dizilerinde gerçek istemcide yeniden kurulur. */
class LazyCall implements PromiseLike<unknown> {
  constructor(readonly model: string, readonly method: string, readonly args: unknown[]) {}
  build(c: PrismaClient) {
    return ((c as unknown as Record<string, Record<string, Fn>>)[this.model][this.method])(...this.args);
  }
  then<A = unknown, B = never>(ok?: ((v: unknown) => A | PromiseLike<A>) | null, err?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return workersClient().then((c) => this.build(c)).then(ok, err);
  }
  catch(err: (e: unknown) => unknown) {
    return this.then(undefined, err as never);
  }
}

function makeProxy(): PrismaClient {
  if (!isWorkers) return nodeClient();
  const handler: ProxyHandler<object> = {
    get(_t, prop: string) {
      if (prop === "then") return undefined;
      if (prop === "$transaction") {
        return (arg: unknown, opts?: unknown) =>
          workersClient().then((c) => (Array.isArray(arg) ? c.$transaction(arg.map((x) => (x instanceof LazyCall ? x.build(c) : x)) as never, opts as never) : c.$transaction(arg as never, opts as never)));
      }
      if (prop.startsWith("$")) {
        return (...args: unknown[]) => workersClient().then((c) => (c as unknown as Record<string, Fn>)[prop](...args));
      }
      return new Proxy({}, { get: (_m, method: string) => (...args: unknown[]) => new LazyCall(prop, method, args) });
    },
  };
  return new Proxy({}, handler) as PrismaClient;
}

export const db: PrismaClient = makeProxy();
