import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXTAUTH_URL ?? "https://www.vonssy-ai.web.id";

/**
 * F2: only public routes are listed. Chat and API are excluded
 * (see robots.ts + noindex on the (chat) layout).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/login`, lastModified: now },
    { url: `${SITE_URL}/about`, lastModified: now },
    { url: `${SITE_URL}/privacy`, lastModified: now },
    { url: `${SITE_URL}/terms`, lastModified: now },
  ];
}
