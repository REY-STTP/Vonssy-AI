import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "metadata.google",
]);

function isPrivateIp(ip: string): boolean {
  if (net.isIP(ip) === 0) return false;
  if (net.isIPv4(ip)) {
    const [a, b, c] = ip.split(".").map(Number);
    return (
      a === 0 || // 0.0.0.0/8 (unspecified / "this host")
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
      (a === 192 && b === 0 && (c === 0 || c === 2)) || // 192.0.0.0/24, TEST-NET-1
      (a === 198 && b === 51 && c === 100) || // TEST-NET-2
      (a === 203 && b === 0 && c === 113) // TEST-NET-3
    );
  }
  const low = ip.toLowerCase();
  if (low === "::1" || low === "::" || low.startsWith("fe80:") || low.startsWith("fc") || low.startsWith("fd")) {
    return true;
  }
  // IPv4-mapped IPv6 (::ffff:127.0.0.1) — judge by the embedded IPv4.
  const mapped = low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIp(mapped[1]);
  if (low.startsWith("::ffff:")) return true;
  return false;
}

/**
 * Normalize decimal/octal/hex IPv4 forms ("2130706433", "0x7f.0.0.1",
 * "0177.0.0.1") to dotted-quad so the private check can't be dodged.
 * Returns null when the host is not an IP literal in any known form.
 */
function normalizeIpLiteral(host: string): string | null {
  if (net.isIP(host) !== 0) return host;
  const parts = host.split(".");
  if (parts.length < 1 || parts.length > 4) return null;
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^(0[xX][0-9a-fA-F]+|0[0-7]*|[1-9][0-9]*|[0-9]+)$/.test(p)) return null;
    let n: number;
    if (/^0[xX]/.test(p)) n = parseInt(p, 16);
    else if (/^0[0-9]+$/.test(p) && p.length > 1) n = parseInt(p, 8);
    else n = parseInt(p, 10);
    if (!Number.isSafeInteger(n) || n < 0) return null;
    nums.push(n);
  }
  let full: number;
  if (nums.length === 1) {
    if (nums[0] > 0xffffffff) return null;
    full = nums[0];
  } else if (nums.length === 2) {
    if (nums[0] > 255 || nums[1] > 0xffffff) return null;
    full = nums[0] * 0x1000000 + nums[1];
  } else if (nums.length === 3) {
    if (nums[0] > 255 || nums[1] > 255 || nums[2] > 0xffff) return null;
    full = nums[0] * 0x1000000 + nums[1] * 0x10000 + nums[2];
  } else {
    if (nums.some((n) => n > 255)) return null;
    full = ((nums[0] * 256 + nums[1]) * 256 + nums[2]) * 256 + nums[3];
  }
  return [full >>> 24, (full >>> 16) & 255, (full >>> 8) & 255, full & 255].join(".");
}

/**
 * Fetch wrapper that refuses to follow HTTP redirects.
 * Pass to SDK clients that would otherwise follow 3xx by default
 * (e.g. OpenAI SDK), closing the SSRF-via-redirect hole where an
 * attacker-controlled baseUrl 302s to a metadata/internal address.
 */
export function createNoRedirectFetch(): typeof fetch {
  return (async (input: unknown, init?: unknown) => {
    const res = await fetch(
      input as Parameters<typeof fetch>[0],
      { ...((init as object) ?? {}), redirect: "manual" } as Parameters<typeof fetch>[1]
    );
    if (res.status >= 300 && res.status < 400) {
      throw new Error("Upstream redirect blocked for safety.");
    }
    return res;
  }) as typeof fetch;
}

export async function assertBaseUrlAllowed(baseUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("API URL is invalid.");
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".internal")) {
    throw new Error("That API host is not allowed.");
  }
  // Defense in depth: keys must never travel cleartext. The write path
  // (validation.ts) already rejects public http://, but the guard enforces
  // it independently so no future caller can regress it.
  const isLoopback = host === "localhost" || host === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error("API URL must use https:// (http only for localhost).");
  }
  const allowPrivate = process.env.ALLOW_PRIVATE_BASE_URL === "true";
  if (!allowPrivate) {
    if (host === "localhost" || host.endsWith(".local")) {
      throw new Error("Local base URLs are disabled in production.");
    }
    // Port allowlist: default HTTPS port only (80 allowed for localhost dev).
    if (url.port && url.port !== "443") {
      throw new Error("Only the default HTTPS port (443) is allowed.");
    }
    const literal = normalizeIpLiteral(host);
    if (literal && isPrivateIp(literal)) {
      throw new Error("Private IP base URLs are not allowed.");
    }
    try {
      const records = await dns.lookup(host, { all: true });
      // Block only if EVERY resolved address is private. Some dual-stack
      // hosts (e.g. agentrouter.org) return public IPv4 alongside ULA
      // IPv6 (fd00::/8); blocking on any-private breaks them, while fetch
      // will use a public address.
      const hasPublic = records.some((r) => !isPrivateIp(r.address));
      if (!hasPublic) {
        throw new Error("That API host resolves to a private address.");
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("That API host")) throw err;
      throw new Error("Could not resolve API host.");
    }
  }
}
