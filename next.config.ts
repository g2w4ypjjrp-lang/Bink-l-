import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const isCloudflare = process.env.BUILD_TARGET === "cloudflare";
const isHttps = (process.env.APP_URL || "").startsWith("https://");

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isProd ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src https://www.google.com https://maps.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isProd && isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd && isHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  ...(isCloudflare || process.env.NETLIFY ? {} : { output: "standalone" as const }),
  poweredByHeader: false,
  // Meta etiketleri tüm istemcilerde <head> içinde (SEO denetim araçları dahil)
  htmlLimitedBots: /.*/,
  compress: true,
  images: {
    // Cloudflare Workers üzerinde Next görsel optimizasyonu yok; görseller yüklemede zaten optimize edilir
    unoptimized: isCloudflare,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [420, 640, 828, 1080, 1440, 1920, 2400],
    imageSizes: [64, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/brand/**" }],
  },
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async redirects() {
    // www → ana alan adı (Google tek adres görsün)
    return [{ source: "/rezervasyon", destination: "/iletisim", permanent: true }, { source: "/:path*", has: [{ type: "host", value: "www.xn--binklsaklbahe-mgbh88ibaf.com" }], destination: "https://xn--binklsaklbahe-mgbh88ibaf.com/:path*", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/uploads/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
