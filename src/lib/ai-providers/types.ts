/**
 * Shared types for the AI provider abstraction layer.
 * These types are the contract between the gateway client,
 * the API routes, and the UI.
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamChunk {
  type: "text" | "done" | "error";
  content?: string;
  usage?: TokenUsage;
  error?: string;
  /** True when the error is a 429 / rate-limited response from the upstream gateway */
  isRateLimited?: boolean;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Passed through when the gateway supports it; ignored otherwise */
  reasoningEffort?: "low" | "medium" | "high";
  /** AbortSignal for stop-generation control */
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly name: string;
  streamChat(options: ChatOptions): AsyncGenerator<StreamChunk>;
}
