import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { chatSessions, messages } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

/**
 * GET /api/sessions/[id] — Fetch a session with its messages.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [chatSession] = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, id),
        eq(chatSessions.userId, session.user.id)
      )
    )
    .limit(1);

  if (!chatSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const sessionMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatSessionId, id))
    .orderBy(asc(messages.createdAt));

  return Response.json({
    session: chatSession,
    messages: sessionMessages,
  });
}

/**
 * PATCH /api/sessions/[id] — Update session (rename, pin/unpin, change provider).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const [chatSession] = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, id),
        eq(chatSessions.userId, session.user.id)
      )
    )
    .limit(1);

  if (!chatSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: Partial<{
    title: string;
    isPinned: boolean;
    modelProvider: string;
  }> = {};

  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.isPinned === "boolean") updates.isPinned = body.isPinned;
  if (typeof body.modelProvider === "string")
    updates.modelProvider = body.modelProvider;

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(chatSessions)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(chatSessions.id, id))
    .returning();

  return Response.json({ session: updated });
}

/**
 * DELETE /api/sessions/[id] — Delete a session (cascades to messages).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const [chatSession] = await db
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, id),
        eq(chatSessions.userId, session.user.id)
      )
    )
    .limit(1);

  if (!chatSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  await db.delete(chatSessions).where(eq(chatSessions.id, id));

  return Response.json({ success: true });
}
