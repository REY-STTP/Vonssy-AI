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
  ]
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: text("session_token").unique().notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

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

export const rateLimitConfig = pgTable(
  "rate_limit_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    model: text("model"),
    dailyMessageLimit: integer("daily_message_limit").notNull().default(25),
    isActive: boolean("is_active").default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("rate_limit_config_provider_model_unique").on(
      table.provider,
      table.model
    ),
  ]
);

export const identityQuotaLedger = pgTable(
  "identity_quota_ledger",
  {
    identityHash: text("identity_hash").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull().default(""),
    date: date("date").notNull().defaultNow(),
    messageCount: integer("message_count").default(0),
  },
  (table) => [
    uniqueIndex("identity_quota_ledger_pk").on(
      table.identityHash,
      table.provider,
      table.model,
      table.date
    ),
    index("idx_identity_ledger_date").on(table.identityHash, table.date),
  ]
);

export const ipQuotaLedger = pgTable(
  "ip_quota_ledger",
  {
    ipHash: text("ip_hash").notNull(),
    date: date("date").notNull().defaultNow(),
    messageCount: integer("message_count").default(0),
    signupCount: integer("signup_count").default(0),
  },
  (table) => [
    uniqueIndex("ip_quota_ledger_pk").on(table.ipHash, table.date),
  ]
);

