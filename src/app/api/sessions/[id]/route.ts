import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { chatSessions, messages } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { isUuid } from "@/lib/validate-uuid";

// D6: per-user mutable data — never cache.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/sessions/[id] — Fetch a session with its messages.
 *
 * Query params (D2):
 *   ?limit=N            — max messages (default 100, max 200)
 *   ?before=ISO_uuid    — keyset cursor for older messages
 * Returns the TAIL of the thread (newest `limit`), ascending.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return Response.json({ error: "Invalid session id." }, { status: 400 });
  }

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

  // D2: bounded tail with keyset cursor — never the whole thread.
  const limitParam = request.nextUrl.searchParams.get("limit");
  let limit = 100;
  if (limitParam !== null) {
    const n = Number(limitParam);
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      return Response.json({ error: "limit must be an integer 1..200." }, { status: 400 });
    }
    limit = n;
  }
  const msgConditions = [eq(messages.chatSessionId, id)];
  const beforeParam = request.nextUrl.searchParams.get("before");
  if (beforeParam) {
    const sep = beforeParam.lastIndexOf("_");
    if (sep > 0) {
      const beforeTs = beforeParam.substring(0, sep);
      const beforeId = beforeParam.substring(sep + 1);
      const ts = new Date(beforeTs);
      if (Number.isNaN(ts.getTime()) || !isUuid(beforeId)) {
        return Response.json({ error: "Invalid before cursor." }, { status: 400 });
      }
      msgConditions.push(
        sql`(${messages.createdAt}, ${messages.id}) < (${beforeTs}::timestamptz, ${beforeId}::uuid)`
      );
    }
  }

  const sessionMessages = (
    await db
      .select()
      .from(messages)
      .where(and(...msgConditions))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit)
  ).reverse();

  return Response.json(
    {
      session: chatSession,
      messages: sessionMessages,
    },
    { headers: NO_STORE }
  );
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
  if (!isUuid(id)) {
    return Response.json({ error: "Invalid session id." }, { status: 400 });
  }

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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed =
    typeof raw === "object" && raw !== null
      ? (raw as { title?: unknown; isPinned?: unknown; modelProvider?: unknown })
      : {};
  const updates: Partial<{
    title: string;
    isPinned: boolean;
    modelProvider: string;
  }> = {};

  // C2: length caps (DB bloat / UI breakage guard).
  if (typeof parsed.title === "string") updates.title = parsed.title.slice(0, 120);
  if (typeof parsed.isPinned === "boolean") updates.isPinned = parsed.isPinned;
  if (typeof parsed.modelProvider === "string")
    updates.modelProvider = parsed.modelProvider.slice(0, 200);

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(chatSessions)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, session.user.id)))
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
  if (!isUuid(id)) {
    return Response.json({ error: "Invalid session id." }, { status: 400 });
  }

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

  await db
    .delete(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, session.user.id)));

  return Response.json({ success: true });
}
