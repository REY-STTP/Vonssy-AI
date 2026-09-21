"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { UserProviderConfig } from "./useProviders";
import type { ReasoningEffort } from "@/lib/ai-providers/types";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider?: string | null;
  model?: string | null;
  feedback?: string | null;
  createdAt?: string | null;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

interface UseChatOptions {
  sessionId: string | null;
  selectedProvider: UserProviderConfig | null;
  selectedModel: string | null;
  onSessionCreated?: (sessionId: string) => void;
  onMessageComplete?: () => void;
}

export function useChat({
  sessionId,
  selectedProvider,
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
  // D3: read history via ref so sendMessage stays referentially stable.
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;
  // B3: rAF-batched streaming renders (one setState per frame max).
  const streamTextRef = useRef("");
  const streamRafRef = useRef<number | null>(null);
  // D3: real DB ids delivered via the "ids" SSE event.
  const serverIdsRef = useRef<{ user: string | null; assistant: string | null }>({
    user: null,
    assistant: null,
  });

  const scheduleStreamingFlush = useCallback((full: string) => {
    streamTextRef.current = full;
    if (streamRafRef.current !== null) return;
    streamRafRef.current = requestAnimationFrame(() => {
      streamRafRef.current = null;
      setStreamingContent(streamTextRef.current);
    });
  }, []);

  const cancelStreamingFlush = useCallback(() => {
    if (streamRafRef.current !== null) {
      cancelAnimationFrame(streamRafRef.current);
      streamRafRef.current = null;
    }
    streamTextRef.current = "";
  }, []);

  currentSessionIdRef.current = sessionId;

  const loadAbortRef = useRef<AbortController | null>(null);

  // Navigation now remounts per session (/chat/[id]): abort any in-flight
  // stream and message load on unmount so orphan requests can't resolve
  // into the wrong instance (and to stop burning provider tokens).
  // Streaming renders are rAF-batched, so also drop a pending frame.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      loadAbortRef.current?.abort();
      cancelStreamingFlush();
    };
  }, [cancelStreamingFlush]);

  // D4: abortable load — fast session switches can't resolve out of order.
  // With onlyIfCurrent, a late resolve is dropped when the user has moved
  // to another session (used by the abort/error heal path below).
  const loadMessages = useCallback(async (sid: string, opts?: { onlyIfCurrent?: boolean }) => {
    // Guard FIRST: a stale heal must neither abort the new session's load
    // nor resolve into it — check before touching the shared abort ref.
    if (opts?.onlyIfCurrent && currentSessionIdRef.current !== sid) return;
    loadAbortRef.current?.abort();
    const ctrl = new AbortController();
    loadAbortRef.current = ctrl;
    try {
      const res = await fetch(`/api/sessions/${sid}`, { signal: ctrl.signal });
      if (res.status === 404) {
        // Session deleted/never existed: don't leave the previous
        // session's messages painted under the new id.
        if (!opts?.onlyIfCurrent || currentSessionIdRef.current === sid) {
          setMessages([]);
        }
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (opts?.onlyIfCurrent && currentSessionIdRef.current !== sid) return;
      setMessages(
        data.messages.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          role: m.role as "user" | "assistant" | "system",
          content: m.content as string,
          provider: m.provider as string | null,
          model: m.model as string | null,
          feedback: (m.feedback as string | null) ?? null,
          createdAt: m.createdAt as string | null,
        }))
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      // Silently fail — user can retry
    } finally {
      if (loadAbortRef.current === ctrl) loadAbortRef.current = null;
    }
  }, []);

  interface SendMessageOptions {
    truncatePointMessageId?: string;
    editContent?: string;
    truncateIndex?: number;
    reasoningEffort?: ReasoningEffort;
  }

  // Optimistic ids not yet confirmed by the server — truncate flows
  // require real DB ids, so these always fall back to a fresh send.
  const isTempId = (id: string) =>
    id.startsWith("temp-") || id.startsWith("assistant-");

  const sendMessage = useCallback(
    async (content: string, options?: SendMessageOptions) => {
      if (!selectedProvider || !selectedModel) {
        toast.error("Add a provider first in Settings → Providers.");
        return;
      }
      // A stream is already in flight (double-clicked regenerate, edit
      // while streaming, …). A second send would compute truncate indices
      // against a shifting list and append a duplicate response.
      if (abortControllerRef.current) {
        toast.error("Please wait for the current response to finish.");
        return;
      }
      cancelStreamingFlush();
      setStreamingContent("");
      setIsStreaming(true);
      serverIdsRef.current = { user: null, assistant: null };
      // Session + controller captured so the abort/error heal below only
      // reloads when nothing newer (new send, session switch) superseded us.
      const sendSessionId = currentSessionIdRef.current;

      if (options?.truncateIndex !== undefined) {
        setTruncationIndex(options.truncateIndex);
      }

      let apiMessages: Array<{ role: string; content: string }>;
      const history = messagesRef.current;
      // Temp id of the optimistic user bubble (null in truncate flows).
      let pendingUserId: string | null = null;
      // Becomes true once the early ids-event swap below runs.
      let userIdSwapped = false;

      if (options?.truncateIndex !== undefined) {
        const sliced = history.slice(0, options.truncateIndex + 1);
        apiMessages = sliced.map((m) => ({ role: m.role, content: m.content }));

        if (options.editContent) {
          apiMessages[apiMessages.length - 1].content = options.editContent;
          setMessages((prev) => {
            const next = [...prev];
            next[options.truncateIndex!] = { ...next[options.truncateIndex!], content: options.editContent! };
            return next;
          });
        }
      } else {
        const tempUserMsg: Message = {
          id: `temp-${Date.now()}`,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        };
        pendingUserId = tempUserMsg.id;
        setMessages((prev) => [...prev, tempUserMsg]);

        apiMessages = [
          ...history.map((m) => ({ role: m.role, content: m.content })),
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
            providerId: selectedProvider.id,
            model: selectedModel,
            messages: apiMessages,
            chatSessionId: currentSessionIdRef.current,
            truncatePointMessageId: options?.truncatePointMessageId,
            editContent: options?.editContent,
            reasoningEffort: options?.reasoningEffort,
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
        // B2: accumulate across TCP chunks; only split on event boundary.
        let buffer = "";

        const handleEventData = (data: string) => {
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "session" && parsed.sessionId) {
              currentSessionIdRef.current = parsed.sessionId;
              onSessionCreated?.(parsed.sessionId);
            }

            if (parsed.type === "text" && parsed.content) {
              fullAssistantContent += parsed.content;
              scheduleStreamingFlush(fullAssistantContent);
            }

            if (parsed.type === "done" && parsed.usage) {
              setLastUsage(parsed.usage);
            }

            if (parsed.type === "ids") {
              serverIdsRef.current = {
                user:
                  typeof parsed.userMessageId === "string"
                    ? parsed.userMessageId
                    : null,
                assistant:
                  typeof parsed.assistantMessageId === "string"
                    ? parsed.assistantMessageId
                    : null,
              };
              // Swap the optimistic user id immediately: abort/error paths
              // skip the completion swap below, and without this the bubble
              // keeps its temp id so a later regenerate/edit degrades to an
              // appending fresh send (duplicate UI + duplicate server row).
              const realUserId =
                typeof parsed.userMessageId === "string" ? parsed.userMessageId : null;
              if (realUserId && pendingUserId && !userIdSwapped) {
                userIdSwapped = true;
                const tempId = pendingUserId;
                pendingUserId = null;
                setMessages((prev) =>
                  prev.map((m) => (m.id === tempId ? { ...m, id: realUserId } : m))
                );
              }
            }

            if (parsed.type === "error") {
              toast.error(parsed.error);
            }
          } catch {
            // Skip unparseable events
          }
        };

        const consumeBuffer = () => {
          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            for (const line of rawEvent.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (!data) continue;
              handleEventData(data);
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            consumeBuffer();
          }
          if (done) break;
        }
        // Flush any trailing bytes + partial tail event.
        buffer += decoder.decode();
        consumeBuffer();
        if (buffer.trim().startsWith("data:")) {
          for (const line of buffer.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data) continue;
            handleEventData(data);
          }
        }

        if (fullAssistantContent) {
          const assistantMsg: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: fullAssistantContent,
            provider: selectedProvider.label,
            model: selectedModel,
            createdAt: new Date().toISOString(),
          };

          setMessages((prev) => {
            const baseMessages = options?.truncateIndex !== undefined
              ? prev.slice(0, options.truncateIndex + 1)
              : prev;
            const next = [...baseMessages, assistantMsg];
            // D3: swap optimistic temp ids for real DB ids (no refetch).
            const { user: realUserId, assistant: realAssistantId } =
              serverIdsRef.current;
            if (!realUserId && !realAssistantId) return next;
            return next.map((m) => {
              if (pendingUserId && m.id === pendingUserId && realUserId) {
                return { ...m, id: realUserId };
              }
              if (m.id === assistantMsg.id && realAssistantId) {
                return { ...m, id: realAssistantId };
              }
              return m;
            });
          });
        } else if (
          options?.editContent &&
          sendSessionId &&
          abortControllerRef.current === abortController
        ) {
          // The optimistic edit was applied up-front, but the server only
          // commits it (and the truncation) on success. Reload server truth
          // so a failed/empty regeneration doesn't leave the rejected edit
          // painted over the stored transcript.
          loadMessages(sendSessionId, { onlyIfCurrent: true });
        }
      } catch (err: unknown) {
        const wasAbort = err instanceof Error && err.name === "AbortError";
        if (!wasAbort) {
          toast.error(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred."
          );
        }
        // Heal unconfirmed temp ids: abort/failed streams skip the
        // completion swap, so without this a later regenerate/edit sees a
        // temp id and degrades to an appending fresh send (duplicate UI).
        // Reload is skipped when a newer send superseded us or the user
        // already switched sessions (onlyIfCurrent).
        if (sendSessionId && abortControllerRef.current === abortController) {
          loadMessages(sendSessionId, { onlyIfCurrent: true });
        }
      } finally {
        cancelStreamingFlush();
        setStreamingContent("");
        setIsStreaming(false);
        setTruncationIndex(null);
        abortControllerRef.current = null;
        onMessageComplete?.();
        // D3: no refetch — the optimistic assistant message above is
        // authoritative. Server UUIDs arrive on next session load.
      }
    },
    [selectedProvider, selectedModel, onSessionCreated, onMessageComplete, cancelStreamingFlush, loadMessages]
  );

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!currentSessionIdRef.current) return;

      // Temp ids were never confirmed by the server — resend as a fresh
      // message instead of a truncate flow the server must reject.
      if (isTempId(messageId)) {
        await sendMessage(newContent);
        return;
      }

      const msgIndex = messagesRef.current.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      await sendMessage(newContent, {
        truncatePointMessageId: messageId,
        editContent: newContent,
        truncateIndex: msgIndex,
      });
    },
    [sendMessage]
  );

  const regenerateFrom = useCallback(
    async (messageId: string) => {
      if (!currentSessionIdRef.current) return;

      const msgs = messagesRef.current;
      const msgIndex = msgs.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      const targetMessage = msgs[msgIndex];

      if (targetMessage.role === "assistant") {
        const userMessage = msgs[msgIndex - 1];
        if (!userMessage || userMessage.role !== "user") return;

        // Unconfirmed parent id — resend fresh instead of truncating.
        if (isTempId(userMessage.id)) {
          await sendMessage(userMessage.content);
          return;
        }

        await sendMessage(userMessage.content, {
          truncatePointMessageId: userMessage.id,
          truncateIndex: msgIndex - 1,
        });
      } else if (targetMessage.role === "user") {
        if (isTempId(targetMessage.id)) {
          await sendMessage(targetMessage.content);
          return;
        }
        await sendMessage(targetMessage.content, {
          truncatePointMessageId: targetMessage.id,
          truncateIndex: msgIndex,
        });
      }
    },
    [sendMessage]
  );

  const clearMessages = useCallback(() => {
    cancelStreamingFlush();
    setMessages([]);
    setStreamingContent("");
    setLastUsage(null);
  }, [cancelStreamingFlush]);

  const setFeedback = useCallback(
    async (messageId: string, feedback: "like" | "dislike" | null) => {
      // Capture the pre-optimistic value so a failed PATCH truly rolls back.
      const previous = messagesRef.current.find((m) => m.id === messageId)?.feedback ?? null;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, feedback } : m
        )
      );

      try {
        const res = await fetch("/api/chat/feedback", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, feedback }),
        });
        if (!res.ok) throw new Error();
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, feedback: previous } : m
          )
        );
      }
    },
    []
  );

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
    setFeedback,
  };
}
