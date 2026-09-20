-- Multi-model providers: one endpoint + key can serve N model IDs.
-- The legacy `model` column is intentionally left in place (unused by the
-- app after this point) so this file stays safe to re-run: migrate.js
-- executes every file on each run, and referencing a dropped column
-- would fail at parse time on subsequent runs.
ALTER TABLE user_ai_models ADD COLUMN IF NOT EXISTS models TEXT[];
UPDATE user_ai_models SET models = ARRAY[model] WHERE models IS NULL AND model IS NOT NULL;
