import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";
import {
  users,
  accounts,
  sessions as sessionsTable,
  verificationTokens,
} from "./db/schema";
import { authConfig } from "./auth.config";

/**
 * Full Auth.js config with Drizzle database adapter.
 * This file runs in the Node.js runtime only (not Edge).
 *
 * Session strategy: "database" — sessions are stored in Postgres
 * and can be revoked server-side, per spec Section 7.
 *
 * The adapter is created eagerly when DATABASE_URL is available
 * (runtime), and skipped during `next build` when it's absent.
 */
function createAdapter() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // During `next build`, DATABASE_URL may not be set.
    // Return undefined — Auth.js will run without a DB adapter.
    return undefined;
  }

  const client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(client, { schema });

  // Explicit table mapping so the adapter uses our table names
  // (plural: users, accounts, sessions) instead of defaults
  // (singular: user, account, session).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return DrizzleAdapter(db as any, {
    usersTable: users as any,
    accountsTable: accounts as any,
    sessionsTable: sessionsTable as any,
    verificationTokensTable: verificationTokens as any,
  });
}

const adapter = createAdapter();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  ...(adapter ? { adapter } : {}),
  session: {
    strategy: adapter ? "database" : "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
});
