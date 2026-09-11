import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { messages as messagesTable, chatSessions, usageLogs, users, userAiModels } from "@/lib/db/schema";
import { OpenAICompatibleGateway } from "@/lib/ai-providers/gateway-client";
import { decryptApiKey } from "@/lib/crypto";
import { assertBaseUrlAllowed } from "@/lib/ssrf-guard";
import { eq, and, gt, asc, ne } from "drizzle-orm";
import type { TokenUsage } from "@/lib/ai-providers/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  // Fetch user's preferred name and DOB for AI personalization
  let displayName: string | null = null;
  let formattedDob: string | null = null;

  const [userData] = await db
    .select({
      preferredName: users.preferredName,
      name: users.name,
      dateOfBirth: users.dateOfBirth,
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
        year: "numeric",
      });
    }
  }

  let body: {
    modelConfigId: string;
    messages: Array<{ role: string; content: string }>;
    chatSessionId?: string;
    truncatePointMessageId?: string;
    editContent?: string;
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

  const { modelConfigId, messages: chatMessages, chatSessionId } = body;

  if (!modelConfigId || !chatMessages?.length) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: modelConfigId, messages.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!UUID_RE.test(modelConfigId)) {
    return new Response(
      JSON.stringify({ error: "Unknown model configuration." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const [modelConfig] = await db
    .select()
    .from(userAiModels)
    .where(and(eq(userAiModels.id, modelConfigId), eq(userAiModels.userId, userId)))
    .limit(1);

  if (!modelConfig) {
    return new Response(
      JSON.stringify({ error: "Model configuration not found." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(modelConfig.apiKeyEncrypted);
  } catch {
    return new Response(
      JSON.stringify({ error: "Stored API key is corrupted. Please save it again in Settings." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    await assertBaseUrlAllowed(modelConfig.baseUrl);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Blocked host." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const providerLabel = modelConfig.label;
  const modelId = modelConfig.model;

  const startTime = Date.now();
  const encoder = new TextEncoder();

  let sessionId = chatSessionId;
  let truncatePoint: Date | null = null;

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
    const isUuid = UUID_RE.test(body.truncatePointMessageId);
    if (!isUuid) {
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

  const userMsg = chatMessages[chatMessages.length - 1];
  if (!body.truncatePointMessageId) {
    await db
      .insert(messagesTable)
      .values({
        chatSessionId: sessionId,
        role: "user",
        content: userMsg.content,
      });
  }

  await db
    .update(chatSessions)
    .set({ updatedAt: new Date(), modelProvider: `${providerLabel}/${modelId}` })
    .where(eq(chatSessions.id, sessionId));

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      let tokenUsage: TokenUsage | undefined;
      let hasError = false;

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "session", sessionId })}\n\n`
        )
      );

      try {
        const provider = new OpenAICompatibleGateway({
          name: providerLabel,
          baseURL: modelConfig.baseUrl,
          apiKey,
        });

        const messagesForProvider: Array<{ role: "user" | "assistant" | "system"; content: string }> =
          chatMessages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }));

        if (displayName || formattedDob) {
          const parts = [];
          if (displayName) parts.push(`The user's preferred name is "${displayName}".`);
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
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
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

      const latencyMs = Date.now() - startTime;

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
                .where(eq(chatSessions.id, sessionId!));
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
