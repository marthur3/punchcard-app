import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

export async function GET() {
  try {
    if (isDemoMode) {
      return NextResponse.json({
        total_punches: 156,
        active_users: 24,
        prizes_redeemed: 8,
        avg_punches_per_user: 6.5,
        demo: true,
      });
    }

    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSupabaseServer();
    const businessId = admin.business_id;

    // Run all independent count queries in parallel
    const [punchesResult, usersResult, redeemedResult, avgResult] = await Promise.all([
      db.from('punches').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
      db.from('punch_cards').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
      db.from('redeemed_prizes').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
      db.from('punch_cards').select('total_punches').eq('business_id', businessId),
    ]);

    const avgPunches = avgResult.data && avgResult.data.length > 0
      ? avgResult.data.reduce((sum: number, card: { total_punches: number }) => sum + card.total_punches, 0) / avgResult.data.length
      : 0;

    return NextResponse.json({
      total_punches: punchesResult.count || 0,
      active_users: usersResult.count || 0,
      prizes_redeemed: redeemedResult.count || 0,
      avg_punches_per_user: Math.round(avgPunches * 10) / 10,
    });
  } catch (error) {
    console.error('Business analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
