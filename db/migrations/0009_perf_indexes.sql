-- D5: indexes for sidebar / all-chats / auth hot paths.
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_pin_updated
  ON chat_sessions(user_id, is_pinned, updated_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_updated_id
  ON chat_sessions(user_id, updated_at, id);

-- Trigram index for ILIKE %...% title search (needs pg_trgm).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_chat_sessions_title_trgm
  ON chat_sessions USING gin (title gin_trgm_ops);
