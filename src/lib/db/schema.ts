import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  date,
  uniqueIndex,
  index,
  bigint,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Auth.js Standard Tables ─────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  preferredName: text("preferred_name"),
  dateOfBirth: date("date_of_birth"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  avatarSource: text("avatar_source").notNull().default("oauth"),
  avatarStyle: text("avatar_style"),
  avatarSeed: text("avatar_seed"),
  // E5: opt-in — include name/DOB in prompts sent to the user's own endpoint.
  shareProfileWithAi: boolean("share_profile_with_ai").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: bigint("expires_at", { mode: "number" }),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => [
    uniqueIndex("accounts_provider_provider_account_id_unique").on(
      table.provider,
      table.providerAccountId
    ),
    // D5: per-user account lookups (chat page, quota paths).
    index("idx_accounts_user").on(table.userId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionToken: text("session_token").unique().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    // D5: per-user session lookups + cascade deletes.
    index("idx_sessions_user").on(table.userId),
  ]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").unique().notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("verification_tokens_identifier_token_pk").on(
      table.identifier,
      table.token
    ),
  ]
);

// ── Application Tables ──────────────────────────────────────

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").default("New Chat"),
    modelProvider: text("model_provider"),
    isPinned: boolean("is_pinned").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_chat_sessions_user").on(table.userId, table.updatedAt),
    // D5: pinned split + cursor pagination hot paths.
    index("idx_sessions_user_pin_updated").on(
      table.userId,
      table.isPinned,
      table.updatedAt
    ),
    index("idx_sessions_user_updated_id").on(
      table.userId,
      table.updatedAt,
      table.id
    ),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatSessionId: uuid("chat_session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    provider: text("provider"),
    model: text("model"),
    feedback: text("feedback"),  // 'like' | 'dislike' | null
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_messages_session").on(table.chatSessionId, table.createdAt),
    check("messages_role_check", sql`${table.role} IN ('user', 'assistant', 'system')`),
  ]
);

export const usageLogs = pgTable(
  "usage_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => messages.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    latencyMs: integer("latency_ms"),
    status: text("status").default("success"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_usage_logs_user_date").on(table.userId, table.createdAt),
    index("idx_usage_logs_provider").on(table.provider, table.createdAt),
  ]
);

export const userAiModels = pgTable(
  "user_ai_models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    baseUrl: text("base_url").notNull(),
    apiKeyEncrypted: text("api_key_encrypted").notNull(),
    apiKeyHint: text("api_key_hint").notNull(),
    // Multi-model providers: one endpoint + key serving N model IDs.
    // Backfilled from the legacy `model` column by 0012 (which is left
    // in place, unused, so the migration stays re-runnable).
    models: text("models").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_user_ai_models_user").on(table.userId, table.updatedAt),
  ]
);

// E3: fixed-window throttle buckets shared across server instances.
export const throttleBuckets = pgTable("throttle_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  count: integer("count").notNull().default(1),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
});

