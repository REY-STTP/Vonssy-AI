import { db } from "@/lib/db/client";
import { throttleBuckets } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

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
  const cutoff = new Date(now.getTime() - windowMs);

  // Opportunistic sweep of stale buckets (~1% of calls, no cron needed).
  if (Math.random() < 0.01) {
    await db
      .delete(throttleBuckets)
      .where(sql`${throttleBuckets.windowStart} < NOW() - INTERVAL '7 days'`)
      .catch(() => undefined);
  }

  // Atomic single statement: concurrent bursts serialize on the row lock,
  // so N parallel requests can't all read the same count and slip through.
  // Expired windows reset to 1 instead of incrementing.
  // NOTE: raw sql fragments receive ISO strings, not Date objects —
  // postgres.js cannot bind Date inside sql`` parameter slots.
  const cutoffIso = cutoff.toISOString();
  const nowIso = now.toISOString();
  const [row] = await db
    .insert(throttleBuckets)
    .values({ bucketKey: key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: throttleBuckets.bucketKey,
      set: {
        count: sql`CASE WHEN ${throttleBuckets.windowStart} < ${cutoffIso} THEN 1 ELSE ${throttleBuckets.count} + 1 END`,
        windowStart: sql`CASE WHEN ${throttleBuckets.windowStart} < ${cutoffIso} THEN ${nowIso} ELSE ${throttleBuckets.windowStart} END`,
      },
    })
    .returning({
      count: throttleBuckets.count,
      windowStart: throttleBuckets.windowStart,
    });

  const elapsed = now.getTime() - new Date(row.windowStart).getTime();
  if (row.count > limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAfterMs: Math.max(0, windowMs - elapsed),
    };
  }

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - row.count),
    resetAfterMs: Math.max(0, windowMs - elapsed),
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
