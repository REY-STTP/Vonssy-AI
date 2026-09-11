import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users, chatSessions, messages, userAiModels } from "@/lib/db/schema";
import { eq, asc, inArray } from "drizzle-orm";

/**
 * GET /api/user — Export user's chat history as JSON.
 * Per Section 10: "user can export their own chat history"
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // D1: two queries total (was 1+N) — sessions, then all messages at once.
  const sessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(asc(chatSessions.createdAt));

  const sessionIds = sessions.map((s) => s.id);
  const allMsgs =
    sessionIds.length > 0
      ? await db
          .select()
          .from(messages)
          .where(inArray(messages.chatSessionId, sessionIds))
          .orderBy(asc(messages.createdAt))
      : [];

  const msgsBySession = new Map<string, typeof allMsgs>();
  for (const m of allMsgs) {
    const list = msgsBySession.get(m.chatSessionId);
    if (list) list.push(m);
    else msgsBySession.set(m.chatSessionId, [m]);
  }

  const exportData = sessions.map((s) => {
    const msgs = msgsBySession.get(s.id) ?? [];
    return {
      session: {
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      },
      messages: msgs.map((m) => ({
        role: m.role,
        content: m.content,
        provider: m.provider,
        model: m.model,
        createdAt: m.createdAt,
      })),
    };
  });

  const modelConfigs = await db
    .select({
      label: userAiModels.label,
      baseUrl: userAiModels.baseUrl,
      model: userAiModels.model,
    })
    .from(userAiModels)
    .where(eq(userAiModels.userId, userId))
    .orderBy(asc(userAiModels.createdAt));

  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), models: modelConfigs, data: exportData }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="vonssy-ai-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}

/**
 * DELETE /api/user — Delete user account.
 * Per Section 5/10: cascades through chat_sessions → messages → usage_logs
 * via ON DELETE CASCADE/SET NULL.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.delete(users).where(eq(users.id, session.user.id));

  return Response.json({ success: true, message: "Account deleted." });
}
