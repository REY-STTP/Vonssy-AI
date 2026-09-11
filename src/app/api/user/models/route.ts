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
import { eq, and, desc } from "drizzle-orm";

const MAX_PER_USER = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: userAiModels.id,
      label: userAiModels.label,
      baseUrl: userAiModels.baseUrl,
      apiKeyHint: userAiModels.apiKeyHint,
      model: userAiModels.model,
      createdAt: userAiModels.createdAt,
      updatedAt: userAiModels.updatedAt,
    })
    .from(userAiModels)
    .where(eq(userAiModels.userId, session.user.id))
    .orderBy(desc(userAiModels.updatedAt));

  return Response.json({ models: rows });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { label?: string; baseUrl?: string; apiKey?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const label = validateLabel(body.label ?? "");
    const baseUrl = normalizeBaseUrl(body.baseUrl ?? "");
    const apiKey = validateApiKey(body.apiKey ?? "");
    const model = validateModelId(body.model ?? "");

    const existing = await db
      .select({ id: userAiModels.id })
      .from(userAiModels)
      .where(eq(userAiModels.userId, session.user.id));
    if (existing.length >= MAX_PER_USER) {
      return Response.json({ error: `Maximum ${MAX_PER_USER} models per user.` }, { status: 400 });
    }

    const dup = await db
      .select({ id: userAiModels.id })
      .from(userAiModels)
      .where(
        and(
          eq(userAiModels.userId, session.user.id),
          eq(userAiModels.baseUrl, baseUrl),
          eq(userAiModels.model, model)
        )
      )
      .limit(1);
    if (dup.length > 0) {
      return Response.json({ error: "A model with this URL and model ID already exists." }, { status: 409 });
    }

    const [row] = await db
      .insert(userAiModels)
      .values({
        userId: session.user.id,
        label,
        baseUrl,
        apiKeyEncrypted: encryptApiKey(apiKey),
        apiKeyHint: maskApiKey(apiKey),
        model,
      })
      .returning({
        id: userAiModels.id,
        label: userAiModels.label,
        baseUrl: userAiModels.baseUrl,
        apiKeyHint: userAiModels.apiKeyHint,
        model: userAiModels.model,
        createdAt: userAiModels.createdAt,
        updatedAt: userAiModels.updatedAt,
      });

    return Response.json({ model: row }, { status: 201 });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Validation failed." },
      { status: 400 }
    );
  }
}
