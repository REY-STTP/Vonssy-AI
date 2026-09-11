import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { userAiModels } from "@/lib/db/schema";
import { encryptApiKey } from "@/lib/crypto";
import {
  maskApiKey,
  normalizeBaseUrl,
  validateApiKey,
  validateLabel,
  validateModelId,
} from "@/lib/user-models/validation";
import { eq, and } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function owned(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(userAiModels)
    .where(and(eq(userAiModels.id, id), eq(userAiModels.userId, userId)))
    .limit(1);
  return row ?? null;
}

function toPublic(row: typeof userAiModels.$inferSelect) {
  return {
    id: row.id,
    label: row.label,
    baseUrl: row.baseUrl,
    apiKeyHint: row.apiKeyHint,
    model: row.model,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const row = await owned(id, session.user.id);
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ model: toPublic(row) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const row = await owned(id, session.user.id);
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });

  let body: { label?: string; baseUrl?: string; apiKey?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const patch: Partial<typeof userAiModels.$inferInsert> = { updatedAt: new Date() };
    if (body.label !== undefined) patch.label = validateLabel(body.label);
    if (body.baseUrl !== undefined) patch.baseUrl = normalizeBaseUrl(body.baseUrl);
    if (body.model !== undefined) patch.model = validateModelId(body.model);
    if (body.apiKey !== undefined && body.apiKey !== "") {
      const key = validateApiKey(body.apiKey);
      patch.apiKeyEncrypted = encryptApiKey(key);
      patch.apiKeyHint = maskApiKey(key);
    }
    const [updated] = await db
      .update(userAiModels)
      .set(patch)
      .where(and(eq(userAiModels.id, id), eq(userAiModels.userId, session.user.id)))
      .returning();
    return Response.json({ model: toPublic(updated) });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Validation failed." },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const row = await owned(id, session.user.id);
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  await db
    .delete(userAiModels)
    .where(and(eq(userAiModels.id, id), eq(userAiModels.userId, session.user.id)));
  return Response.json({ success: true });
}
