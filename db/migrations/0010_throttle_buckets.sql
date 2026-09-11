-- DB-backed throttle buckets (fixed windows, shared across instances)
CREATE TABLE IF NOT EXISTS throttle_buckets (
  bucket_key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
