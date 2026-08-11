import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { chatSessions } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * GET /api/sessions — List user's chat sessions.
 *
 * Optional query params:
 *   ?limit=N — Return all pinned sessions + N most recent unpinned sessions.
 *              Without limit, returns all sessions (existing behavior).
 *
 * Sessions are ordered: pinned first (by updated_at DESC), then unpinned (by updated_at DESC).
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : null;

  if (limit && limit > 0) {
    // Pinned sessions always show (no limit)
    const pinned = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, session.user.id),
          eq(chatSessions.isPinned, true)
        )
      )
      .orderBy(desc(chatSessions.updatedAt));

    // Most recent unpinned sessions (capped)
    const unpinned = await db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.userId, session.user.id),
          sql`(${chatSessions.isPinned} = false OR ${chatSessions.isPinned} IS NULL)`
        )
      )
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit);

    return Response.json({ sessions: [...pinned, ...unpinned] });
  }

  // No limit — return all sessions (existing behavior)
  const allSessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, session.user.id))
    .orderBy(desc(chatSessions.isPinned), desc(chatSessions.updatedAt));

  return Response.json({ sessions: allSessions });
}

/**
 * POST /api/sessions — Create a new chat session.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: string; modelProvider?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — defaults will be used
  }

  const [newSession] = await db
    .insert(chatSessions)
    .values({
      userId: session.user.id,
      title: body.title || "New Chat",
      modelProvider: body.modelProvider,
    })
    .returning();

  return Response.json({ session: newSession }, { status: 201 });
}

