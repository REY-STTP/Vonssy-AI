import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { messages, chatSessions } from "@/lib/db/schema";
import { isUuid } from "@/lib/validate-uuid";
import { eq, and, gt } from "drizzle-orm";

/**
 * PATCH /api/sessions/[id]/messages — Edit a message.
 * For "edit + regenerate": the client edits the user message,
 * then deletes all messages after it and re-sends to /api/chat.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  if (!isUuid(sessionId)) {
    return Response.json({ error: "Invalid session id." }, { status: 400 });
  }

  // Verify session ownership
  const [chatSession] = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, session.user.id)
      )
    )
    .limit(1);

  if (!chatSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed =
    typeof raw === "object" && raw !== null
      ? (raw as { messageId?: unknown; content?: unknown })
      : {};
  const { messageId, content } = parsed;

  if (typeof messageId !== "string" || !isUuid(messageId)) {
    return Response.json({ error: "Invalid messageId." }, { status: 400 });
  }
  if (typeof content !== "string" || !content.trim()) {
    return Response.json(
      { error: "messageId and non-empty content are required" },
      { status: 400 }
    );
  }
  // C2: length cap.
  if (content.length > 20000) {
    return Response.json(
      { error: "content too long (max 20000 characters)" },
      { status: 400 }
    );
  }

  // Verify message belongs to this session
  const [message] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.chatSessionId, sessionId)
      )
    )
    .limit(1);

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  // Update the message content
  await db
    .update(messages)
    .set({ content })
    .where(eq(messages.id, messageId));

  // Delete all messages after this one (for regenerate)
  await db
    .delete(messages)
    .where(
      and(
        eq(messages.chatSessionId, sessionId),
        gt(messages.createdAt, message.createdAt!)
      )
    );

  return Response.json({ success: true });
}

/**
 * DELETE /api/sessions/[id]/messages — Delete a specific message
 * and all subsequent messages (for "regenerate from here").
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;
  if (!isUuid(sessionId)) {
    return Response.json({ error: "Invalid session id." }, { status: 400 });
  }

  // Verify session ownership
  const [chatSession] = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, session.user.id)
      )
    )
    .limit(1);

  if (!chatSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("messageId");

  if (!messageId || !isUuid(messageId)) {
    return Response.json(
      { error: "Valid messageId query param is required" },
      { status: 400 }
    );
  }

  const [message] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.chatSessionId, sessionId)
      )
    )
    .limit(1);

  if (!message) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  // Delete this message and all after it
  await db
    .delete(messages)
    .where(
      and(
        eq(messages.chatSessionId, sessionId),
        gt(messages.createdAt, message.createdAt!)
      )
    );

  // Also delete the target message itself
  await db.delete(messages).where(eq(messages.id, messageId));

  return Response.json({ success: true });
}
