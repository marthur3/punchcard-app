import { NextRequest, NextResponse } from 'next/server';
import { createPrizeSchema, updatePrizeSchema } from '@/lib/validations';
import { getCurrentAdmin } from '@/lib/auth/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

// GET /api/business/prizes - get prizes for admin's business
export async function GET() {
  try {
    if (isDemoMode) {
      const { demoPrizes } = await import('@/lib/demo-data');
      return NextResponse.json({ prizes: demoPrizes, demo: true });
    }

    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSupabaseServer();
    const { data: prizes, error } = await db
      .from('prizes')
      .select('*')
      .eq('business_id', admin.business_id)
      .order('punches_required');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch prizes' }, { status: 500 });
    }

    return NextResponse.json({ prizes: prizes || [] });
  } catch (error) {
    console.error('Business prizes error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/business/prizes - create a prize
export async function POST(request: NextRequest) {
  try {
    if (isDemoMode) {
      return NextResponse.json({ error: 'Cannot create prizes in demo mode' }, { status: 400 });
    }

    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPrizeSchema.safeParse({
      ...body,
      business_id: admin.business_id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const db = getSupabaseServer();
    const { data: prize, error } = await db
      .from('prizes')
      .insert({
        business_id: admin.business_id,
        name: parsed.data.name,
        description: parsed.data.description || null,
        punches_required: parsed.data.punches_required,
        is_active: parsed.data.is_active ?? true,
      })
      .select('*')
      .single();

    if (error || !prize) {
      return NextResponse.json({ error: 'Failed to create prize' }, { status: 500 });
    }

    return NextResponse.json({ success: true, prize });
  } catch (error) {
    console.error('Prize creation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/business/prizes - update a prize
export async function PATCH(request: NextRequest) {
  try {
    if (isDemoMode) {
      return NextResponse.json({ error: 'Cannot update prizes in demo mode' }, { status: 400 });
    }

    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updatePrizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const db = getSupabaseServer();

    // Verify prize belongs to admin's business
    const { data: existingPrize } = await db
      .from('prizes')
      .select('id, business_id')
      .eq('id', parsed.data.id)
      .eq('business_id', admin.business_id)
      .single();

    if (!existingPrize) {
      return NextResponse.json({ error: 'Prize not found' }, { status: 404 });
    }

    const updates: any = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.punches_required !== undefined) updates.punches_required = parsed.data.punches_required;
    if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;

    const { data: prize, error } = await db
      .from('prizes')
      .update(updates)
      .eq('id', parsed.data.id)
      .select('*')
      .single();

    if (error || !prize) {
      return NextResponse.json({ error: 'Failed to update prize' }, { status: 500 });
    }

    return NextResponse.json({ success: true, prize });
  } catch (error) {
    console.error('Prize update error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
