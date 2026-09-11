import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { userAiModels } from "@/lib/db/schema";
import { decryptApiKey } from "@/lib/crypto";
import { assertBaseUrlAllowed } from "@/lib/ssrf-guard";
import { eq, and } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Lightweight in-memory throttle: max 5 tests/min per user.
const hits = new Map<string, number[]>();
function checkThrottle(userId: string): boolean {
  const now = Date.now();
  const arr = (hits.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (arr.length >= 5) return false;
  arr.push(now);
  hits.set(userId, arr);
  return true;
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkThrottle(session.user.id)) {
    return Response.json({ error: "Too many tests. Try again in a minute." }, { status: 429 });
  }
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Not found." }, { status: 404 });

  const [row] = await db
    .select()
    .from(userAiModels)
    .where(and(eq(userAiModels.id, id), eq(userAiModels.userId, session.user.id)))
    .limit(1);
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });

  let apiKey: string;
  try {
    apiKey = decryptApiKey(row.apiKeyEncrypted);
  } catch {
    return Response.json({ ok: false, error: "Stored key is corrupted. Please save it again." }, { status: 400 });
  }

  try {
    await assertBaseUrlAllowed(row.baseUrl);
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Blocked host." });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(`${row.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: row.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return Response.json({ ok: false, error: `Upstream ${res.status}: ${text.slice(0, 300)}` });
    }
    const data = await res.json().catch(() => null);
    const choice = data?.choices?.[0];
    const sample =
      choice?.message?.content ||
      choice?.message?.reasoning_content ||
      choice?.delta?.content ||
      (typeof choice?.text === "string" ? choice.text : "") ||
      "OK";
    return Response.json({ ok: true, sample: String(sample).slice(0, 200) });
  } catch (err) {
    return Response.json({
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed.",
    });
  }
}
