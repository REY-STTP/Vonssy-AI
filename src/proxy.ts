import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Proxy (formerly middleware) for route protection.
 *
 * In Next.js 16.3+, "proxy" runs in Node.js runtime by default,
 * so we can import the full auth() with the database adapter.
 * This avoids the JWTSessionError that occurs when a separate
 * NextAuth instance (defaulting to JWT) tries to read
 * database-session cookies.
 *
 * IMPORTANT (CVE-2025-29927): This proxy is a UX convenience
 * layer only — it redirects unauthenticated users to /login.
 * It does NOT serve as the sole auth check.
 * Every API route independently re-validates the session
 * server-side via auth() from @/lib/auth.
 */
export async function proxy(request: NextRequest) {
  // ── Canonical host enforcement (NEXTAUTH_URL) ──────────
  // If NEXTAUTH_URL=http://www.vonssy-ai.web.id is set and the request
  // arrives on a different host (e.g. vercel.app, apex), redirect to
  // the canonical host preserving path + query. Localhost is exempt
  // so `npm run dev` keeps working.
  const canonical = getCanonicalBase();
  if (canonical) {
    const reqHost = request.headers
      .get("host")
      ?.split(":")[0]
      ?.toLowerCase();
    const canonHost = canonical.hostname.toLowerCase();
    const isLocalReq =
      reqHost === "localhost" || reqHost === "127.0.0.1";
    const isLocalCanon =
      canonHost === "localhost" || canonHost === "127.0.0.1";
    if (reqHost && reqHost !== canonHost && !isLocalReq && !isLocalCanon) {
      const url = new URL(request.url);
      url.protocol = canonical.protocol;
      url.host = canonical.host;
      return NextResponse.redirect(url);
    }
  }

  let isLoggedIn = false;

  try {
    const session = await auth();
    isLoggedIn = !!session?.user;
  } catch {
    // Auth check failed (no DB, invalid session, etc.)
    // Treat as unauthenticated — the login page will handle it.
    isLoggedIn = false;
  }

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users from protected routes to login
  const isProtectedRoute = pathname === "/" || pathname.startsWith("/chat");
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login
  const isAuthRoute = pathname === "/login";
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

function getCanonicalBase(): URL | null {
  const raw = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (Auth.js endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, public assets
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
