import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

/**
 * Edge-compatible Auth.js config.
 * This file contains only providers and callbacks — no database adapter
 * (adapters cannot run on the Edge runtime).
 */
export const authConfig: NextAuthConfig = {
  // E4: no allowDangerousEmailAccountLinking — unverified provider
  // emails must never auto-link into an existing account (takeover).
  providers: [Google({}), GitHub({})],

  pages: {
    signIn: "/",
    error: "/",
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnChat = nextUrl.pathname.startsWith("/chat");
      const isOnGate = nextUrl.pathname === "/";

      if (isOnChat && !isLoggedIn) {
        return false; // Redirect to sign-in gate
      }

      if (isOnGate && isLoggedIn) {
        return Response.redirect(new URL("/chat", nextUrl));
      }

      return true;
    },

    session({ session, user }) {
      // Attach the database user ID to the session object
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
