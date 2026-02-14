import { NextRequest, NextResponse } from 'next/server';
import { createPrizeSchema } from '@/lib/validations';
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

// POST /api/admin/prizes - create a prize for a business
export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createPrizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    if (isDemoMode) {
      return NextResponse.json({ error: 'Cannot create prizes in demo mode' }, { status: 400 });
    }

    const { business_id, name, description, punches_required, is_active } = parsed.data;
    const db = getSupabaseServer();

    // Verify business exists
    const { data: business } = await db
      .from('businesses')
      .select('id')
      .eq('id', business_id)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const { data: prize, error } = await db
      .from('prizes')
      .insert({
        business_id,
        name,
        description: description || null,
        punches_required,
        is_active: is_active ?? true,
      })
      .select('*')
      .single();

    if (error || !prize) {
      console.error('Prize creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create prize' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, prize });
  } catch (error) {
    console.error('Admin prize creation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
