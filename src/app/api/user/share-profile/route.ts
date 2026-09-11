import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/user/share-profile — opt in/out of sending name + date of
 * birth to the user's own AI endpoint (E5, default off).
 * Body: { shareProfileWithAi: boolean }
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const flag =
    typeof raw === "object" && raw !== null
      ? (raw as { shareProfileWithAi?: unknown }).shareProfileWithAi
      : undefined;
  if (typeof flag !== "boolean") {
    return Response.json(
      { error: "shareProfileWithAi must be a boolean." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(users)
    .set({ shareProfileWithAi: flag })
    .where(eq(users.id, session.user.id))
    .returning({ shareProfileWithAi: users.shareProfileWithAi });

  return Response.json({ shareProfileWithAi: updated?.shareProfileWithAi ?? flag });
}
