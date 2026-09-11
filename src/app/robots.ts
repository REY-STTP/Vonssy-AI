import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXTAUTH_URL ?? "https://www.vonssy-ai.web.id";

/**
 * F2: explicit crawler policy. Chat + API are private; only the
 * login gate, about page, and machine-readable files are crawlable.
 * Icon/manifest/OG assets must stay crawlable for SERP favicons.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/login", "/about", "/privacy", "/terms", "/llms.txt"],
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
        allow: ["/login", "/about", "/privacy", "/terms", "/llms.txt"],
        disallow: ["/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
