import { createClient } from "@supabase/supabase-js"

// For demo purposes, we'll use fallback values if environment variables aren't set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://demo.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "demo-key"

// Create a mock client for demo purposes when real Supabase isn't configured
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
        order: (column: string, options?: any) => Promise.resolve({ data: [], error: null }),
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

// Use real Supabase client if configured, otherwise use mock
export const supabase =
  supabaseUrl !== "https://demo.supabase.co" && supabaseAnonKey !== "demo-key"
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (createMockClient() as any)

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
    }
  }
}
