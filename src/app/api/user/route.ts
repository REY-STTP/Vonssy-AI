import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users, chatSessions, messages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

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

  // Fetch all sessions with their messages
  const sessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(asc(chatSessions.createdAt));

  const exportData = await Promise.all(
    sessions.map(async (s) => {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.chatSessionId, s.id))
        .orderBy(asc(messages.createdAt));

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
    })
  );

  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), data: exportData }, null, 2), {
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
