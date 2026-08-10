-- Add feedback column to messages table (like/dislike)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS feedback text;
