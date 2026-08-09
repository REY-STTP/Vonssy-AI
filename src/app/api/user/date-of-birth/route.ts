import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/user/date-of-birth
 * Update the authenticated user's date of birth.
 * Accepts ISO date string "YYYY-MM-DD" or null to clear.
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { dateOfBirth?: string | null };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // null is valid — clears the date
  if (body.dateOfBirth === null || body.dateOfBirth === "") {
    const [updated] = await db
      .update(users)
      .set({ dateOfBirth: null })
      .where(eq(users.id, session.user.id))
      .returning({ dateOfBirth: users.dateOfBirth });

    return Response.json({ dateOfBirth: updated?.dateOfBirth ?? null });
  }

  if (typeof body.dateOfBirth !== "string") {
    return Response.json(
      { error: "dateOfBirth must be a string (YYYY-MM-DD) or null." },
      { status: 400 }
    );
  }

  // Validate format and date validity
  const dateStr = body.dateOfBirth.trim();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return Response.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const parsed = new Date(dateStr + "T00:00:00Z");
  if (isNaN(parsed.getTime())) {
    return Response.json(
      { error: "Invalid calendar date." },
      { status: 400 }
    );
  }

  // Reject future dates
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsed > today) {
    return Response.json(
      { error: "Date of birth cannot be in the future." },
      { status: 400 }
    );
  }

  // Reject unreasonably old dates
  if (parsed.getFullYear() < 1900) {
    return Response.json(
      { error: "Please enter a valid date of birth." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(users)
    .set({ dateOfBirth: dateStr })
    .where(eq(users.id, session.user.id))
    .returning({ dateOfBirth: users.dateOfBirth });

  return Response.json({
    dateOfBirth: updated?.dateOfBirth ?? null,
  });
}
