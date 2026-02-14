import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// ===========================================
// DEMO MODE DETECTION
// ===========================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export const isDemoMode =
  !supabaseUrl ||
  supabaseUrl === "https://demo.supabase.co" ||
  process.env.ENABLE_DEMO_MODE === "true"

// ===========================================
// CLIENT-SIDE SUPABASE (anon key, respects RLS)
// ===========================================

// Create a mock client for demo mode
const createMockClient = () => {
  return {
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
          limit: (count: number) => Promise.resolve({ data: [], error: null }),
          gt: (column: string, value: any) => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
          lte: (column: string, value: any) => Promise.resolve({ data: [], error: null }),
        }),
        order: (column: string, options?: any) => ({
          limit: (count: number) => Promise.resolve({ data: [], error: null }),
        }),
        limit: (count: number) => Promise.resolve({ data: [], error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      insert: (data: any) => ({
        select: (columns?: string) => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: (columns?: string) => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: (column: string, value: any) => Promise.resolve({ data: null, error: null }),
      }),
    }),
  }
}

// Public client (for client-side use with anon key)
export const supabase: SupabaseClient | any = isDemoMode
  ? createMockClient()
  : createClient(supabaseUrl, supabaseAnonKey)

// ===========================================
// SERVER-SIDE SUPABASE (service role key, bypasses RLS)
// ===========================================

let _supabaseServer: SupabaseClient | null = null

export function getSupabaseServer(): SupabaseClient {
  if (isDemoMode) {
    throw new Error("Cannot use server Supabase in demo mode")
  }
  if (!_supabaseServer) {
    if (!supabaseServiceKey) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
    }
    _supabaseServer = createClient(supabaseUrl, supabaseServiceKey)
  }
  return _supabaseServer
}

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          name: string
          description: string | null
          logo_url: string | null
          nfc_tag_id: string | null
          max_punches: number
          created_at: string
          updated_at: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          password_hash: string | null
          is_verified: boolean
          created_at: string
          updated_at: string
        }
      }
      punch_cards: {
        Row: {
          id: string
          user_id: string
          business_id: string
          current_punches: number
          total_punches: number
          created_at: string
          updated_at: string
        }
      }
      prizes: {
        Row: {
          id: string
          business_id: string
          name: string
          description: string | null
          punches_required: number
          image_url: string | null
          is_active: boolean
          created_at: string
        }
      }
      punches: {
        Row: {
          id: string
          punch_card_id: string
          user_id: string
          business_id: string
          location_data: any
          created_at: string
        }
      }
      redeemed_prizes: {
        Row: {
          id: string
          user_id: string
          business_id: string
          prize_id: string
          punch_card_id: string
          redeemed_at: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          expires_at: string
          created_at: string
        }
      }
      business_admins: {
        Row: {
          id: string
          business_id: string
          email: string
          name: string
          password_hash: string
          is_verified: boolean
          role: string
          created_at: string
          updated_at: string
          last_login: string | null
        }
      }
      business_admin_sessions: {
        Row: {
          id: string
          admin_id: string
          session_token: string
          expires_at: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
      }
    }
  }
}
