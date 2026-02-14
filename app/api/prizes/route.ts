import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

// GET /api/prizes?business_id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    if (isDemoMode) {
      const { demoPrizes } = await import('@/lib/demo-data');
      const filtered = businessId
        ? demoPrizes.filter((p: any) => p.business_id === businessId)
        : demoPrizes;
      return NextResponse.json({ prizes: filtered });
    }

    const db = getSupabaseServer();

    let query = db
      .from('prizes')
      .select('id, business_id, name, description, punches_required, image_url, is_active, created_at')
      .eq('is_active', true);

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data: prizes, error } = await query.order('punches_required');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch prizes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prizes: prizes || [] });
  } catch (error) {
    console.error('Prizes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prizes' },
      { status: 500 }
    );
  }
}
