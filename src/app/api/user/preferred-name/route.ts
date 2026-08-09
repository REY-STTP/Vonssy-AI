import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/user/preferred-name
 * Update the authenticated user's preferred name (nickname).
 * Trims whitespace; empty string clears back to NULL (OAuth fallback).
 * Max 50 characters after trim.
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { preferredName?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.preferredName !== "string") {
    return Response.json(
      { error: "preferredName must be a string." },
      { status: 400 }
    );
  }

  const trimmed = body.preferredName.trim();

  if (trimmed.length > 50) {
    return Response.json(
      { error: "Preferred name must be 50 characters or fewer." },
      { status: 400 }
    );
  }

  // Empty string → NULL (clear back to OAuth default)
  const valueToStore = trimmed.length > 0 ? trimmed : null;

  const [updated] = await db
    .update(users)
    .set({ preferredName: valueToStore })
    .where(eq(users.id, session.user.id))
    .returning({ preferredName: users.preferredName });

  return Response.json({
    preferredName: updated?.preferredName ?? null,
  });
}
