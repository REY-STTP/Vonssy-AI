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
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }
  const low = ip.toLowerCase();
  return low === "::1" || low.startsWith("fe80:") || low.startsWith("fc") || low.startsWith("fd");
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
  const allowPrivate = process.env.ALLOW_PRIVATE_BASE_URL === "true";
  if (!allowPrivate) {
    if (host === "localhost" || host.endsWith(".local")) {
      throw new Error("Local base URLs are disabled in production.");
    }
    if (net.isIP(host) && isPrivateIp(host)) {
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
