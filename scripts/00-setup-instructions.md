# Supabase Database Setup

## Prerequisites
1. Create a Supabase project at https://supabase.com
2. Copy your project URL, anon key, and service role key into `.env.local` (see `.env.example`)

## SQL Script Run Order

Run these scripts in the Supabase SQL Editor in order:

1. **`01-create-tables.sql`** - Core tables: users, businesses, punch_cards, punches, prizes, redeemed_prizes
2. **`04-business-admin-tables.sql`** - Business admin tables: business_admins, business_admin_sessions
3. **`05-row-level-security.sql`** - Row Level Security policies
4. **`06-indexes-performance.sql`** - Performance indexes

### Optional scripts
- `02-seed-data.sql` - Sample data for testing (demo businesses, prizes)
- `03-create-demo-user.sql` - Creates a demo customer user

## Notes
- The `subscriptions` table is not yet needed (Stripe integration not active)
- Demo mode works without Supabase — just omit the env vars and the app falls back to localStorage
- In production, set all three Supabase env vars to enable real database mode
