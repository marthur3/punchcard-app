import { NextRequest, NextResponse } from 'next/server';
import { createBusinessSchema } from '@/lib/validations';
import { getCurrentCustomer } from '@/lib/auth/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || '';

async function requireSuperAdmin() {
  if (isDemoMode) {
    return { id: 'demo-admin', email: 'admin@tapranked.com' };
  }
  const user = await getCurrentCustomer();
  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    return null;
  }
  return user;
}

// GET /api/admin/businesses - list all businesses
export async function GET() {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (isDemoMode) {
      const { demoBusinesses } = await import('@/lib/demo-data');
      return NextResponse.json({ businesses: demoBusinesses });
    }

    const db = getSupabaseServer();
    const { data: businesses, error } = await db
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 });
    }

    return NextResponse.json({ businesses: businesses || [] });
  } catch (error) {
    console.error('Admin businesses list error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/admin/businesses - create a new business
export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createBusinessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    if (isDemoMode) {
      return NextResponse.json({ error: 'Cannot create businesses in demo mode' }, { status: 400 });
    }

    const { name, description, max_punches, logo_url } = parsed.data;
    const db = getSupabaseServer();

    // Generate NFC tag ID
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    const nfcTagId = `nfc_${slug}_${Date.now()}`;

    const { data: business, error } = await db
      .from('businesses')
      .insert({
        name,
        description: description || null,
        max_punches,
        logo_url: logo_url || null,
        nfc_tag_id: nfcTagId,
      })
      .select('*')
      .single();

    if (error || !business) {
      console.error('Business creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create business' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      business,
      nfc_url: `/tap?nfc=${nfcTagId}`,
    });
  } catch (error) {
    console.error('Admin business creation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
