import { createHmac } from "crypto";

/**
 * Compute HMAC-SHA256 identity hash for quota enforcement.
 * Key: "{provider}:{providerAccountId}"
 *
 * This hash is deterministically re-derivable from the OAuth identity,
 * so it survives account deletion and re-creation.
 */
export function computeIdentityHash(
  provider: string,
  providerAccountId: string
): string {
  const secret = process.env.QUOTA_HASH_SECRET;
  if (!secret) {
    throw new Error(
      "QUOTA_HASH_SECRET is not set. Generate a random 64-char secret and add it to .env.local."
    );
  }
  return createHmac("sha256", secret)
    .update(`${provider}:${providerAccountId}`)
    .digest("hex");
}

/**
 * Compute HMAC-SHA256 IP hash for quota enforcement.
 * Hashing the IP prevents storing raw PII while still allowing
 * per-IP abuse detection.
 */
export function computeIpHash(ip: string): string {
  const secret = process.env.QUOTA_HASH_SECRET;
  if (!secret) {
    throw new Error(
      "QUOTA_HASH_SECRET is not set. Generate a random 64-char secret and add it to .env.local."
    );
  }
  return createHmac("sha256", secret).update(ip).digest("hex");
}

/**
 * Extract client IP from request headers.
 * Vercel sets x-forwarded-for; x-real-ip is a common fallback.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first (original client)
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") ?? "unknown";
}
