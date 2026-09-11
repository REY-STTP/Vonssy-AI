import OpenAI from "openai";
import { AIProvider, ChatOptions, StreamChunk } from "./types";

export interface UserGatewayConfig {
  name: string;
  baseURL: string;
  apiKey: string;
}

/**
 * Generic OpenAI-compatible client instantiated per-request
 * with the calling user's own baseURL + decrypted API key (BYOK).
 * The plain key lives only in request memory, never in env or logs.
 */
export class OpenAICompatibleGateway implements AIProvider {
  readonly name: string;
  private client: OpenAI;

  constructor(config: UserGatewayConfig) {
    if (!config.baseURL) throw new Error("baseURL is required.");
    if (!config.apiKey) throw new Error("API key is required.");
    this.name = config.name;
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
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

      if (options.reasoningEffort) {
        requestBody.reasoning_effort = options.reasoningEffort;
      }

      const stream = await this.client.chat.completions.create(
        requestBody as unknown as Parameters<typeof this.client.chat.completions.create>[0],
        { signal: options.signal }
      );

      for await (const chunk of stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
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
      const err = error as {
        status?: number;
        error?: { type?: string; message?: string; request_id?: string };
        message?: string;
      };

      const is429 =
        err.status === 429 ||
        err.error?.type === "rate_limited" ||
        err.error?.type === "rate_limit_exceeded";

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
