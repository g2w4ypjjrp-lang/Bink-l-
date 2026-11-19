import { readFile } from "@/lib/storage";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  if (parts.some((p) => p === ".." || p.includes("\\"))) return new Response("Not found", { status: 404 });
  const rel = parts.join("/");
  if (rel.endsWith(".svg")) return new Response("Not found", { status: 404 });
  const f = await readFile(rel);
  if (!f) return new Response("Not found", { status: 404 });
  const etag = `"${f.data.length.toString(16)}-${rel.length.toString(16)}"`;
  const headers: Record<string, string> = { "Content-Type": f.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Accept-Ranges": "bytes", ETag: etag };
  const range = req.headers.get("range");
  if (range && f.mime.startsWith("video/")) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), f.data.length - 1) : Math.min(start + 2 ** 21, f.data.length - 1);
    return new Response(new Uint8Array(f.data.slice(start, end + 1)) as Uint8Array<ArrayBuffer>, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${f.data.length}`, "Content-Length": String(end - start + 1) } });
  }
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(new Uint8Array(f.data) as Uint8Array<ArrayBuffer>, { headers: { ...headers, "Content-Length": String(f.data.length) } });
}
