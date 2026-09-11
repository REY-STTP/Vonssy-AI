import type { NextConfig } from "next";
import dns from "node:dns";

/**
 * Force Node.js to use "verbatim" DNS resolution order.
 *
 * Supabase may return only IPv6 (AAAA) records for the database host.
 * Node.js defaults to IPv4-first, causing ENOTFOUND.
 * Setting this HERE (in next.config.ts) ensures it runs before
 * any database connections are created.
 */
dns.setDefaultResultOrder("verbatim");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["react-syntax-highlighter", "react-markdown"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  async headers() {
    // React/Turbopack dev needs eval() for debugging callstacks; it is
    // never used in production builds. Keep 'unsafe-eval' dev-only.
    const isDev = process.env.NODE_ENV !== "production";
    // NOTE: script-src keeps 'unsafe-inline' because Next.js App Router
    // requires inline scripts (React flight payload, next-themes init,
    // no-flash theme script in layout.tsx). XSS defense-in-depth comes
    // from React escaping + Markdown urlTransform (E2) + frame-ancestors
    // + form-action + base-uri below.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.googleusercontent.com https://avatars.githubusercontent.com",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
