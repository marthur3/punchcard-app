# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application  
- `npm run start` - Start production server
- `npm run lint` - Run ESLint linter

## Architecture Overview

This is a **digital punch card application** built with Next.js 15 (App Router), TypeScript, and Supabase. The app allows users to collect punches from businesses and redeem rewards.

### Core Components

- **Authentication System** (`lib/auth.ts`, `lib/auth-context.tsx`)
  - Custom session-based auth with both real Supabase and demo mode
  - Demo users can login with `demo@example.com` / `demo123`
  - Session tokens stored in localStorage for demo mode
  
- **Database Layer** (`lib/supabase.ts`)
  - Supabase client with mock fallback for demo purposes
  - TypeScript database schema definitions
  - Main tables: users, businesses, punch_cards, punches, prizes, redeemed_prizes

- **UI Components** (`components/ui/`)
  - Built with Radix UI primitives and Tailwind CSS
  - shadcn/ui component library structure

### App Structure

- `/auth/login`, `/auth/register` - Authentication pages
- `/dashboard` - User dashboard showing punch cards
- `/punch` - Punch collection interface
- `/tap` - NFC tap interaction page
- `/business` - Business management interface
- `/analytics` - Analytics and reporting

### Database Schema

Key relationships:
- Users have multiple punch_cards (one per business)
- Each punch_card tracks current_punches and total_punches
- Businesses define prizes with punches_required thresholds
- Individual punches are logged with location data
- Prize redemptions are tracked separately

### Development Notes

- Uses custom auth implementation (not Supabase Auth)
- Supports both real database and demo mode with mock data
- SQL scripts in `/scripts/` folder for database setup
- Fixed design (no theme switching to avoid hydration issues)
- Geist font family for typography

### Testing Complete NFC Workflow

To test the full NFC → login → punch → progress workflow:

1. **Simulate NFC tap**: Visit `/tap?nfc=nfc_coffee_001` (Coffee Corner)
2. **Login as demo user**: Use `demo@example.com` / `demo123`
3. **Collect punches**: Tap the NFC button to add punches
4. **View progress**: Check dashboard at `/dashboard` to see updated punch cards
5. **Business analytics**: Visit `/business` to see analytics update in real-time

Demo NFC tag IDs:
- Coffee Corner: `nfc_coffee_001`
- Pizza Palace: `nfc_pizza_001` 
- Burger Barn: `nfc_burger_001`

### Business Onboarding Workflow

Complete business registration and setup process:

1. **Business Registration** (`/business/signup`):
   - 5-step form: Business info → Location → Admin account → Punch card config → Plan selection
   - Generates unique NFC tag ID automatically
   - Creates initial admin session

2. **Onboarding Wizard** (`/business/onboarding`):
   - Welcome and account confirmation
   - NFC tag information and URL generation
   - Downloadable label templates (SVG format)
   - Customer experience testing
   - Placement best practices guide
   - Setup completion

3. **Business Portal Enhancement**:
   - Supports both demo and registered businesses
   - New "NFC Tags" tab with tag management
   - Copy NFC tag ID and customer URLs
   - Tag placement guidance
   - Integration with localStorage for demo mode

### Key URLs for Testing

- `/` - Business landing page with CTA
- `/business/signup` - Business registration flow
- `/business/onboarding` - Post-registration setup wizard
- `/tap?nfc=nfc_coffee_001` - NFC tap simulation
- `/auth/login` - Customer login
- `/dashboard` - Customer punch cards and progress
- `/business` - Business portal with analytics and prize management

### NFC Tag Management

- Each business gets unique `nfc_tag_id` (format: `nfc_businessname_timestamp`)
- Customer tap URLs: `/tap?nfc={nfc_tag_id}`
- Tag IDs stored in localStorage (demo) or Supabase (production)
- Business portal provides copy-paste URLs for NFC programming
- SVG label templates for physical tag printing