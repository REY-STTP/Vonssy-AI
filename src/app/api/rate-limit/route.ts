import { auth } from "@/lib/auth";
import { getRemainingQuota } from "@/lib/rate-limit";

/**
 * GET /api/rate-limit — Returns remaining quota for the authenticated user.
 * Consumed by the UI's QuotaIndicator component.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quota = await getRemainingQuota(session.user.id);
  return Response.json(quota);
}
