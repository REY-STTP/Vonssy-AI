-- The legacy single-model column is superseded by `models` (see 0012).
-- It stays in place so 0012's backfill keeps parsing on re-runs, but it
-- must accept NULL or every new insert (which no longer sends it) fails
-- with a not-null violation. Re-running is safe (NOTICE only).
ALTER TABLE user_ai_models ALTER COLUMN model DROP NOT NULL;
