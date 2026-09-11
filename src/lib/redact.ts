/**
 * E6: strip key-like material before logging or echoing upstream text.
 * Upstream bodies are attacker-influenced (rogue providers) and must
 * never reach the client or logs verbatim.
 */
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{8,}/g,
  /Bearer\s+[A-Za-z0-9._~+/-]{8,}/gi,
  /api[_-]?key["'\s:=]+[^"'\s,}]+/gi,
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const re of SECRET_PATTERNS) {
    re.lastIndex = 0;
    out = out.replace(re, "[redacted]");
  }
  return out;
}
