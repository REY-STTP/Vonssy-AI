import { OpenAICompatibleGateway, GatewayConfig } from "./gateway-client";
import { AIProvider } from "./types";

/**
 * Gateway registry — one entry per upstream service.
 * Adding a new gateway = one new entry here + MODEL_CATALOG below.
 * No changes to API routes or UI needed.
 */
export const GATEWAYS: Record<string, GatewayConfig> = {
  seekai: {
    name: "seekai",
    baseURL: "https://seekai.cc/v1",
    apiKeyEnvVar: "SEEKAI_API_KEY",
    supportsReasoningEffort: false,
    sigil: {
      strokeLinecap: "round",
      svgInnerHtml: `
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <line x1="12" y1="2" x2="12" y2="7" />
        <line x1="12" y1="17" x2="12" y2="22" />
        <line x1="2" y1="12" x2="7" y2="12" />
        <line x1="17" y1="12" x2="22" y2="12" />
      `,
    },
  },
  xkiro: {
    name: "xkiro",
    baseURL: "https://api.xkiro.com/v1",
    apiKeyEnvVar: "XKIRO_API_KEY",
    supportsReasoningEffort: false,
    sigil: {
      strokeLinecap: "square",
      svgInnerHtml: `
        <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" />
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="7" x2="22" y2="17" />
        <line x1="22" y1="7" x2="2" y2="17" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      `,
    },
  },
  nara: {
    name: "nara",
    baseURL: "https://router.bynara.id/v1",
    apiKeyEnvVar: "NARA_API_KEY",
    supportsReasoningEffort: true,
    sigil: {
      strokeLinecap: "square",
      svgInnerHtml: `
        <polygon points="12,1 23,12 12,23 1,12" />
        <polygon points="12,6 18,12 12,18 6,12" />
        <line x1="12" y1="1" x2="12" y2="6" />
        <line x1="23" y1="12" x2="18" y2="12" />
        <line x1="12" y1="23" x2="12" y2="18" />
        <line x1="1" y1="12" x2="6" y2="12" />
        <circle cx="12" cy="1" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="23" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="23" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="1" cy="12" r="1.5" fill="currentColor" stroke="none" />
      `,
    },
  },
  inception: {
    name: "inception",
    baseURL: "https://api.inceptionlabs.ai/v1",
    apiKeyEnvVar: "INCEPTION_API_KEY",
    supportsReasoningEffort: true,
    sigil: {
      strokeLinecap: "square",
      svgInnerHtml: `
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="2" x2="12" y2="7" />
        <line x1="12" y1="17" x2="12" y2="22" />
        <line x1="2" y1="12" x2="7" y2="12" />
        <line x1="17" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="8.46" y2="8.46" />
        <line x1="15.54" y1="15.54" x2="19.07" y2="19.07" />
        <line x1="4.93" y1="19.07" x2="8.46" y2="15.54" />
        <line x1="15.54" y1="8.46" x2="19.07" y2="4.93" />
        <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
      `,
    },
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
  /** Gateway identifier (key in GATEWAYS) — also used as icon lookup key */
  gateway: GatewayId;
  /** Model ID as sent to the gateway */
  model: string;
  /** Optional fallback for 429 retries */
  fallbackGateway?: GatewayId;
  fallbackModel?: string;
}

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  /** seekai */
  {
    label: "Claude Opus 4.7",
    gateway: "seekai",
    model: "claude-opus-4-7",
  },
  {
    label: "Claude Opus 4.8",
    gateway: "seekai",
    model: "claude-opus-4-8",
  },
  {
    label: "Claude Opus 5",
    gateway: "seekai",
    model: "claude-opus-5",
  },
  {
    label: "Claude Fable 5",
    gateway: "seekai",
    model: "claude-fable-5",
  },
  {
    label: "ChatGPT 5.5",
    gateway: "seekai",
    model: "gpt-5-5",
  },
  {
    label: "ChatGPT 5.6",
    gateway: "seekai",
    model: "gpt-5.6",
  },
  {
    label: "ChatGPT 5.6-sol",
    gateway: "seekai",
    model: "gpt-5.6-sol",
  },
  /** xkiro */
  {
    label: "Qwen 3.8 Max",
    gateway: "xkiro",
    model: "qwen/qwen3.8-max",
  },
  {
    label: "DeepSeek V4 Pro",
    gateway: "xkiro",
    model: "deepseek/deepseek-v4-pro",
  },
  /** nara */
  {
    label: "Grok 4.5",
    gateway: "nara",
    model: "grok-4.5-free",
  },
  /** inception */
  {
    label: "Mercury 2",
    gateway: "inception",
    model: "mercury-2",
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
