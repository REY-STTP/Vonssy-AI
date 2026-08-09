"use client";

import { useState, useCallback, useRef } from "react";
import { ModelCatalogEntry } from "@/lib/ai-providers";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider?: string | null;
  model?: string | null;
  createdAt?: string | null;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface UseChatOptions {
  sessionId: string | null;
  selectedModel: ModelCatalogEntry;
  onSessionCreated?: (sessionId: string) => void;
  onMessageComplete?: () => void;
}

export function useChat({
  sessionId,
  selectedModel,
  onSessionCreated,
  onMessageComplete,
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<TokenUsage | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionIdRef = useRef<string | null>(sessionId);

  // Keep session ID ref in sync
  currentSessionIdRef.current = sessionId;

  /**
   * Load messages for a session from the server.
   */
  const loadMessages = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/sessions/${sid}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(
        data.messages.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          role: m.role as "user" | "assistant" | "system",
          content: m.content as string,
          provider: m.provider as string | null,
          model: m.model as string | null,
          createdAt: m.createdAt as string | null,
        }))
      );
    } catch {
      // Silently fail — user can retry
    }
  }, []);

  /**
   * Send a message and stream the response.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      setStreamingContent("");
      setIsStreaming(true);

      // Add user message optimistically
      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      // Build message history for the API
      const apiMessages = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content },
      ];

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gateway: selectedModel.gateway,
            model: selectedModel.model,
            messages: apiMessages,
            chatSessionId: currentSessionIdRef.current,
          }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Request failed with status ${res.status}`
          );
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullAssistantContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "session" && parsed.sessionId) {
                currentSessionIdRef.current = parsed.sessionId;
                onSessionCreated?.(parsed.sessionId);
              }

              if (parsed.type === "text" && parsed.content) {
                fullAssistantContent += parsed.content;
                setStreamingContent(fullAssistantContent);
              }

              if (parsed.type === "done" && parsed.usage) {
                setLastUsage(parsed.usage);
              }

              if (parsed.type === "error") {
                setError(parsed.error);
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }

        // After streaming completes, finalize the message
        if (fullAssistantContent) {
          const assistantMsg: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: fullAssistantContent,
            provider: selectedModel.gateway,
            model: selectedModel.model,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // User stopped generation — not an error
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred."
          );
        }
      } finally {
        setStreamingContent("");
        setIsStreaming(false);
        abortControllerRef.current = null;
        onMessageComplete?.();
      }
    },
    [messages, selectedModel, onSessionCreated, onMessageComplete]
  );

  /**
   * Stop the current generation.
   */
  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  /**
   * Edit a message and regenerate from that point.
   */
  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!currentSessionIdRef.current) return;

      // Call the API to edit and delete subsequent messages
      await fetch(
        `/api/sessions/${currentSessionIdRef.current}/messages`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, content: newContent }),
        }
      );

      // Reload messages and re-send
      await loadMessages(currentSessionIdRef.current);

      // Re-send with the edited content
      await sendMessage(newContent);
    },
    [loadMessages, sendMessage]
  );

  /**
   * Regenerate from a specific assistant message.
   */
  const regenerateFrom = useCallback(
    async (messageId: string) => {
      if (!currentSessionIdRef.current) return;

      // Find the user message before this assistant message
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex < 1) return;

      const userMessage = messages[msgIndex - 1];
      if (userMessage.role !== "user") return;

      // Delete the assistant message and re-send
      await fetch(
        `/api/sessions/${currentSessionIdRef.current}/messages?messageId=${messageId}`,
        { method: "DELETE" }
      );

      // Remove the assistant message from state
      setMessages((prev) => prev.slice(0, msgIndex));

      // Re-send the user message
      await sendMessage(userMessage.content);
    },
    [messages, sendMessage]
  );

  /**
   * Clear all messages (for new chat).
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setError(null);
    setLastUsage(null);
  }, []);

  return {
    messages,
    streamingContent,
    isStreaming,
    error,
    lastUsage,
    sendMessage,
    stopGeneration,
    editMessage,
    regenerateFrom,
    loadMessages,
    clearMessages,
  };
}
