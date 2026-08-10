"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
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
  const [truncationIndex, setTruncationIndex] = useState<number | null>(null);
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

  interface SendMessageOptions {
    truncatePointMessageId?: string;
    editContent?: string;
    truncateIndex?: number;
  }

  const sendMessage = useCallback(
    async (content: string, options?: SendMessageOptions) => {
      setStreamingContent("");
      setIsStreaming(true);

      if (options?.truncateIndex !== undefined) {
        setTruncationIndex(options.truncateIndex);
      }

      let apiMessages: Array<{ role: string; content: string }>;

      if (options?.truncateIndex !== undefined) {
        // Truncate history for the API call
        const history = messages.slice(0, options.truncateIndex + 1);
        apiMessages = history.map((m) => ({ role: m.role, content: m.content }));
        
        // Optimistically update edited content in the UI
        if (options.editContent) {
          apiMessages[apiMessages.length - 1].content = options.editContent;
          setMessages((prev) => {
            const next = [...prev];
            next[options.truncateIndex!] = { ...next[options.truncateIndex!], content: options.editContent! };
            return next;
          });
        }
      } else {
        // Normal send: append user message optimistically
        const tempUserMsg: Message = {
          id: `temp-${Date.now()}`,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempUserMsg]);

        apiMessages = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content },
        ];
      }

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
            truncatePointMessageId: options?.truncatePointMessageId,
            editContent: options?.editContent,
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
                toast.error(parsed.error);
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
          
          setMessages((prev) => {
            const baseMessages = options?.truncateIndex !== undefined
              ? prev.slice(0, options.truncateIndex + 1)
              : prev;
            return [...baseMessages, assistantMsg];
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // User stopped generation — not an error
        } else {
          toast.error(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred."
          );
        }
      } finally {
        setStreamingContent("");
        setIsStreaming(false);
        setTruncationIndex(null);
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

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!currentSessionIdRef.current) return;

      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      await sendMessage(newContent, {
        truncatePointMessageId: messageId,
        editContent: newContent,
        truncateIndex: msgIndex,
      });
    },
    [messages, sendMessage]
  );

  const regenerateFrom = useCallback(
    async (messageId: string) => {
      if (!currentSessionIdRef.current) return;

      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;
      
      const targetMessage = messages[msgIndex];

      if (targetMessage.role === "assistant") {
        const userMessage = messages[msgIndex - 1];
        if (!userMessage || userMessage.role !== "user") return;

        await sendMessage(userMessage.content, {
          truncatePointMessageId: userMessage.id,
          truncateIndex: msgIndex - 1,
        });
      } else if (targetMessage.role === "user") {
        await sendMessage(targetMessage.content, {
          truncatePointMessageId: targetMessage.id,
          truncateIndex: msgIndex,
        });
      }
    },
    [messages, sendMessage]
  );

  /**
   * Clear all messages (for new chat).
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setLastUsage(null);
  }, []);

  return {
    messages,
    truncationIndex,
    streamingContent,
    isStreaming,
    lastUsage,
    sendMessage,
    stopGeneration,
    editMessage,
    regenerateFrom,
    loadMessages,
    clearMessages,
  };
}
