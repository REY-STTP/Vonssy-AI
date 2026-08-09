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
  /* config options here */
};

export default nextConfig;
