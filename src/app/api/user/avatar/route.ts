import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_STYLES = ["croodles-neutral", "lorelei-neutral", "notionists-neutral"] as const;
type AvatarStyle = (typeof ALLOWED_STYLES)[number];

/**
 * PATCH /api/user/avatar
 * Update the authenticated user's avatar preference.
 *
 * Body:
 *   { source: "oauth" }
 *   | { source: "generated", style: AvatarStyle, seed: string }
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { source: string; style?: string; seed?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { source } = body;

  if (source !== "oauth" && source !== "generated") {
    return Response.json(
      { error: "source must be 'oauth' or 'generated'." },
      { status: 400 }
    );
  }

  if (source === "oauth") {
    const [updated] = await db
      .update(users)
      .set({
        avatarSource: "oauth",
        avatarStyle: null,
        avatarSeed: null,
      })
      .where(eq(users.id, session.user.id))
      .returning({
        avatarSource: users.avatarSource,
        avatarStyle: users.avatarStyle,
        avatarSeed: users.avatarSeed,
      });

    return Response.json(updated);
  }

  // source === "generated"
  const { style, seed } = body;

  if (!style || !ALLOWED_STYLES.includes(style as AvatarStyle)) {
    return Response.json(
      { error: `style must be one of: ${ALLOWED_STYLES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!seed || typeof seed !== "string" || seed.trim().length === 0) {
    return Response.json(
      { error: "seed must be a non-empty string." },
      { status: 400 }
    );
  }

  if (seed.length > 100) {
    return Response.json(
      { error: "seed must be 100 characters or fewer." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(users)
    .set({
      avatarSource: "generated",
      avatarStyle: style,
      avatarSeed: seed.trim(),
    })
    .where(eq(users.id, session.user.id))
    .returning({
      avatarSource: users.avatarSource,
      avatarStyle: users.avatarStyle,
      avatarSeed: users.avatarSeed,
    });

  return Response.json(updated);
}
