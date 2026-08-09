import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getRemainingQuota } from "@/lib/rate-limit";
import { computeIdentityHash } from "@/lib/quota-hash";

/**
 * GET /api/rate-limit — Returns remaining quota for the authenticated user.
 * Resolves the OAuth identity hash to query the identity_quota_ledger.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Resolve OAuth identity
  const [accountData] = await db
    .select({
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
    })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id))
    .limit(1);

  if (!accountData) {
    return Response.json({ error: "No linked OAuth account found." }, { status: 403 });
  }

  const identityHash = computeIdentityHash(accountData.provider, accountData.providerAccountId);
  const quota = await getRemainingQuota(identityHash);
  return Response.json(quota);
}
