import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXTAUTH_URL ?? "https://www.vonssy-ai.web.id";

/**
 * Crawler policy.
 *
 * Private surfaces (`/chat/*`, `/api/`) are kept out of search
 * results with an auth redirect/gate + `noindex` (see `(chat)/layout.tsx`),
 * NOT with `Disallow: /`.
 *
 * Why no `Disallow: /`? When robots.txt blocks crawling, Googlebot can
 * never see the `noindex` tag or the auth redirect, so it may index
 * the URL from link signals alone — exactly the Search Console warning
 * "Indexed, though blocked by robots.txt". Per Google docs, `noindex`
 * requires allowing the crawl. Only `/api/` is disallowed: JSON
 * endpoints carry no `noindex` meta and must never be crawled.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "CCBot",
  "Bytespider",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/api/",
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: "/api/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
