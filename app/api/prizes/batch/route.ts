import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

// GET /api/prizes/batch?business_ids=id1,id2,id3
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessIdsParam = searchParams.get('business_ids');

    if (!businessIdsParam) {
      return NextResponse.json({ prizes: [] });
    }

    const businessIds = businessIdsParam.split(',').filter(Boolean);
    if (businessIds.length === 0) {
      return NextResponse.json({ prizes: [] });
    }

    if (isDemoMode) {
      const { demoPrizes } = await import('@/lib/demo-data');
      const registeredPrizes = typeof globalThis !== 'undefined'
        ? [] // localStorage not available server-side; client handles demo merge
        : [];
      const allPrizes = [...demoPrizes, ...registeredPrizes];
      const filtered = allPrizes.filter((p) => businessIds.includes(p.business_id));
      return NextResponse.json({ prizes: filtered });
    }

    const db = getSupabaseServer();
    const { data: prizes, error } = await db
      .from('prizes')
      .select('id, business_id, name, description, punches_required, image_url, is_active, created_at')
      .eq('is_active', true)
      .in('business_id', businessIds)
      .order('punches_required');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch prizes' },
        { status: 500 }
      );
    }

    return NextResponse.json({ prizes: prizes || [] });
  } catch (error) {
    console.error('Batch prizes fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prizes' },
      { status: 500 }
    );
  }
}
