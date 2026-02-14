-- ===========================================
-- PERFORMANCE INDEXES
-- ===========================================
-- Additional indexes for query optimization
-- Run this AFTER all schema creation
-- ===========================================

-- NOTE: Primary key and unique constraints automatically create indexes
-- This file adds composite and covering indexes for common queries

-- ---------------------------------------------
-- USERS TABLE
-- ---------------------------------------------

-- Email lookups (login, password reset)
-- Already created by UNIQUE constraint, but explicitly documented
-- CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Phone lookup (optional for SMS features)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Verification status (find unverified users)
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified) WHERE is_verified = false;

-- ---------------------------------------------
-- BUSINESSES TABLE
-- ---------------------------------------------

-- NFC tag lookup (most critical query - every tap)
-- Already created by UNIQUE constraint
-- CREATE UNIQUE INDEX idx_businesses_nfc_tag_id ON businesses(nfc_tag_id);

-- Name search (for admin search features)
CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses(name);

-- Created at for sorting
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON businesses(created_at DESC);

-- ---------------------------------------------
-- PUNCH CARDS TABLE
-- ---------------------------------------------

-- User's punch cards (dashboard view)
CREATE INDEX IF NOT EXISTS idx_punch_cards_user_id ON punch_cards(user_id);

-- Business's punch cards (business analytics)
CREATE INDEX IF NOT EXISTS idx_punch_cards_business_id ON punch_cards(business_id);

-- Composite index for finding specific punch card (most common query)
CREATE UNIQUE INDEX IF NOT EXISTS idx_punch_cards_user_business
  ON punch_cards(user_id, business_id);

-- Active punch cards sorted by progress
CREATE INDEX IF NOT EXISTS idx_punch_cards_progress
  ON punch_cards(user_id, current_punches DESC);

-- ---------------------------------------------
-- PUNCHES TABLE
-- ---------------------------------------------

-- User's punch history
CREATE INDEX IF NOT EXISTS idx_punches_user_id ON punches(user_id);

-- Business's punch history
CREATE INDEX IF NOT EXISTS idx_punches_business_id ON punches(business_id);

-- Punch card's punches
CREATE INDEX IF NOT EXISTS idx_punches_punch_card_id ON punches(punch_card_id);

-- Recent punches (for activity feeds)
CREATE INDEX IF NOT EXISTS idx_punches_created_at ON punches(created_at DESC);

-- Composite index for business analytics (punches per day)
CREATE INDEX IF NOT EXISTS idx_punches_business_created
  ON punches(business_id, created_at DESC);

-- Composite index for user punch history
CREATE INDEX IF NOT EXISTS idx_punches_user_created
  ON punches(user_id, created_at DESC);

-- ---------------------------------------------
-- PRIZES TABLE
-- ---------------------------------------------

-- Business's prizes
CREATE INDEX IF NOT EXISTS idx_prizes_business_id ON prizes(business_id);

-- Active prizes for public display
CREATE INDEX IF NOT EXISTS idx_prizes_is_active ON prizes(is_active) WHERE is_active = true;

-- Prizes by punches required (for reward eligibility checks)
CREATE INDEX IF NOT EXISTS idx_prizes_punches_required
  ON prizes(business_id, punches_required);

-- Composite index for business prize management
CREATE INDEX IF NOT EXISTS idx_prizes_business_active
  ON prizes(business_id, is_active);

-- ---------------------------------------------
-- REDEEMED PRIZES TABLE
-- ---------------------------------------------

-- User's redemption history
CREATE INDEX IF NOT EXISTS idx_redeemed_prizes_user_id ON redeemed_prizes(user_id);

-- Business's redemption history
CREATE INDEX IF NOT EXISTS idx_redeemed_prizes_business_id ON redeemed_prizes(business_id);

-- Prize redemption count (prize analytics)
CREATE INDEX IF NOT EXISTS idx_redeemed_prizes_prize_id ON redeemed_prizes(prize_id);

-- Recent redemptions
CREATE INDEX IF NOT EXISTS idx_redeemed_prizes_redeemed_at
  ON redeemed_prizes(redeemed_at DESC);

-- Composite index for business redemption analytics
CREATE INDEX IF NOT EXISTS idx_redeemed_prizes_business_date
  ON redeemed_prizes(business_id, redeemed_at DESC);

-- ---------------------------------------------
-- USER SESSIONS TABLE
-- ---------------------------------------------

-- Session token lookup (every authenticated request)
-- Already created by UNIQUE constraint
-- CREATE UNIQUE INDEX idx_user_sessions_token ON user_sessions(session_token);

-- User's active sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Expired sessions cleanup
-- Already created in main schema
-- CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Composite index for session validation (token + expiry check)
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_expires
  ON user_sessions(session_token, expires_at);

-- ---------------------------------------------
-- BUSINESS ADMIN SESSIONS TABLE
-- ---------------------------------------------
-- (Already created in 04-business-admin-tables.sql)

-- ---------------------------------------------
-- COVERING INDEXES (for common queries)
-- ---------------------------------------------

-- Dashboard punch cards query
-- Includes all commonly fetched columns to avoid table lookup
CREATE INDEX IF NOT EXISTS idx_punch_cards_dashboard
  ON punch_cards(user_id, business_id, current_punches, total_punches, created_at);

-- Business analytics query
-- Covers punch count aggregation without table scan
CREATE INDEX IF NOT EXISTS idx_punches_analytics
  ON punches(business_id, created_at)
  INCLUDE (user_id);

-- ---------------------------------------------
-- PARTIAL INDEXES (for filtered queries)
-- ---------------------------------------------

-- Only verified users (for analytics)
CREATE INDEX IF NOT EXISTS idx_users_verified
  ON users(id, created_at)
  WHERE is_verified = true;

-- Active subscriptions only
CREATE INDEX IF NOT EXISTS idx_subscriptions_active
  ON subscriptions(business_id, plan_tier, current_period_end)
  WHERE status IN ('active', 'trialing');

-- Incomplete subscriptions (for cleanup/monitoring)
CREATE INDEX IF NOT EXISTS idx_subscriptions_incomplete
  ON subscriptions(business_id, created_at)
  WHERE status IN ('incomplete', 'incomplete_expired');

-- ---------------------------------------------
-- FUNCTION-BASED INDEXES
-- ---------------------------------------------

-- Case-insensitive email search for users
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Case-insensitive email search for business admins
CREATE INDEX IF NOT EXISTS idx_business_admins_email_lower ON business_admins(LOWER(email));

-- Case-insensitive business name search
CREATE INDEX IF NOT EXISTS idx_businesses_name_lower ON businesses(LOWER(name));

-- ---------------------------------------------
-- ANALYZE TABLES
-- ---------------------------------------------

-- Update statistics for query planner
ANALYZE users;
ANALYZE businesses;
ANALYZE business_admins;
ANALYZE punch_cards;
ANALYZE punches;
ANALYZE prizes;
ANALYZE redeemed_prizes;
ANALYZE user_sessions;
ANALYZE business_admin_sessions;
ANALYZE subscriptions;

-- ---------------------------------------------
-- PERFORMANCE MONITORING QUERIES
-- ---------------------------------------------

-- Check index usage (run periodically to identify unused indexes)
/*
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
*/

-- Find missing indexes (queries that would benefit from indexes)
/*
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
ORDER BY abs(correlation) DESC;
*/

-- Check table sizes
/*
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
*/

-- ===========================================
-- INDEX MAINTENANCE
-- ===========================================

-- Rebuild indexes periodically (if experiencing bloat)
-- REINDEX TABLE punch_cards;
-- REINDEX TABLE punches;

-- Or rebuild all indexes in schema
-- REINDEX SCHEMA public;

-- ===========================================
-- NOTES
-- ===========================================

-- 1. Indexes speed up SELECT queries but slow down INSERT/UPDATE/DELETE
-- 2. Monitor index usage and drop unused indexes
-- 3. PostgreSQL automatically uses indexes when beneficial
-- 4. EXPLAIN ANALYZE queries to verify index usage
-- 5. Rebuild indexes periodically if experiencing bloat
-- 6. Composite indexes should order columns by selectivity (most selective first)
-- 7. Partial indexes reduce index size for filtered queries
-- 8. Covering indexes (INCLUDE) avoid table lookups for specific queries

-- ===========================================
-- END OF INDEXES
-- ===========================================
