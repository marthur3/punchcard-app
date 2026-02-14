-- ===========================================
-- BUSINESS ADMIN TABLES & SUBSCRIPTIONS
-- ===========================================
-- This schema extends the base schema with:
-- 1. Business admin accounts (separate from customer accounts)
-- 2. Subscription management with Stripe integration
-- 3. Business admin sessions
--
-- Run this AFTER 01-create-tables.sql
-- ===========================================

-- ---------------------------------------------
-- BUSINESS ADMINS TABLE
-- ---------------------------------------------
-- Separate table for business admin accounts
-- Distinct from customer accounts in the 'users' table
-- One business can have multiple admins in the future

CREATE TABLE IF NOT EXISTS business_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,

  -- Email verification
  is_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  verification_token_expires TIMESTAMP,

  -- Password reset
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,

  -- Role (for future multi-admin support)
  role VARCHAR(50) DEFAULT 'owner', -- 'owner', 'admin', 'staff'

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Email index for fast lookups
CREATE INDEX idx_business_admins_email ON business_admins(email);

-- Business ID index for admin lookups
CREATE INDEX idx_business_admins_business_id ON business_admins(business_id);

-- Verification token index
CREATE INDEX idx_business_admins_verification_token ON business_admins(verification_token) WHERE verification_token IS NOT NULL;

-- Reset token index
CREATE INDEX idx_business_admins_reset_token ON business_admins(reset_token) WHERE reset_token IS NOT NULL;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_business_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_admins_updated_at
  BEFORE UPDATE ON business_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_business_admins_updated_at();

-- ---------------------------------------------
-- SUBSCRIPTIONS TABLE
-- ---------------------------------------------
-- Stripe subscription management for businesses

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Stripe IDs
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,

  -- Plan details
  plan_tier VARCHAR(50) NOT NULL, -- 'starter', 'professional', 'enterprise'

  -- Subscription status
  -- Possible values: 'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'
  status VARCHAR(50) NOT NULL DEFAULT 'incomplete',

  -- Billing cycle
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,

  -- Trial
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,

  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Business ID index (one subscription per business)
CREATE UNIQUE INDEX idx_subscriptions_business_id ON subscriptions(business_id);

-- Stripe customer ID index
CREATE UNIQUE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Stripe subscription ID index
CREATE UNIQUE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Status index for querying active subscriptions
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- ---------------------------------------------
-- BUSINESS ADMIN SESSIONS TABLE
-- ---------------------------------------------
-- Secure session management for business admins
-- Separate from customer sessions (user_sessions table)

CREATE TABLE IF NOT EXISTS business_admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES business_admins(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,

  -- Track session metadata
  ip_address VARCHAR(45), -- IPv6 max length
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin ID index for fetching user sessions
CREATE INDEX idx_business_admin_sessions_admin_id ON business_admin_sessions(admin_id);

-- Session token index for fast lookups
CREATE UNIQUE INDEX idx_business_admin_sessions_token ON business_admin_sessions(session_token);

-- Expires at index for cleanup queries
CREATE INDEX idx_business_admin_sessions_expires_at ON business_admin_sessions(expires_at);

-- Clean up expired sessions automatically (optional, can also use cron job)
-- This function can be called periodically
CREATE OR REPLACE FUNCTION cleanup_expired_business_admin_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM business_admin_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------
-- HELPER VIEWS
-- ---------------------------------------------

-- View to get business with subscription status
CREATE OR REPLACE VIEW businesses_with_subscriptions AS
SELECT
  b.*,
  s.plan_tier,
  s.status AS subscription_status,
  s.current_period_end,
  s.trial_end,
  s.cancel_at_period_end,
  CASE
    WHEN s.status = 'active' OR s.status = 'trialing' THEN true
    ELSE false
  END AS has_active_subscription
FROM businesses b
LEFT JOIN subscriptions s ON b.id = s.business_id;

-- View to get admin with business and subscription info
CREATE OR REPLACE VIEW business_admins_full AS
SELECT
  ba.*,
  b.name AS business_name,
  b.description AS business_description,
  b.nfc_tag_id,
  s.plan_tier,
  s.status AS subscription_status,
  s.current_period_end
FROM business_admins ba
JOIN businesses b ON ba.business_id = b.id
LEFT JOIN subscriptions s ON b.id = s.business_id;

-- ---------------------------------------------
-- COMMENTS
-- ---------------------------------------------

COMMENT ON TABLE business_admins IS 'Business administrator accounts, separate from customer accounts';
COMMENT ON COLUMN business_admins.password_hash IS 'Bcrypt hash of admin password (12 rounds)';
COMMENT ON COLUMN business_admins.verification_token IS 'Token sent via email for account verification';
COMMENT ON COLUMN business_admins.reset_token IS 'Token sent via email for password reset';

COMMENT ON TABLE subscriptions IS 'Stripe subscription management for businesses';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN subscriptions.plan_tier IS 'Plan level: starter ($29), professional ($79), or enterprise ($199)';

COMMENT ON TABLE business_admin_sessions IS 'Session tokens for business admin authentication';
COMMENT ON COLUMN business_admin_sessions.session_token IS 'Cryptographically secure random token (32 bytes, base64url encoded)';

-- ---------------------------------------------
-- GRANT PERMISSIONS (adjust as needed)
-- ---------------------------------------------

-- Grant authenticated users access to their own admin records
-- (RLS policies in 05-row-level-security.sql will enforce this)
GRANT SELECT, INSERT, UPDATE ON business_admins TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT, INSERT, DELETE ON business_admin_sessions TO authenticated;

-- ===========================================
-- END OF SCHEMA
-- ===========================================
