import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { userAiModels } from "@/lib/db/schema";
import { encryptApiKey } from "@/lib/crypto";
import {
  maskApiKey,
  normalizeBaseUrl,
  validateApiKey,
  validateLabel,
  validateModelIds,
} from "@/lib/user-providers/validation";
import { eq, and, desc, sql } from "drizzle-orm";
import { assertBaseUrlAllowed } from "@/lib/ssrf-guard";

// D6: per-user mutable data — never cache.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

const MAX_PER_USER = 50;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: userAiModels.id,
      label: userAiModels.label,
      baseUrl: userAiModels.baseUrl,
      apiKeyHint: userAiModels.apiKeyHint,
      models: userAiModels.models,
      createdAt: userAiModels.createdAt,
      updatedAt: userAiModels.updatedAt,
    })
    .from(userAiModels)
    .where(eq(userAiModels.userId, session.user.id))
    .orderBy(desc(userAiModels.updatedAt));

  return Response.json({ providers: rows }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { label?: string; baseUrl?: string; apiKey?: string; models?: string[]; model?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const label = validateLabel(body.label ?? "");
    const baseUrl = normalizeBaseUrl(body.baseUrl ?? "");
    const apiKey = validateApiKey(body.apiKey ?? "");
    // Accept the legacy single `model` field as a one-item list.
    const models = validateModelIds(
      body.models ?? (body.model !== undefined ? [body.model] : [])
    );

    // A3: DNS-level SSRF check at write time, not only at use time.
    try {
      await assertBaseUrlAllowed(baseUrl);
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Blocked host." },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: userAiModels.id })
      .from(userAiModels)
      .where(eq(userAiModels.userId, session.user.id));
    if (existing.length >= MAX_PER_USER) {
      return Response.json({ error: `Maximum ${MAX_PER_USER} providers per user.` }, { status: 400 });
    }

    // Overlap check via ARRAY[...] of bound scalars: passing the JS array
    // as a single bound param fails on this driver (simple protocol
    // serializes it as a scalar → "malformed array literal").
    const dup = await db
      .select({ id: userAiModels.id })
      .from(userAiModels)
      .where(
        and(
          eq(userAiModels.userId, session.user.id),
          eq(userAiModels.baseUrl, baseUrl),
          sql`${userAiModels.models} && ARRAY[${sql.join(models.map((m) => sql`${m}`))}]`
        )
      )
      .limit(1);
    if (dup.length > 0) {
      return Response.json({ error: "A provider with this URL already lists one of these models." }, { status: 409 });
    }

    const [row] = await db
      .insert(userAiModels)
      .values({
        userId: session.user.id,
        label,
        baseUrl,
        apiKeyEncrypted: encryptApiKey(apiKey),
        apiKeyHint: maskApiKey(apiKey),
        models,
      })
      .returning({
        id: userAiModels.id,
        label: userAiModels.label,
        baseUrl: userAiModels.baseUrl,
        apiKeyHint: userAiModels.apiKeyHint,
        models: userAiModels.models,
        createdAt: userAiModels.createdAt,
        updatedAt: userAiModels.updatedAt,
      });

    return Response.json({ provider: row }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Validation failed." },
      { status: 400 }
    );
  }
}
