import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { messages, chatSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * PATCH /api/chat/feedback — Update feedback (like/dislike) on a message.
 *
 * Body: { messageId: string, feedback: "like" | "dislike" | null }
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { messageId, feedback } = body;

  if (!messageId || typeof messageId !== "string") {
    return Response.json({ error: "messageId is required" }, { status: 400 });
  }

  if (feedback !== "like" && feedback !== "dislike" && feedback !== null) {
    return Response.json(
      { error: "feedback must be 'like', 'dislike', or null" },
      { status: 400 }
    );
  }

  // Verify ownership: message → chatSession → user
  const [msg] = await db
    .select({
      id: messages.id,
      chatSessionId: messages.chatSessionId,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!msg) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  const [chatSession] = await db
    .select({ userId: chatSessions.userId })
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, msg.chatSessionId),
        eq(chatSessions.userId, session.user.id)
      )
    )
    .limit(1);

  if (!chatSession) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  // Update feedback
  const [updated] = await db
    .update(messages)
    .set({ feedback })
    .where(eq(messages.id, messageId))
    .returning({ id: messages.id, feedback: messages.feedback });

  return Response.json({ message: updated });
}
