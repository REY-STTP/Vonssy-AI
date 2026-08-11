import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { chatSessions } from "@/lib/db/schema";
import { eq, desc, and, sql, ilike } from "drizzle-orm";
import { ALL_CHATS_PAGE_SIZE } from "@/lib/constants";

/**
 * GET /api/sessions/all — Cursor-paginated session list for "All Chats" overlay.
 *
 * Query params:
 *   ?cursor={updatedAt}_{id}  — Cursor for pagination (omit for first page)
 *   ?limit=N                  — Page size (default: ALL_CHATS_PAGE_SIZE)
 *   ?search={query}           — Title search (ILIKE)
 *   ?filter=all|pinned        — Filter by pin status (default: all)
 *
 * Response: { sessions: [...], nextCursor: string | null }
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const cursorParam = params.get("cursor");
  const limitParam = params.get("limit");
  const searchParam = params.get("search");
  const filterParam = params.get("filter") || "all";

  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : ALL_CHATS_PAGE_SIZE;

  // Build WHERE conditions
  const conditions = [eq(chatSessions.userId, session.user.id)];

  // Filter
  if (filterParam === "pinned") {
    conditions.push(eq(chatSessions.isPinned, true));
  }

  // Search
  if (searchParam && searchParam.trim().length > 0) {
    conditions.push(ilike(chatSessions.title, `%${searchParam.trim()}%`));
  }

  // Cursor: (updated_at, id) < (cursor_ts, cursor_id)
  if (cursorParam) {
    const separatorIndex = cursorParam.lastIndexOf("_");
    if (separatorIndex > 0) {
      const cursorTs = cursorParam.substring(0, separatorIndex);
      const cursorId = cursorParam.substring(separatorIndex + 1);
      conditions.push(
        sql`(${chatSessions.updatedAt}, ${chatSessions.id}) < (${cursorTs}::timestamptz, ${cursorId}::uuid)`
      );
    }
  }

  const rows = await db
    .select()
    .from(chatSessions)
    .where(and(...conditions))
    .orderBy(desc(chatSessions.updatedAt), desc(chatSessions.id))
    .limit(limit + 1); // Fetch one extra to determine if there's a next page

  const hasMore = rows.length > limit;
  const sessions = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && sessions.length > 0) {
    const last = sessions[sessions.length - 1];
    const ts = last.updatedAt ? new Date(last.updatedAt).toISOString() : "";
    nextCursor = `${ts}_${last.id}`;
  }

  return Response.json({ sessions, nextCursor });
}
