import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { messages as messagesTable, chatSessions, usageLogs, users, userAiModels } from "@/lib/db/schema";
import { OpenAICompatibleGateway } from "@/lib/ai-providers/gateway-client";
import { decryptApiKey } from "@/lib/crypto";
import { assertBaseUrlAllowed, createNoRedirectFetch } from "@/lib/ssrf-guard";
import { checkThrottle, throttleResponse } from "@/lib/throttle";
import { redactSecrets } from "@/lib/redact";
import { eq, and, gt, asc, ne } from "drizzle-orm";
import type { TokenUsage, ReasoningEffort } from "@/lib/ai-providers/types";
import { isUuid } from "@/lib/validate-uuid";

/**
 * POST /api/chat — BYOK streaming chat endpoint.
 *
 * Pipeline:
 * 1. Auth check (server-side, not middleware-only — CVE-2025-29927)
 * 2. Load + ownership-check user's model config, decrypt key
 * 3. Input validation
 * 4. Upstream call with SSE streaming
 * 5. Usage logging on completion
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Unauthorized. Please sign in." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  const userId = session.user.id;

  // E3: generous anti-abuse ceiling (300/day) — BYOK keys stay unlimited
  // in spirit; this only stops runaway loops burning server resources.
  const day = new Date().toISOString().slice(0, 10);
  const chatThrottle = await checkThrottle(`chat:${userId}:${day}`, 300, 24 * 60 * 60 * 1000);
  if (!chatThrottle.allowed) return throttleResponse(chatThrottle);

  // Personalization context is loaded AFTER input validation (below).

  let body: {
    providerId: string;
    model?: string;
    messages: Array<{ role: string; content: string }>;
    chatSessionId?: string;
    truncatePointMessageId?: string;
    editContent?: string;
    temperature?: number;
    maxTokens?: number;
    reasoningEffort?: ReasoningEffort;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { providerId, messages: chatMessages, chatSessionId } = body;

  if (!providerId || !chatMessages?.length) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: providerId, messages.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!isUuid(providerId)) {
    return new Response(
      JSON.stringify({ error: "Unknown provider configuration." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // C1: strict allowlist validation BEFORE any DB query, so the
  // messages.role CHECK can never 500 and client roles can't spoof system.
  const chatBad = (msg: string) =>
    new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  if (!Array.isArray(chatMessages) || chatMessages.length < 1 || chatMessages.length > 100) {
    return chatBad("messages must contain 1..100 items.");
  }
  for (const m of chatMessages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return chatBad("Each message needs role 'user'|'assistant' and string content.");
    }
    if (m.content.length > 20000) {
      return chatBad("Message content too long (max 20000 characters).");
    }
  }
  const lastInbound = chatMessages[chatMessages.length - 1];
  if (lastInbound.role !== "user" || !lastInbound.content.trim()) {
    return chatBad("Last message must be a non-empty user message.");
  }
  if (
    body.temperature !== undefined &&
    !(typeof body.temperature === "number" && Number.isFinite(body.temperature) && body.temperature >= 0 && body.temperature <= 2)
  ) {
    return chatBad("temperature must be a number between 0 and 2.");
  }
  if (
    body.maxTokens !== undefined &&
    !(Number.isInteger(body.maxTokens) && body.maxTokens >= 1 && body.maxTokens <= 8192)
  ) {
    return chatBad("maxTokens must be an integer between 1 and 8192.");
  }
  if (
    body.reasoningEffort !== undefined &&
    body.reasoningEffort !== "low" &&
    body.reasoningEffort !== "medium" &&
    body.reasoningEffort !== "high" &&
    body.reasoningEffort !== "xhigh" &&
    body.reasoningEffort !== "none"
  ) {
    return chatBad("reasoningEffort must be 'low', 'medium', 'high', 'xhigh', or 'none'.");
  }
  if (
    body.editContent !== undefined &&
    (typeof body.editContent !== "string" || !body.editContent.trim() || body.editContent.length > 20000)
  ) {
    return chatBad("editContent must be 1..20000 characters.");
  }

  // Personalization context (server-injected, not client-spoofable).
  // E5: only when the user opted in via Settings → Profile.
  let displayName: string | null = null;
  let formattedDob: string | null = null;
  let shareProfile = false;

  const [userData] = await db
    .select({
      preferredName: users.preferredName,
      name: users.name,
      dateOfBirth: users.dateOfBirth,
      shareProfileWithAi: users.shareProfileWithAi,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userData) {
    shareProfile = userData.shareProfileWithAi ?? false;
    if (shareProfile) {
      // E5: neutralize quote/newline breakouts before interpolation.
      const rawName = userData.preferredName ?? userData.name ?? null;
      displayName = rawName?.replace(/["\\\r\n]/g, "").trim().slice(0, 50) || null;
      if (userData.dateOfBirth) {
        formattedDob = new Date(userData.dateOfBirth).toLocaleDateString("en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    }
  }

  const [providerConfig] = await db
    .select()
    .from(userAiModels)
    .where(and(eq(userAiModels.id, providerId), eq(userAiModels.userId, userId)))
    .limit(1);

  if (!providerConfig) {
    return new Response(
      JSON.stringify({ error: "Provider configuration not found." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(providerConfig.apiKeyEncrypted);
  } catch {
    return new Response(
      JSON.stringify({ error: "Stored API key is corrupted. Please save it again in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    await assertBaseUrlAllowed(providerConfig.baseUrl);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Blocked host." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const providerLabel = providerConfig.label;
  // The client chooses one of the provider's models; membership is enforced
  // so a leaked/guessed providerId can't be pointed at arbitrary models.
  // Falls back to the provider's first model for older clients.
  const configuredModels = Array.isArray(providerConfig.models) ? providerConfig.models : [];
  const requestedModel = typeof body.model === "string" ? body.model.trim() : "";
  if (requestedModel.length > 200) {
    return new Response(
      JSON.stringify({ error: "Model ID too long (max 200 characters)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (requestedModel && !configuredModels.includes(requestedModel)) {
    return new Response(
      JSON.stringify({ error: "Unknown model for this provider." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const modelId = requestedModel || configuredModels[0];
  if (!modelId) {
    return new Response(
      JSON.stringify({ error: "This provider has no models. Add one in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();
  const encoder = new TextEncoder();

  let sessionId = chatSessionId;
  let truncatePoint: Date | null = null;

  // A1: ownership-check a client-supplied session BEFORE any write.
  // Prevents cross-user message injection via guessed/leaked session UUIDs.
  if (sessionId) {
    if (!isUuid(sessionId)) {
      return new Response(
        JSON.stringify({ error: "Unknown chat session." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const [owned] = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
      .limit(1);
    if (!owned) {
      return new Response(
        JSON.stringify({ error: "Chat session not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  if (!sessionId) {
    const firstMessage = chatMessages.find((m) => m.role === "user")?.content ?? "New Chat";
    const title =
      firstMessage.length > 60
        ? firstMessage.substring(0, 57) + "..."
        : firstMessage;

    const [newSession] = await db
      .insert(chatSessions)
      .values({
        userId,
        title,
        modelProvider: `${providerLabel}/${modelId}`,
      })
      .returning({ id: chatSessions.id });

    sessionId = newSession.id;
  } else if (body.truncatePointMessageId) {
    if (!isUuid(body.truncatePointMessageId)) {
      return new Response(
        JSON.stringify({ error: "Please wait a moment for the chat to sync before editing." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const [existingMsg] = await db
      .select({ createdAt: messagesTable.createdAt })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.id, body.truncatePointMessageId),
          eq(messagesTable.chatSessionId, sessionId)
        )
      )
      .limit(1);

    if (!existingMsg || !existingMsg.createdAt) {
      return new Response(
        JSON.stringify({ error: "Truncation point message not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    truncatePoint = existingMsg.createdAt;
  }

  // Persist the user message if it's not a truncation/edit
  const userMsg = chatMessages[chatMessages.length - 1];
  let savedUserMessageId: string | null = body.truncatePointMessageId ?? null;
  if (!body.truncatePointMessageId) {
    const [savedUserMsg] = await db
      .insert(messagesTable)
      .values({
        chatSessionId: sessionId,
        role: "user",
        content: userMsg.content,
      })
      .returning({ id: messagesTable.id });
    savedUserMessageId = savedUserMsg.id;
  }

  await db
    .update(chatSessions)
    .set({ updatedAt: new Date(), modelProvider: `${providerLabel}/${modelId}` })
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)));

  // B1: abort propagation — Stop button / client disconnect must reach upstream.
  const upstreamController = new AbortController();
  const onRequestAbort = () => upstreamController.abort();
  if (request.signal.aborted) {
    upstreamController.abort();
  } else {
    request.signal.addEventListener("abort", onRequestAbort, { once: true });
  }

  const stream = new ReadableStream(
    {
      async start(controller) {
        // D6: yield to drain a full queue before enqueueing more.
        const drain = async () => {
          for (let i = 0; i < 50; i++) {
            let size: number | null = null;
            try {
              size = controller.desiredSize;
            } catch {
              return;
            }
            if (size === null || size > 0) return;
            await new Promise((r) => setTimeout(r, 0));
          }
        };
      let fullContent = "";
      let tokenUsage: TokenUsage | undefined;
      let hasError = false;
      let aborted = false;
      // Mirror the flag so post-stream DB writes can be skipped.
      const markAborted = () => { aborted = true; };
      upstreamController.signal.addEventListener("abort", markAborted, { once: true });
      if (upstreamController.signal.aborted) aborted = true;

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "session", sessionId })}\n\n`
        )
      );
      // Swap temp→real user id up front: the user row is already saved,
      // so the client stays correct even if upstream fails or aborts.
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "ids", userMessageId: savedUserMessageId, assistantMessageId: null })}\n\n`
        )
      );

      try {
        const provider = new OpenAICompatibleGateway({
          name: providerLabel,
          baseURL: providerConfig.baseUrl,
          apiKey,
          // A2: never follow upstream redirects (SSRF via 302 to metadata).
          fetchImpl: createNoRedirectFetch(),
        });

        const messagesForProvider: Array<{ role: "user" | "assistant" | "system"; content: string }> =
          // C1: only the tail goes upstream (cost + latency bound).
          chatMessages.slice(-50).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

        if (displayName || formattedDob) {
          const parts = [];
          if (displayName) parts.push(`The user's preferred name is ${displayName}.`);
          if (formattedDob) parts.push(`Their date of birth is ${formattedDob}.`);
          parts.push("Use this context naturally where relevant (e.g. if they mention their age or birthday); don't bring it up unprompted in every message.");

          const personalizationInstruction = parts.join(" ");

          const existingSystemIdx = messagesForProvider.findIndex((m) => m.role === "system");
          if (existingSystemIdx >= 0) {
            messagesForProvider[existingSystemIdx] = {
              ...messagesForProvider[existingSystemIdx],
              content: personalizationInstruction + "\n\n" + messagesForProvider[existingSystemIdx].content,
            };
          } else {
            messagesForProvider.unshift({
              role: "system",
              content: personalizationInstruction,
            });
          }
        }

        const chatStream = provider.streamChat({
          model: modelId,
          messages: messagesForProvider,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          reasoningEffort: body.reasoningEffort,
          signal: upstreamController.signal,
        });

        for await (const chunk of chatStream) {
          if (chunk.type === "text" && chunk.content) {
            fullContent += chunk.content;
            await drain();
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          } else if (chunk.type === "done") {
            tokenUsage = chunk.usage;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          } else if (chunk.type === "error") {
            hasError = true;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          }
        }
      } catch (err) {
        hasError = true;
        // E6: generic client message; details stay server-side, redacted.
        console.error(
          "[chat] stream failure:",
          err instanceof Error ? redactSecrets(err.message).slice(0, 300) : err
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: "Upstream rejected the request." })}\n\n`
          )
        );
      }

      const latencyMs = Date.now() - startTime;
      request.signal.removeEventListener("abort", onRequestAbort);

      // B1: user-stopped generations persist the user message only —
      // no half assistant row, no fake "success" usage log.
      if (aborted || upstreamController.signal.aborted) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      if (fullContent && !hasError) {
        if (body.truncatePointMessageId && truncatePoint) {
          await db.delete(messagesTable)
            .where(
              and(
                eq(messagesTable.chatSessionId, sessionId!),
                gt(messagesTable.createdAt, truncatePoint),
                ne(messagesTable.id, body.truncatePointMessageId)
              )
            );

          if (body.editContent) {
            await db.update(messagesTable)
              .set({ content: body.editContent })
              .where(eq(messagesTable.id, body.truncatePointMessageId));

            const [firstMsg] = await db
              .select({ id: messagesTable.id })
              .from(messagesTable)
              .where(eq(messagesTable.chatSessionId, sessionId!))
              .orderBy(asc(messagesTable.createdAt))
              .limit(1);

            if (firstMsg && firstMsg.id === body.truncatePointMessageId) {
              const newTitle = body.editContent.length > 60
                ? body.editContent.substring(0, 57) + "..."
                : body.editContent;
              await db.update(chatSessions)
                .set({ title: newTitle })
                .where(and(eq(chatSessions.id, sessionId!), eq(chatSessions.userId, userId)));
            }
          }
        }

        const [savedAssistantMsg] = await db
          .insert(messagesTable)
          .values({
            chatSessionId: sessionId!,
            role: "assistant",
            content: fullContent,
            provider: providerLabel,
            model: modelId,
          })
          .returning({ id: messagesTable.id });

        // D3: tell the client the real DB ids so it can swap its
        // optimistic temp ids without a refetch round-trip.
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "ids",
              userMessageId: savedUserMessageId,
              assistantMessageId: savedAssistantMsg.id,
            })}\n\n`
          )
        );

        await db.insert(usageLogs).values({
          userId,
          messageId: savedAssistantMsg.id,
          provider: providerLabel,
          model: modelId,
          promptTokens: tokenUsage?.promptTokens ?? 0,
          completionTokens: tokenUsage?.completionTokens ?? 0,
          latencyMs,
          status: "success",
        });
      } else {
        await db.insert(usageLogs).values({
          userId,
          messageId: null,
          provider: providerLabel,
          model: modelId,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs,
          status: "error",
        });
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
    cancel() {
      // Client stopped reading (Stop button) — kill the upstream call.
      upstreamController.abort();
    },
    // D6: explicit (small) queue bound for fast upstreams.
  },
  { highWaterMark: 10 });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      // Chat transcripts are sensitive: never store (not just revalidate).
      "Cache-Control": "private, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
