import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { chatSessions } from "@/lib/db/schema";
import { checkThrottle, throttleResponse } from "@/lib/throttle";
import { eq, desc, and, sql } from "drizzle-orm";

// D6: session lists are per-user mutable data — never cache.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/sessions — List user's chat sessions.
 *
 * Optional query params:
 *   ?limit=N — Return all pinned sessions + N most recent unpinned sessions
 *              (integer 1..100; default 50 when omitted — never unlimited).
 *
 * Sessions are ordered: pinned first (by updated_at DESC), then unpinned (by updated_at DESC).
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  let limit: number | null = null;
  if (limitParam !== null) {
    const n = Number(limitParam);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      return Response.json({ error: "limit must be an integer 1..100." }, { status: 400 });
    }
    limit = n;
  }
  // D2: never unlimited — default 50 recent unpinned (+ all pinned).
  const effective = Math.min(limit ?? 50, 100);

  {
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
      .limit(effective);

    return Response.json({ sessions: [...pinned, ...unpinned] }, { headers: NO_STORE });
  }
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

  // E3: cap manual session creation (auto-create via /api/chat unaffected).
  const day = new Date().toISOString().slice(0, 10);
  const sessionThrottle = await checkThrottle(
    `sessions:${session.user.id}:${day}`,
    50,
    24 * 60 * 60 * 1000
  );
  if (!sessionThrottle.allowed) return throttleResponse(sessionThrottle);

  // C2: length caps (DB bloat / UI breakage guard). Non-strings are
  // rejected instead of crashing on .slice (500).
  const title = body.title === undefined || body.title === null ? "New Chat" : body.title;
  const modelProvider = body.modelProvider === undefined || body.modelProvider === null
    ? undefined
    : body.modelProvider;
  if (typeof title !== "string" || (modelProvider !== undefined && typeof modelProvider !== "string")) {
    return Response.json({ error: "title and modelProvider must be strings." }, { status: 400 });
  }
  const [newSession] = await db
    .insert(chatSessions)
    .values({
      userId: session.user.id,
      title: (title || "New Chat").slice(0, 120),
      modelProvider: modelProvider?.slice(0, 200),
    })
    .returning();

  return Response.json({ session: newSession }, { status: 201 });
}

