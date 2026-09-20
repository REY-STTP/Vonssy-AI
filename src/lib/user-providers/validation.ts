export function normalizeBaseUrl(input: string): string {
  const trimmed = (input ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) throw new Error("API URL is required.");
  if (trimmed.length > 500) throw new Error("API URL is too long (max 500).");
  if (/\s/.test(trimmed)) throw new Error("API URL must not contain spaces.");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("API URL is invalid. Example: https://api.openai.com/v1");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("API URL must start with https://");
  }
  if (url.protocol === "http:") {
    const host = url.hostname.toLowerCase();
    if (host !== "localhost" && host !== "127.0.0.1") {
      throw new Error("Only https:// URLs are allowed (http only for localhost).");
    }
  }
  // Port allowlist mirrors ssrf-guard (fail fast at write time).
  // NOTE: http://localhost is accepted here for dev (Ollama); the
  // production guard still blocks non-public targets at use time.
  const isLoopbackHttp =
    url.protocol === "http:" &&
    (url.hostname.toLowerCase() === "localhost" || url.hostname === "127.0.0.1");
  if (url.port && url.port !== "443" && !isLoopbackHttp) {
    throw new Error("Only the default HTTPS port (443) is allowed.");
  }
  return trimmed;
}

export function validateLabel(label: string): string {
  const t = (label ?? "").trim();
  if (!t) throw new Error("Label is required.");
  if (t.length > 80) throw new Error("Label is too long (max 80).");
  return t;
}

export function validateModelId(model: string): string {
  const t = (model ?? "").trim();
  if (!t) throw new Error("Model ID is required.");
  if (t.length > 200) throw new Error("Model ID is too long (max 200).");
  return t;
}

export const MAX_MODELS_PER_PROVIDER = 20;

export function validateModelIds(models: unknown): string[] {
  if (!Array.isArray(models)) throw new Error("Models must be an array of model IDs.");
  if (models.length < 1) throw new Error("At least one model ID is required.");
  if (models.length > MAX_MODELS_PER_PROVIDER) {
    throw new Error(`Too many models (max ${MAX_MODELS_PER_PROVIDER} per provider).`);
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of models) {
    const id = validateModelId(typeof m === "string" ? m : "");
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  if (out.length < 1) throw new Error("At least one model ID is required.");
  return out;
}

export function validateApiKey(key: string): string {
  if (!key || key.length < 1 || key.length > 500) {
    throw new Error("API key must be 1..500 characters.");
  }
  if (/[\r\n]/.test(key)) throw new Error("API key must not contain newlines.");
  return key;
}

export function maskApiKey(key: string): string {
  const last4 = key.slice(-4);
  return `****${last4}`;
}
