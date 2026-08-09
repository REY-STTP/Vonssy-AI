import { OpenAICompatibleGateway, GatewayConfig } from "./gateway-client";
import { AIProvider } from "./types";

/**
 * Gateway registry — one entry per upstream service.
 * Adding a new gateway = one new entry here + MODEL_CATALOG below.
 * No changes to API routes or UI needed.
 */
const GATEWAYS: Record<string, GatewayConfig> = {
  seekai: {
    name: "seekai",
    baseURL: "https://seekai.cc/v1",
    apiKeyEnvVar: "SEEKAI_API_KEY",
    supportsReasoningEffort: false,
  },
  xkiro: {
    name: "xkiro",
    baseURL: "https://api.xkiro.com/v1",
    apiKeyEnvVar: "XKIRO_API_KEY",
    supportsReasoningEffort: false,
  },
  nara: {
    name: "nara",
    baseURL: "https://router.bynara.id/v1",
    apiKeyEnvVar: "NARA_API_KEY",
    supportsReasoningEffort: true,
  },
  inception: {
    name: "inception",
    baseURL: "https://api.inceptionlabs.ai/v1",
    apiKeyEnvVar: "INCEPTION_API_KEY",
    supportsReasoningEffort: true,
  },
} as const;

export type GatewayId = keyof typeof GATEWAYS;

/** Singleton cache: instantiate each gateway client at most once */
const cache = new Map<string, AIProvider>();

export function getProvider(id: GatewayId): AIProvider {
  if (!cache.has(id)) {
    const config = GATEWAYS[id];
    if (!config) {
      throw new Error(`Unknown gateway: ${id}`);
    }
    cache.set(id, new OpenAICompatibleGateway(config));
  }
  return cache.get(id)!;
}

export function isValidGateway(id: string): id is GatewayId {
  return id in GATEWAYS;
}

/**
 * Model catalog — single source of truth for the UI's provider-sigil selector.
 *
 * Each entry's `gateway` → stored in messages.provider / usage_logs.provider
 * Each entry's `model` → stored in messages.model / usage_logs.model
 *
 * Optional `fallbackGateway` + `fallbackModel`: if the primary returns 429,
 * retry once against the fallback before failing to the user.
 */
export interface ModelCatalogEntry {
  /** Display label shown in the UI */
  label: string;
  /** Gateway identifier (key in GATEWAYS) */
  gateway: GatewayId;
  /** Model ID as sent to the gateway */
  model: string;
  /** Sigil icon identifier for the UI */
  sigil: "seekai" | "xkiro" | "nara" | "inception";
  /** Optional fallback for 429 retries */
  fallbackGateway?: GatewayId;
  fallbackModel?: string;
}

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    label: "Claude Opus 4.8",
    gateway: "seekai",
    model: "claude-opus-4-8",
    sigil: "seekai",
  },
  {
    label: "Claude Fable 5",
    gateway: "seekai",
    model: "claude-fable-5",
    sigil: "seekai",
  },
  {
    label: "ChatGPT 5.5",
    gateway: "seekai",
    model: "gpt-5-5",
    sigil: "seekai",
  },
  {
    label: "ChatGPT 5.6",
    gateway: "seekai",
    model: "gpt-5-6",
    sigil: "seekai",
  },
  {
    label: "Qwen 3.8 Max",
    gateway: "xkiro",
    model: "qwen/qwen3.8-max",
    sigil: "xkiro",
  },
  {
    label: "DeepSeek V4 Pro",
    gateway: "xkiro",
    model: "deepseek/deepseek-v4-pro",
    sigil: "xkiro",
  },
  {
    label: "Grok 4.5",
    gateway: "nara",
    model: "grok-4.5-free",
    sigil: "nara",
  },
  {
    label: "Mercury 2",
    gateway: "inception",
    model: "mercury-2",
    sigil: "inception",
  },
];

/** Look up a catalog entry by gateway + model */
export function getModelEntry(
  gateway: string,
  model: string
): ModelCatalogEntry | undefined {
  return MODEL_CATALOG.find(
    (entry) => entry.gateway === gateway && entry.model === model
  );
}

/** Get the default model catalog entry */
export function getDefaultModel(): ModelCatalogEntry {
  return MODEL_CATALOG[0];
}
