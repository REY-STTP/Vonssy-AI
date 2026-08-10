-- Add avatar columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_source text NOT NULL DEFAULT 'oauth';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_style text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_seed text;
