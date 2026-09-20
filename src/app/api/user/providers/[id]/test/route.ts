import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { userAiModels } from "@/lib/db/schema";
import { decryptApiKey } from "@/lib/crypto";
import { assertBaseUrlAllowed } from "@/lib/ssrf-guard";
import { checkThrottle, throttleResponse } from "@/lib/throttle";
import { redactSecrets } from "@/lib/redact";
import { isUuid } from "@/lib/validate-uuid";
import { eq, and } from "drizzle-orm";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // E3: DB-backed throttle (5/min) — shared across instances.
  const throttle = await checkThrottle(`test:${session.user.id}`, 5, 60_000);
  if (!throttle.allowed) return throttleResponse(throttle);
  const { id } = await params;
  if (!isUuid(id)) return Response.json({ error: "Not found." }, { status: 404 });

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

  if (!row.models || row.models.length < 1) {
    return Response.json({ ok: false, error: "This provider has no models. Add one in Settings." });
  }
  const testModel = row.models[0];

  try {
    await assertBaseUrlAllowed(row.baseUrl);
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Blocked host." });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const endpoint = `${row.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const payload = {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      }),
      signal: controller.signal,
      redirect: "manual" as const,
    };
    let res = await fetch(endpoint, payload);
    // Allow at most ONE re-validated hop; never follow blindly (SSRF).
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      let nextUrl: URL;
      try {
        if (!location) throw new Error("empty");
        nextUrl = new URL(location, endpoint);
      } catch {
        clearTimeout(timer);
        return Response.json({ ok: false, error: "Upstream redirect blocked for safety." });
      }
      if (nextUrl.protocol !== "https:") {
        clearTimeout(timer);
        return Response.json({ ok: false, error: "Upstream redirect blocked for safety." });
      }
      try {
        await assertBaseUrlAllowed(nextUrl.origin);
      } catch {
        clearTimeout(timer);
        return Response.json({ ok: false, error: "Upstream redirect blocked for safety." });
      }
      res = await fetch(nextUrl.toString(), { ...payload, redirect: "manual" as const });
      if (res.status >= 300 && res.status < 400) {
        clearTimeout(timer);
        return Response.json({ ok: false, error: "Upstream redirect blocked for safety." });
      }
    }
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // E6: generic client message; details stay server-side, redacted.
      console.error(
        "[providers:test] upstream error:",
        res.status,
        redactSecrets(text).slice(0, 500)
      );
      return Response.json({
        ok: false,
        error: `Upstream rejected the request (status ${res.status}).`,
      });
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
    const safe = err instanceof Error ? redactSecrets(err.message) : "Connection failed.";
    console.error("[providers:test] connection error:", safe.slice(0, 300));
    return Response.json({ ok: false, error: safe.slice(0, 300) });
  }
}
