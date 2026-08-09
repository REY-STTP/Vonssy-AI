-- Create identity-based quota ledger (replaces user_id-keyed rate_limits)
CREATE TABLE IF NOT EXISTS identity_quota_ledger (
  identity_hash TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INT DEFAULT 0,
  PRIMARY KEY (identity_hash, provider, model, date)
);
CREATE INDEX IF NOT EXISTS idx_identity_ledger_date ON identity_quota_ledger(identity_hash, date);

-- Create IP-based quota ledger (abuse detection layer)
CREATE TABLE IF NOT EXISTS ip_quota_ledger (
  ip_hash TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INT DEFAULT 0,
  signup_count INT DEFAULT 0,
  PRIMARY KEY (ip_hash, date)
);

-- Drop old user_id-keyed rate_limits table
DROP TABLE IF EXISTS rate_limits;
