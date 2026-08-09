import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { chatSessions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/sessions — List user's chat sessions.
 * Returns sessions ordered by pinned first, then updated_at DESC.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, session.user.id))
    .orderBy(desc(chatSessions.isPinned), desc(chatSessions.updatedAt));

  return Response.json({ sessions });
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
