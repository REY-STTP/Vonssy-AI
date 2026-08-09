import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

/**
 * Edge-compatible Auth.js config.
 * This file contains only providers and callbacks — no database adapter
 * (adapters cannot run on the Edge runtime).
 */
export const authConfig: NextAuthConfig = {
  providers: [Google, GitHub],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnChat = nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/chat");
      const isOnLogin = nextUrl.pathname === "/login";

      if (isOnChat && !isLoggedIn) {
        return false; // Redirect to login
      }

      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
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
