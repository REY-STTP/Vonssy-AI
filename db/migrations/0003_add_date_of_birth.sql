-- Add date_of_birth column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
