-- Drop quota system (BYOK: users bring their own keys, no server quota)
DROP TABLE IF EXISTS identity_quota_ledger;
DROP TABLE IF EXISTS ip_quota_ledger;
DROP TABLE IF EXISTS rate_limit_config;
