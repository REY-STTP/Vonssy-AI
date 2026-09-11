import { db } from "@/lib/db/client";
import { throttleBuckets } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export interface ThrottleCheck {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAfterMs: number;
}

/**
 * E3: fixed-window throttle backed by Postgres so every server
 * instance shares the same buckets (in-memory Maps don't).
 */
export async function checkThrottle(
  key: string,
  limit: number,
  windowMs: number
): Promise<ThrottleCheck> {
  const now = new Date();

  // Opportunistic sweep of stale buckets (~1% of calls, no cron needed).
  if (Math.random() < 0.01) {
    await db
      .delete(throttleBuckets)
      .where(sql`${throttleBuckets.windowStart} < NOW() - INTERVAL '7 days'`)
      .catch(() => undefined);
  }

  const [row] = await db
    .select()
    .from(throttleBuckets)
    .where(eq(throttleBuckets.bucketKey, key))
    .limit(1);

  if (!row || now.getTime() - new Date(row.windowStart).getTime() >= windowMs) {
    await db
      .insert(throttleBuckets)
      .values({ bucketKey: key, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: throttleBuckets.bucketKey,
        set: { count: 1, windowStart: now },
      });
    return { allowed: true, limit, remaining: limit - 1, resetAfterMs: windowMs };
  }

  if (row.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAfterMs: Math.max(
        0,
        windowMs - (now.getTime() - new Date(row.windowStart).getTime())
      ),
    };
  }

  await db
    .update(throttleBuckets)
    .set({ count: sql`${throttleBuckets.count} + 1` })
    .where(eq(throttleBuckets.bucketKey, key));

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - row.count - 1),
    resetAfterMs: Math.max(
      0,
      windowMs - (now.getTime() - new Date(row.windowStart).getTime())
    ),
  };
}

export function throttleHeaders(check: ThrottleCheck): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(check.limit),
    "X-RateLimit-Remaining": String(check.remaining),
    "Retry-After": String(Math.max(1, Math.ceil(check.resetAfterMs / 1000))),
  };
}

export function throttleResponse(check: ThrottleCheck) {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: throttleHeaders(check) }
  );
}
