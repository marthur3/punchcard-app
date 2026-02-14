import { z } from 'zod';

// ===========================================
// AUTH SCHEMAS
// ===========================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  name: z.string().min(1, 'Name is required').max(255),
  phone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ===========================================
// PUNCH SCHEMAS
// ===========================================

export const collectPunchSchema = z.object({
  nfc_tag_id: z.string().min(1, 'NFC tag ID is required'),
});

// ===========================================
// PRIZE SCHEMAS
// ===========================================

export const redeemPrizeSchema = z.object({
  prize_id: z.string().uuid('Invalid prize ID'),
  business_id: z.string().uuid('Invalid business ID'),
});

export const createPrizeSchema = z.object({
  business_id: z.string().uuid('Invalid business ID'),
  name: z.string().min(1, 'Prize name is required').max(255),
  description: z.string().max(1000).optional(),
  punches_required: z.number().int().min(1).max(100),
  is_active: z.boolean().optional().default(true),
});

export const updatePrizeSchema = z.object({
  id: z.string().uuid('Invalid prize ID'),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  punches_required: z.number().int().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
});

// ===========================================
// BUSINESS SCHEMAS
// ===========================================

export const createBusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(255),
  description: z.string().max(1000).optional(),
  max_punches: z.number().int().min(1).max(50).default(10),
  logo_url: z.string().url().optional(),
});

export const businessSignupSchema = z.object({
  // Business info
  business_name: z.string().min(1).max(255),
  business_description: z.string().max(1000).optional(),
  business_type: z.string().max(100).optional(),
  business_phone: z.string().max(20).optional(),
  business_website: z.string().max(500).optional(),
  // Location
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  // Admin account
  admin_name: z.string().min(1).max(255),
  admin_email: z.string().email().max(255),
  admin_password: z.string().min(6).max(128),
  // Punch card config
  max_punches: z.number().int().min(1).max(50).default(10),
  default_reward: z.string().max(255).optional(),
  reward_description: z.string().max(1000).optional(),
});

// ===========================================
// LEADERBOARD SCHEMAS
// ===========================================

export const leaderboardQuerySchema = z.object({
  business_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CollectPunchInput = z.infer<typeof collectPunchSchema>;
export type RedeemPrizeInput = z.infer<typeof redeemPrizeSchema>;
export type CreatePrizeInput = z.infer<typeof createPrizeSchema>;
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type BusinessSignupInput = z.infer<typeof businessSignupSchema>;
