import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXTAUTH_URL ?? "https://www.vonssy-ai.web.id";

/**
 * F2: explicit crawler policy. Chat + API are private; only the
 * login gate, public docs, and machine-readable files are crawlable.
 * Icon/manifest/OG/sitemap assets must stay crawlable (a bare
 * `Disallow: /` would prefix-block them, including /sitemap.xml).
 */
const PUBLIC_PATHS = [
  "/login",
  "/about",
  "/privacy",
  "/terms",
  "/llms.txt",
  "/sitemap.xml",
  "/robots.txt",
  "/favicon.ico",
  "/icon.svg",
  "/apple-icon.png",
  "/manifest.webmanifest",
  "/og-image.png",
  "/icons/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: PUBLIC_PATHS,
        disallow: ["/", "/api/"],
      },
      {
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "PerplexityBot",
          "CCBot",
          "Bytespider",
        ],
        allow: PUBLIC_PATHS,
        disallow: ["/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
