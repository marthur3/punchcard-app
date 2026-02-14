-- ===========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================
-- Enforce data isolation and access control
-- Run this AFTER 01-create-tables.sql and 04-business-admin-tables.sql
-- ===========================================

-- NOTE: Supabase auth context provides auth.uid() function
-- This returns the authenticated user's ID from JWT token
-- For API routes, we'll use service role which bypasses RLS

-- ---------------------------------------------
-- USERS TABLE (Customers)
-- ---------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Anyone can insert (registration)
CREATE POLICY "Anyone can register"
  ON users
  FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------
-- BUSINESSES TABLE
-- ---------------------------------------------

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Anyone can view active businesses (for NFC tap lookup)
CREATE POLICY "Anyone can view active businesses"
  ON businesses
  FOR SELECT
  USING (true);

-- Business admins can update their own business
CREATE POLICY "Admins can update own business"
  ON businesses
  FOR UPDATE
  USING (
    id IN (
      SELECT business_id
      FROM business_admins
      WHERE id = auth.uid()
    )
  );

-- Anyone can insert (business registration)
CREATE POLICY "Anyone can register business"
  ON businesses
  FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------
-- BUSINESS ADMINS TABLE
-- ---------------------------------------------

ALTER TABLE business_admins ENABLE ROW LEVEL SECURITY;

-- Admins can view their own profile
CREATE POLICY "Admins can view own profile"
  ON business_admins
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can update their own profile
CREATE POLICY "Admins can update own profile"
  ON business_admins
  FOR UPDATE
  USING (auth.uid() = id);

-- Anyone can insert (admin registration during business signup)
CREATE POLICY "Anyone can register as admin"
  ON business_admins
  FOR INSERT
  WITH CHECK (true);

-- ---------------------------------------------
-- PUNCH CARDS TABLE
-- ---------------------------------------------

ALTER TABLE punch_cards ENABLE ROW LEVEL SECURITY;

-- Users can view their own punch cards
CREATE POLICY "Users can view own punch cards"
  ON punch_cards
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own punch cards
CREATE POLICY "Users can create own punch cards"
  ON punch_cards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own punch cards
CREATE POLICY "Users can update own punch cards"
  ON punch_cards
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Business admins can view punch cards for their business
CREATE POLICY "Business admins can view business punch cards"
  ON punch_cards
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id
      FROM business_admins
      WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------
-- PUNCHES TABLE
-- ---------------------------------------------

ALTER TABLE punches ENABLE ROW LEVEL SECURITY;

-- Users can view their own punches
CREATE POLICY "Users can view own punches"
  ON punches
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own punches
CREATE POLICY "Users can create own punches"
  ON punches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Business admins can view punches for their business
CREATE POLICY "Business admins can view business punches"
  ON punches
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id
      FROM business_admins
      WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------
-- PRIZES TABLE
-- ---------------------------------------------

ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

-- Anyone can view active prizes
CREATE POLICY "Anyone can view active prizes"
  ON prizes
  FOR SELECT
  USING (is_active = true);

-- Business admins can view all prizes for their business (including inactive)
CREATE POLICY "Business admins can view own prizes"
  ON prizes
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id
      FROM business_admins
      WHERE id = auth.uid()
    )
  );

-- Business admins can insert prizes for their business
CREATE POLICY "Business admins can create prizes"
  ON prizes
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id
      FROM business_admins
      WHERE id = auth.uid()
    )
  );

-- Business admins can update their own prizes
CREATE POLICY "Business admins can update own prizes"
  ON prizes
  FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id
      FROM business_admins
      WHERE id = auth.uid()
    )
  );

-- Business admins can delete their own prizes
CREATE POLICY "Business admins can delete own prizes"
  ON prizes
  FOR DELETE
  USING (
    business_id IN (
      SELECT business_id
      FROM business_admins
      WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------
-- REDEEMED PRIZES TABLE
-- ---------------------------------------------

ALTER TABLE redeemed_prizes ENABLE ROW LEVEL SECURITY;

-- Users can view their own redeemed prizes
CREATE POLICY "Users can view own redeemed prizes"
  ON redeemed_prizes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own redemptions
CREATE POLICY "Users can create redemptions"
  ON redeemed_prizes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Business admins can view redemptions for their business
CREATE POLICY "Business admins can view business redemptions"
  ON redeemed_prizes
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id
      FROM business_admins
      WHERE id = auth.uid()
    )
  );

-- ---------------------------------------------
-- USER SESSIONS TABLE (Customers)
-- ---------------------------------------------

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can create sessions"
  ON user_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sessions (logout)
CREATE POLICY "Users can delete own sessions"
  ON user_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------
-- BUSINESS ADMIN SESSIONS TABLE
-- ---------------------------------------------

ALTER TABLE business_admin_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can view their own sessions
CREATE POLICY "Admins can view own sessions"
  ON business_admin_sessions
  FOR SELECT
  USING (auth.uid() = admin_id);

-- Admins can insert their own sessions
CREATE POLICY "Admins can create sessions"
  ON business_admin_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

-- Admins can delete their own sessions (logout)
CREATE POLICY "Admins can delete own sessions"
  ON business_admin_sessions
  FOR DELETE
  USING (auth.uid() = admin_id);

-- ---------------------------------------------
-- SUBSCRIPTIONS TABLE
-- ---------------------------------------------

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Business admins can view their own subscription
CREATE POLICY "Admins can view own subscription"
  ON subscriptions
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id
      FROM business_admins
      WHERE id = auth.uid()
    )
  );

-- Service role can manage subscriptions (Stripe webhooks)
-- No INSERT/UPDATE policies for regular users - only service role

-- ---------------------------------------------
-- NOTES ON SERVICE ROLE
-- ---------------------------------------------

-- API routes will use the service role key to bypass RLS when needed
-- This is necessary for:
-- 1. Authentication (login, register) - users don't have auth.uid() yet
-- 2. NFC tap lookups - need to find business by NFC tag
-- 3. Stripe webhooks - updating subscriptions from external service
-- 4. Admin operations - creating business with admin account atomically

-- To use service role in Next.js API routes:
-- import { createClient } from '@supabase/supabase-js'
-- const supabase = createClient(
--   process.env.NEXT_PUBLIC_SUPABASE_URL,
--   process.env.SUPABASE_SERVICE_ROLE_KEY -- Server-side only!
-- )

-- ===========================================
-- SECURITY BEST PRACTICES
-- ===========================================

-- 1. Never expose service role key to client
-- 2. Use anon key for client-side Supabase client
-- 3. RLS policies are your second line of defense
-- 4. Always validate user input in API routes
-- 5. Use server-side API routes for sensitive operations
-- 6. Audit auth.uid() usage to prevent privilege escalation

-- ===========================================
-- END OF RLS POLICIES
-- ===========================================
