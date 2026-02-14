/**
 * SECURE SERVER-SIDE AUTHENTICATION UTILITIES
 *
 * CRITICAL SECURITY FIXES:
 * - Replaces weak SHA-256 + static salt with bcrypt (12 rounds)
 * - Replaces Math.random() tokens with crypto.randomBytes()
 * - No credential logging
 * - Server-side only - NEVER import this in client components
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '../supabase';

// Lazy accessor - only creates client when actually called
function getDb() {
  return getSupabaseServer();
}

// ===========================================
// PASSWORD HASHING (BCRYPT)
// ===========================================

/**
 * Hash password with bcrypt (12 rounds)
 *
 * Security improvements over old SHA-256 approach:
 * - Automatic salt generation (unique per password)
 * - Configurable work factor (12 rounds = ~250ms on modern CPU)
 * - Resistant to rainbow table attacks
 * - Adaptive to future hardware (can increase rounds)
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Higher = more secure, slower (12 is industry standard)
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against bcrypt hash
 *
 * Timing-safe comparison to prevent timing attacks
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    // Invalid hash format or other error
    return false;
  }
}

// ===========================================
// SESSION TOKEN GENERATION
// ===========================================

/**
 * Generate cryptographically secure session token
 *
 * Security improvements over old Math.random() approach:
 * - Uses crypto.randomBytes() - cryptographically secure RNG
 * - 32 bytes (256 bits) of entropy
 * - Base64url encoding (URL-safe, no padding)
 * - Unpredictable even if previous tokens are known
 */
export async function generateSessionToken(): Promise<string> {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate verification token for email verification
 *
 * Same security properties as session tokens
 */
export async function generateVerificationToken(): Promise<string> {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate password reset token
 *
 * Same security properties as session tokens
 */
export async function generateResetToken(): Promise<string> {
  return crypto.randomBytes(32).toString('base64url');
}

// ===========================================
// SESSION MANAGEMENT
// ===========================================

const SESSION_COOKIE_NAME = 'auth_token';
const ADMIN_SESSION_COOKIE_NAME = 'admin_token';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Set customer session cookie
 */
export async function setCustomerSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Set business admin session cookie
 */
export async function setAdminSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

/**
 * Get customer session token from cookie
 */
export async function getCustomerSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME);
  return token?.value || null;
}

/**
 * Get business admin session token from cookie
 */
export async function getAdminSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME);
  return token?.value || null;
}

/**
 * Clear customer session cookie
 */
export async function clearCustomerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Clear business admin session cookie
 */
export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME);
}

// ===========================================
// CURRENT USER RETRIEVAL
// ===========================================

export interface CustomerUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  is_verified: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  business_id: string;
  role: string;
  is_verified: boolean;
}

/**
 * Get current authenticated customer from session
 *
 * Returns null if not authenticated or session expired
 */
export async function getCurrentCustomer(): Promise<CustomerUser | null> {
  const token = await getCustomerSessionToken();
  if (!token) return null;

  // Verify session exists and is not expired
  const { data: session } = await getDb()
    .from('user_sessions')
    .select('user_id, expires_at')
    .eq('session_token', token)
    .single();

  if (!session) return null;

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    // Session expired, clean up
    await getDb()
      .from('user_sessions')
      .delete()
      .eq('session_token', token);
    await clearCustomerSession();
    return null;
  }

  // Fetch user data
  const { data: user } = await getDb()
    .from('users')
    .select('id, email, name, phone, is_verified')
    .eq('id', session.user_id)
    .single();

  return user;
}

/**
 * Get current authenticated business admin from session
 *
 * Returns null if not authenticated or session expired
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const token = await getAdminSessionToken();
  if (!token) return null;

  // Verify session exists and is not expired
  const { data: session } = await getDb()
    .from('business_admin_sessions')
    .select('admin_id, expires_at')
    .eq('session_token', token)
    .single();

  if (!session) return null;

  // Check expiration
  if (new Date(session.expires_at) < new Date()) {
    // Session expired, clean up
    await getDb()
      .from('business_admin_sessions')
      .delete()
      .eq('session_token', token);
    await clearAdminSession();
    return null;
  }

  // Fetch admin data
  const { data: admin } = await getDb()
    .from('business_admins')
    .select('id, email, name, business_id, role, is_verified')
    .eq('id', session.admin_id)
    .single();

  return admin;
}

/**
 * Require authenticated customer (throws if not authenticated)
 *
 * Use in API routes that require customer authentication
 */
export async function requireCustomer(): Promise<CustomerUser> {
  const user = await getCurrentCustomer();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Require authenticated admin (throws if not authenticated)
 *
 * Use in API routes that require business admin authentication
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error('Unauthorized');
  }
  return admin;
}

/**
 * Require verified email (throws if not verified)
 */
export async function requireVerifiedCustomer(): Promise<CustomerUser> {
  const user = await requireCustomer();
  if (!user.is_verified) {
    throw new Error('Email not verified');
  }
  return user;
}

/**
 * Require verified admin email (throws if not verified)
 */
export async function requireVerifiedAdmin(): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (!admin.is_verified) {
    throw new Error('Email not verified');
  }
  return admin;
}

// ===========================================
// LOGOUT
// ===========================================

/**
 * Logout customer (delete session from database and clear cookie)
 */
export async function logoutCustomer(token?: string) {
  const sessionToken = token || (await getCustomerSessionToken());
  if (sessionToken) {
    await getDb()
      .from('user_sessions')
      .delete()
      .eq('session_token', sessionToken);
  }
  await clearCustomerSession();
}

/**
 * Logout business admin (delete session from database and clear cookie)
 */
export async function logoutAdmin(token?: string) {
  const sessionToken = token || (await getAdminSessionToken());
  if (sessionToken) {
    await getDb()
      .from('business_admin_sessions')
      .delete()
      .eq('session_token', sessionToken);
  }
  await clearAdminSession();
}

// ===========================================
// SECURITY NOTES
// ===========================================

/**
 * IMPORTANT SECURITY CONSIDERATIONS:
 *
 * 1. NEVER import this file in client components
 * 2. NEVER log passwords or session tokens
 * 3. Always use HTTPS in production (enforced by cookie secure flag)
 * 4. Session tokens are stored in HTTP-only cookies (not accessible to JavaScript)
 * 5. SameSite=Lax prevents CSRF attacks
 * 6. Bcrypt work factor (12 rounds) should be reviewed annually
 * 7. Session duration (7 days) should match business requirements
 * 8. Consider implementing session refresh tokens for better UX
 * 9. Monitor for suspicious session activity (multiple IPs, rapid logins, etc.)
 * 10. Implement account lockout after N failed login attempts
 */
