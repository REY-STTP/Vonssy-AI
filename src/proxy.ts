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
