/**
 * Central UUID validator for API routes.
 *
 * Convention: malformed IDs → 400, well-formed but absent → 404.
 * Never echo the raw ID back in error messages.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
