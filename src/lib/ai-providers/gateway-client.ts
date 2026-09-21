import OpenAI from "openai";
import { AIProvider, ChatOptions, StreamChunk } from "./types";
import { redactSecrets } from "@/lib/redact";

export interface UserGatewayConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  /** Custom fetch (e.g. redirect-rejecting) forwarded to the OpenAI SDK. */
  fetchImpl?: typeof fetch;
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
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      ...(config.fetchImpl ? { fetch: config.fetchImpl } : {}),
    });
  }

  async *streamChat(options: ChatOptions): AsyncGenerator<StreamChunk> {
    // "none" means no reasoning preference — the parameter is omitted
    // entirely, which every OpenAI-compatible endpoint accepts.
    const useReasoning =
      !!options.reasoningEffort && options.reasoningEffort !== "none";
    // Reasoning models typically reject a non-default temperature, so
    // only send it when explicitly provided alongside reasoning effort.
    // Regular models keep the previous 0.75 default (unchanged behavior).
    const temperature =
      options.temperature ?? (useReasoning ? undefined : 0.75);

    const buildBody = (withReasoning: boolean): Record<string, unknown> => {
      const body: Record<string, unknown> = {
        model: options.model,
        messages: options.messages,
        ...(temperature !== undefined ? { temperature } : {}),
        max_tokens: options.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      };
      if (withReasoning && useReasoning && options.reasoningEffort) {
        body.reasoning_effort = options.reasoningEffort;
      }
      return body;
    };

    try {
      yield* this.requestOnce(buildBody(true), options.signal);
    } catch (error: unknown) {
      // Fallback: some OpenAI-compatible endpoints 400 on reasoning_effort
      // (unknown/unsupported parameter for non-reasoning models). Retry once
      // without it instead of failing — the parameter was only a hint.
      // Aborts are never retried.
      if (
        useReasoning &&
        !options.signal?.aborted &&
        isReasoningRejection(error)
      ) {
        console.error(
          `[gateway:${this.name}] reasoning_effort rejected, retrying without it.`
        );
        yield* this.requestOnce(buildBody(false), options.signal);
        return;
      }
      yield* this.handleError(error);
    }
  }

  private async *requestOnce(
    requestBody: Record<string, unknown>,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const stream = await this.client.chat.completions.create(
      requestBody as unknown as Parameters<typeof this.client.chat.completions.create>[0],
      { signal }
    );

    for await (const chunk of stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
      if (signal?.aborted) {
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
  }

  private *handleError(error: unknown): Generator<StreamChunk> {
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
      // Capacity message stays generic: the upstream text is attacker-
      // influenced (user-configured endpoint) and must not reach the UI
      // verbatim — same E6 policy as every other error path.
      console.error(
        `[gateway:${this.name}] upstream rate-limited:`,
        redactSecrets(message).slice(0, 500)
      );
      yield {
        type: "error",
        error: "This model is temporarily at capacity. Please try again shortly.",
        isRateLimited: true,
      };
    } else {
      // E6: generic client message; full text stays server-side, redacted.
      console.error(
        `[gateway:${this.name}] upstream error:`,
        redactSecrets(message).slice(0, 500)
      );
      const status =
        typeof err.status === "number" ? ` (status ${err.status})` : "";
      yield {
        type: "error",
        error: `Upstream rejected the request${status}.`,
      };
    }
  }
}

/**
 * True when an upstream 400 looks like a rejection of the reasoning_effort
 * parameter (unknown field / unsupported value for a non-reasoning model).
 */
function isReasoningRejection(error: unknown): boolean {
  const err = error as {
    status?: number;
    error?: { type?: string; message?: string };
    message?: string;
  };
  if (err.status !== 400) return false;
  const text = `${err.error?.message ?? ""} ${err.message ?? ""}`;
  return /reasoning/i.test(text);
}
