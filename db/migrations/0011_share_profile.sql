-- E5: opt-in toggle for sending name/DOB to the user's own AI endpoint.
ALTER TABLE users ADD COLUMN IF NOT EXISTS share_profile_with_ai BOOLEAN NOT NULL DEFAULT FALSE;
