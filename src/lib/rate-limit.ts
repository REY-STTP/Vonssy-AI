import { db } from "@/lib/db/client";
import { rateLimitConfig, rateLimits } from "@/lib/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string; // ISO timestamp
  error?: string;
}

/**
 * Check if a user is within their daily message quota.
 *
 * Enforcement order per Section 8:
 * 1. Check global limit first
 * 2. Check provider/model-specific limit (if any)
 * 3. Return the most restrictive result
 */
export async function checkRateLimit(
  userId: string,
  provider: string,
  model: string
): Promise<RateLimitResult> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const resetAt = getNextResetTime();

  // 1. Get global rate limit config
  const [globalConfig] = await db
    .select()
    .from(rateLimitConfig)
    .where(
      and(
        eq(rateLimitConfig.provider, "global"),
        isNull(rateLimitConfig.model),
        eq(rateLimitConfig.isActive, true)
      )
    )
    .limit(1);

  // 2. Get provider/model-specific config (if any)
  const [specificConfig] = await db
    .select()
    .from(rateLimitConfig)
    .where(
      and(
        eq(rateLimitConfig.provider, provider),
        eq(rateLimitConfig.isActive, true)
      )
    )
    .limit(1);

  // 3. Get today's global usage count
  const [globalUsage] = await db
    .select({
      total: sql<number>`cast(sum(${rateLimits.messageCount}) as integer)`,
    })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.userId, userId),
        eq(rateLimits.provider, "global"),
        sql`${rateLimits.date} = ${today}`
      )
    );

  const globalCount = globalUsage?.total ?? 0;
  const globalLimit = globalConfig?.dailyMessageLimit ?? 25;

  // 4. Check global limit
  if (globalCount >= globalLimit) {
    return {
      allowed: false,
      remaining: 0,
      limit: globalLimit,
      resetAt,
      error: `Daily message limit reached (${globalLimit} messages/day). Resets at ${resetAt}.`,
    };
  }

  // 5. Check provider-specific limit if configured
  if (specificConfig) {
    const [specificUsage] = await db
      .select({
        total: sql<number>`cast(sum(${rateLimits.messageCount}) as integer)`,
      })
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.userId, userId),
          eq(rateLimits.provider, provider),
          sql`${rateLimits.date} = ${today}`
        )
      );

    const specificCount = specificUsage?.total ?? 0;
    const specificLimit = specificConfig.dailyMessageLimit;

    if (specificCount >= specificLimit) {
      return {
        allowed: false,
        remaining: 0,
        limit: specificLimit,
        resetAt,
        error: `Rate limit for ${provider}/${model} reached (${specificLimit} messages/day). Resets at ${resetAt}.`,
      };
    }
  }

  return {
    allowed: true,
    remaining: globalLimit - globalCount,
    limit: globalLimit,
    resetAt,
  };
}

/**
 * Increment the rate limit counter after a successful message.
 * Upserts both the global and provider-specific rows.
 */
export async function incrementRateLimit(
  userId: string,
  provider: string,
  model: string
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Upsert global counter
  // Note: We use "" (empty string) instead of null for the model because 
  // Postgres treats NULL != NULL in unique indexes, which breaks ON CONFLICT.
  await db
    .insert(rateLimits)
    .values({
      userId,
      provider: "global",
      model: "",
      date: today,
      messageCount: 1,
    })
    .onConflictDoUpdate({
      target: [rateLimits.userId, rateLimits.provider, rateLimits.model, rateLimits.date],
      set: {
        messageCount: sql`${rateLimits.messageCount} + 1`,
      },
    });

  // Upsert provider-specific counter
  await db
    .insert(rateLimits)
    .values({
      userId,
      provider,
      model: model || "", 
      date: today,
      messageCount: 1,
    })
    .onConflictDoUpdate({
      target: [rateLimits.userId, rateLimits.provider, rateLimits.model, rateLimits.date],
      set: {
        messageCount: sql`${rateLimits.messageCount} + 1`,
      },
    });
}

/**
 * Get remaining quota for the authenticated user.
 * Used by the UI quota indicator.
 */
export async function getRemainingQuota(
  userId: string
): Promise<{ remaining: number; limit: number; resetAt: string }> {
  const today = new Date().toISOString().split("T")[0];
  const resetAt = getNextResetTime();

  const [globalConfig] = await db
    .select()
    .from(rateLimitConfig)
    .where(
      and(
        eq(rateLimitConfig.provider, "global"),
        isNull(rateLimitConfig.model),
        eq(rateLimitConfig.isActive, true)
      )
    )
    .limit(1);

  const limit = globalConfig?.dailyMessageLimit ?? 25;

  const [globalUsage] = await db
    .select({
      total: sql<number>`cast(sum(${rateLimits.messageCount}) as integer)`,
    })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.userId, userId),
        eq(rateLimits.provider, "global"),
        sql`${rateLimits.date} = ${today}`
      )
    );

  const count = globalUsage?.total ?? 0;

  return {
    remaining: Math.max(0, limit - count),
    limit,
    resetAt,
  };
}

/**
 * Get the next reset time (midnight UTC).
 */
function getNextResetTime(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}
