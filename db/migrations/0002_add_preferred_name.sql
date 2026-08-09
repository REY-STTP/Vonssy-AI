-- Add preferred_name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_name TEXT;
