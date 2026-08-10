import { db } from "@/lib/db/client";
import { rateLimitConfig, identityQuotaLedger, ipQuotaLedger } from "@/lib/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";

/**
 * IP-level daily message ceiling.
 * Deliberately much higher than per-identity limits — this is a backstop
 * against mass-account abuse, not a user-facing throttle.
 */
const IP_DAILY_MESSAGE_LIMIT = 200;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string; // ISO timestamp
  error?: string;
}

/**
 * Check if an identity is within their daily message quota.
 *
 * Enforcement order:
 * 1. Check global limit (identity_quota_ledger)
 * 2. Check provider/model-specific limit (identity_quota_ledger)
 * 3. Check IP-level ceiling (ip_quota_ledger)
 * 4. Return the most restrictive result
 */
export async function checkRateLimit(
  identityHash: string,
  ipHash: string,
  provider: string
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

  // 3. Get today's global usage count from identity ledger
  const [globalUsage] = await db
    .select({
      total: sql<number>`cast(sum(${identityQuotaLedger.messageCount}) as integer)`,
    })
    .from(identityQuotaLedger)
    .where(
      and(
        eq(identityQuotaLedger.identityHash, identityHash),
        eq(identityQuotaLedger.provider, "global"),
        sql`${identityQuotaLedger.date} = ${today}`
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
      error: `Daily message limit reached (${globalLimit} messages/day). Resets tomorrow at midnight (UTC).`,
    };
  }

  // 5. Check provider-specific limit if configured
  if (specificConfig) {
    const [specificUsage] = await db
      .select({
        total: sql<number>`cast(sum(${identityQuotaLedger.messageCount}) as integer)`,
      })
      .from(identityQuotaLedger)
      .where(
        and(
          eq(identityQuotaLedger.identityHash, identityHash),
          eq(identityQuotaLedger.provider, provider),
          sql`${identityQuotaLedger.date} = ${today}`
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
        error: `Rate limit reached (${specificLimit} messages/day). Resets tomorrow at midnight (UTC).`,
      };
    }
  }

  // 6. Check IP-level ceiling (backstop against mass-account abuse)
  const [ipUsage] = await db
    .select({
      total: sql<number>`cast(${ipQuotaLedger.messageCount} as integer)`,
    })
    .from(ipQuotaLedger)
    .where(
      and(
        eq(ipQuotaLedger.ipHash, ipHash),
        sql`${ipQuotaLedger.date} = ${today}`
      )
    );

  const ipCount = ipUsage?.total ?? 0;

  if (ipCount >= IP_DAILY_MESSAGE_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      limit: globalLimit,
      resetAt,
      error: `Daily message limit reached. Resets tomorrow at midnight (UTC).`,
    };
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
 * Upserts both identity_quota_ledger and ip_quota_ledger.
 */
export async function incrementRateLimit(
  identityHash: string,
  ipHash: string,
  provider: string,
  model: string
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Upsert global counter in identity ledger
  await db
    .insert(identityQuotaLedger)
    .values({
      identityHash,
      provider: "global",
      model: "",
      date: today,
      messageCount: 1,
    })
    .onConflictDoUpdate({
      target: [
        identityQuotaLedger.identityHash,
        identityQuotaLedger.provider,
        identityQuotaLedger.model,
        identityQuotaLedger.date,
      ],
      set: {
        messageCount: sql`${identityQuotaLedger.messageCount} + 1`,
      },
    });

  // Upsert provider-specific counter in identity ledger
  await db
    .insert(identityQuotaLedger)
    .values({
      identityHash,
      provider,
      model: model || "",
      date: today,
      messageCount: 1,
    })
    .onConflictDoUpdate({
      target: [
        identityQuotaLedger.identityHash,
        identityQuotaLedger.provider,
        identityQuotaLedger.model,
        identityQuotaLedger.date,
      ],
      set: {
        messageCount: sql`${identityQuotaLedger.messageCount} + 1`,
      },
    });

  // Upsert IP counter
  await db
    .insert(ipQuotaLedger)
    .values({
      ipHash,
      date: today,
      messageCount: 1,
    })
    .onConflictDoUpdate({
      target: [ipQuotaLedger.ipHash, ipQuotaLedger.date],
      set: {
        messageCount: sql`${ipQuotaLedger.messageCount} + 1`,
      },
    });
}

/**
 * Get remaining quota for the authenticated identity.
 * Used by the UI quota indicator.
 */
export async function getRemainingQuota(
  identityHash: string
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
      total: sql<number>`cast(sum(${identityQuotaLedger.messageCount}) as integer)`,
    })
    .from(identityQuotaLedger)
    .where(
      and(
        eq(identityQuotaLedger.identityHash, identityHash),
        eq(identityQuotaLedger.provider, "global"),
        sql`${identityQuotaLedger.date} = ${today}`
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
 * Increment the signup counter for an IP address.
 * Called when a new user is created (via Auth.js callback).
 */
export async function incrementSignupCount(ipHash: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  await db
    .insert(ipQuotaLedger)
    .values({
      ipHash,
      date: today,
      signupCount: 1,
    })
    .onConflictDoUpdate({
      target: [ipQuotaLedger.ipHash, ipQuotaLedger.date],
      set: {
        signupCount: sql`${ipQuotaLedger.signupCount} + 1`,
      },
    });
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
