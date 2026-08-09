import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Singleton pattern: prevent connection pool exhaustion in serverless
const globalForDb = globalThis as unknown as {
  pgClient: ReturnType<typeof postgres> | undefined;
  drizzleDb: ReturnType<typeof drizzle> | undefined;
};

/**
 * Lazy-initialize the database connection.
 *
 * This avoids throwing at module load time during `next build`
 * when DATABASE_URL is not set (it's only needed at runtime on Vercel).
 * The connection is created on first access and cached as a singleton.
 */
function getClient() {
  if (!globalForDb.pgClient) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL environment variable is not set. " +
          "See .env.example for the required format."
      );
    }
    globalForDb.pgClient = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalForDb.pgClient;
}

function getDb() {
  if (!globalForDb.drizzleDb) {
    globalForDb.drizzleDb = drizzle(getClient(), { schema });
  }
  return globalForDb.drizzleDb;
}

/**
 * Use this as a getter — `db` is a proxy that lazily initializes
 * on first property access, so the build step won't crash
 * when DATABASE_URL is absent.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const realDb = getDb();
    const value = (realDb as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});
