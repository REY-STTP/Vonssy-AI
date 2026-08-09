import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { messages as messagesTable, chatSessions, usageLogs, users } from "@/lib/db/schema";
import { getProvider, isValidGateway, getModelEntry } from "@/lib/ai-providers";
import { checkRateLimit, incrementRateLimit } from "@/lib/rate-limit";
import { eq, sql } from "drizzle-orm";
import type { StreamChunk, TokenUsage } from "@/lib/ai-providers/types";

/**
 * POST /api/chat — Streaming chat endpoint.
 *
 * Pipeline per Section 4:
 * 1. Auth check (server-side, not middleware-only — CVE-2025-29927)
 * 2. Input validation
 * 3. Rate limit check (short-circuit before gateway call)
 * 4. Gateway call with SSE streaming
 * 5. Usage logging on completion
 * 6. Rate limit increment on success
 */
export async function POST(request: NextRequest) {
  // ── 1. Auth Check ─────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Unauthorized. Please sign in." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  const userId = session.user.id;

  // Fetch user's preferred name and DOB for AI personalization
  let displayName: string | null = null;
  let formattedDob: string | null = null;
  
  const [userData] = await db
    .select({ 
      preferredName: users.preferredName, 
      name: users.name,
      dateOfBirth: users.dateOfBirth 
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
  if (userData) {
    displayName = userData.preferredName ?? userData.name ?? null;
    if (userData.dateOfBirth) {
      formattedDob = new Date(userData.dateOfBirth).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }
  }

  // ── 2. Input Validation ───────────────────────────────────
  let body: {
    gateway: string;
    model: string;
    messages: Array<{ role: string; content: string }>;
    chatSessionId?: string;
    temperature?: number;
    maxTokens?: number;
    reasoningEffort?: "low" | "medium" | "high";
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { gateway, model, messages: chatMessages, chatSessionId } = body;

  if (!gateway || !model || !chatMessages?.length) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: gateway, model, messages.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!isValidGateway(gateway)) {
    return new Response(
      JSON.stringify({ error: `Unknown gateway: ${gateway}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 3. Rate Limit Check ───────────────────────────────────
  const rateLimitResult = await checkRateLimit(userId, gateway, model);
  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: rateLimitResult.error,
        remaining: rateLimitResult.remaining,
        limit: rateLimitResult.limit,
        resetAt: rateLimitResult.resetAt,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 4. Gateway Call with SSE Streaming ────────────────────
  const startTime = Date.now();
  const encoder = new TextEncoder();

  // Create or use existing chat session
  let sessionId = chatSessionId;
  if (!sessionId) {
    // Auto-create a new chat session
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
        modelProvider: `${gateway}/${model}`,
      })
      .returning({ id: chatSessions.id });

    sessionId = newSession.id;
  }

  // Persist the user message
  const userMsg = chatMessages[chatMessages.length - 1];
  const [savedUserMsg] = await db
    .insert(messagesTable)
    .values({
      chatSessionId: sessionId,
      role: "user",
      content: userMsg.content,
    })
    .returning({ id: messagesTable.id });

  // Update session timestamp
  await db
    .update(chatSessions)
    .set({ updatedAt: new Date(), modelProvider: `${gateway}/${model}` })
    .where(eq(chatSessions.id, sessionId));

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      let tokenUsage: TokenUsage | undefined;
      let hasError = false;

      // Send the session ID first so the client can track it
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "session", sessionId })}\n\n`
        )
      );

      try {
        const provider = getProvider(gateway);

        // Build messages array with optional system-level name instruction
        const messagesForProvider: Array<{ role: "user" | "assistant" | "system"; content: string }> =
          chatMessages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }));

        // Inject personalization context as system instruction (server-side only, can't be spoofed)
        if (displayName || formattedDob) {
          const parts = [];
          if (displayName) parts.push(`The user's preferred name is "${displayName}".`);
          if (formattedDob) parts.push(`Their date of birth is ${formattedDob}.`);
          parts.push("Use this context naturally where relevant (e.g. if they mention their age or birthday); don't bring it up unprompted in every message.");

          const personalizationInstruction = parts.join(" ");

          const existingSystemIdx = messagesForProvider.findIndex((m) => m.role === "system");
          if (existingSystemIdx >= 0) {
            // Merge into existing system message
            messagesForProvider[existingSystemIdx] = {
              ...messagesForProvider[existingSystemIdx],
              content: personalizationInstruction + "\n\n" + messagesForProvider[existingSystemIdx].content,
            };
          } else {
            // Prepend as new system message
            messagesForProvider.unshift({
              role: "system",
              content: personalizationInstruction,
            });
          }
        }

        const chatStream = provider.streamChat({
          model,
          messages: messagesForProvider,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          reasoningEffort: body.reasoningEffort,
        });

        for await (const chunk of chatStream) {
          if (chunk.type === "text" && chunk.content) {
            fullContent += chunk.content;
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

            // If rate limited by upstream, try fallback
            if (chunk.isRateLimited) {
              const catalogEntry = getModelEntry(gateway, model);
              if (catalogEntry?.fallbackGateway && catalogEntry?.fallbackModel) {
                // Notify client we're trying fallback
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "text",
                      content: "\n\n_Switching to fallback provider..._\n\n",
                    })}\n\n`
                  )
                );

                const fallbackProvider = getProvider(catalogEntry.fallbackGateway);
                const fallbackStream = fallbackProvider.streamChat({
                  model: catalogEntry.fallbackModel,
                  messages: messagesForProvider,
                  temperature: body.temperature,
                  maxTokens: body.maxTokens,
                });

                for await (const fallbackChunk of fallbackStream) {
                  if (fallbackChunk.type === "text" && fallbackChunk.content) {
                    fullContent += fallbackChunk.content;
                    hasError = false;
                  }
                  if (fallbackChunk.type === "done") {
                    tokenUsage = fallbackChunk.usage;
                    hasError = false;
                  }
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify(fallbackChunk)}\n\n`
                    )
                  );
                }
              } else {
                // No fallback configured — surface the error
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "error",
                      error:
                        "This model is temporarily at capacity. Try selecting a different model.",
                    })}\n\n`
                  )
                );
              }
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
              );
            }
          }
        }
      } catch (err) {
        hasError = true;
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`
          )
        );
      }

      // ── 5. Persist assistant message & log usage ────────
      const latencyMs = Date.now() - startTime;

      if (fullContent) {
        const [savedAssistantMsg] = await db
          .insert(messagesTable)
          .values({
            chatSessionId: sessionId!,
            role: "assistant",
            content: fullContent,
            provider: gateway,
            model: model,
          })
          .returning({ id: messagesTable.id });

        // Log usage (independent from messages per Section 5)
        await db.insert(usageLogs).values({
          userId,
          messageId: savedAssistantMsg.id,
          provider: gateway,
          model: model,
          promptTokens: tokenUsage?.promptTokens ?? 0,
          completionTokens: tokenUsage?.completionTokens ?? 0,
          latencyMs,
          status: hasError ? "error" : "success",
        });
      } else {
        // Log failed attempt even without content
        await db.insert(usageLogs).values({
          userId,
          messageId: null,
          provider: gateway,
          model: model,
          promptTokens: 0,
          completionTokens: 0,
          latencyMs,
          status: "error",
        });
      }

      // ── 6. Increment rate limit on success ──────────────
      if (!hasError && fullContent) {
        await incrementRateLimit(userId, gateway, model);
      }

      // Send the [DONE] sentinel and close
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
