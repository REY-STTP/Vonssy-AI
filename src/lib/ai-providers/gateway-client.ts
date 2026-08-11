import OpenAI from "openai";
import { AIProvider, ChatOptions, StreamChunk } from "./types";

export interface GatewayConfig {
  name: string;
  baseURL: string;
  apiKeyEnvVar: string;
  supportsReasoningEffort: boolean;
  sigil: {
    strokeLinecap?: "round" | "square" | "butt";
    svgInnerHtml: string;
  };
}

/**
 * Generic OpenAI-compatible gateway client.
 *
 * All three upstream gateways (xKiro, NaraRouter, Inception) share
 * the same wire format (OpenAI Chat Completions). This single class
 * handles all three — only the config object differs.
 *
 * Per spec Section 6: "Do not write a separate class per gateway
 * unless one of them diverges from OpenAI's wire format later."
 */
export class OpenAICompatibleGateway implements AIProvider {
  readonly name: string;
  private client: OpenAI;
  private supportsReasoningEffort: boolean;

  constructor(config: GatewayConfig) {
    const apiKey = process.env[config.apiKeyEnvVar];
    if (!apiKey) {
      throw new Error(
        `Missing env var ${config.apiKeyEnvVar}. ` +
          `Set it in .env.local (server-only, never NEXT_PUBLIC_).`
      );
    }
    this.name = config.name;
    this.supportsReasoningEffort = config.supportsReasoningEffort;
    this.client = new OpenAI({ apiKey, baseURL: config.baseURL });
  }

  async *streamChat(options: ChatOptions): AsyncGenerator<StreamChunk> {
    try {
      const requestBody: Record<string, unknown> = {
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.75,
        max_tokens: options.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      };

      // Only pass reasoning_effort if the gateway supports it
      if (this.supportsReasoningEffort && options.reasoningEffort) {
        requestBody.reasoning_effort = options.reasoningEffort;
      }

      const stream = await this.client.chat.completions.create(
        requestBody as unknown as Parameters<typeof this.client.chat.completions.create>[0],
        { signal: options.signal }
      );

      for await (const chunk of stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
        // Check for abort
        if (options.signal?.aborted) {
          return;
        }

        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          yield { type: "text", content: delta };
        }

        if (chunk.usage) {
          yield {
            type: "done",
            usage: {
              promptTokens: chunk.usage.prompt_tokens ?? 0,
              completionTokens: chunk.usage.completion_tokens ?? 0,
              totalTokens: chunk.usage.total_tokens ?? 0,
            },
          };
        }
      }
    } catch (error: unknown) {
      // Detect 429 / rate_limited errors from upstream gateways
      const err = error as {
        status?: number;
        error?: { type?: string; message?: string; request_id?: string };
        message?: string;
      };

      const is429 =
        err.status === 429 ||
        err.error?.type === "rate_limited" ||
        err.error?.type === "rate_limit_exceeded";

      // Normalize error message from different gateway error envelopes:
      // - NaraRouter: { error: { type, message, request_id } }
      // - OpenAI SDK: { message }
      const message =
        err.error?.message ?? err.message ?? "Unknown gateway error";

      if (is429) {
        yield {
          type: "error",
          error: `This model is temporarily at capacity. ${message}`,
          isRateLimited: true,
        };
      } else {
        yield { type: "error", error: message };
      }
    }
  }
}
