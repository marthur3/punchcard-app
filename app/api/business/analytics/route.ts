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

    // Total punches at this business
    const { count: totalPunches } = await db
      .from('punches')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    // Active users (users with punch cards at this business)
    const { count: activeUsers } = await db
      .from('punch_cards')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    // Prizes redeemed
    const { count: prizesRedeemed } = await db
      .from('redeemed_prizes')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    // Average punches per user
    const { data: avgData } = await db
      .from('punch_cards')
      .select('total_punches')
      .eq('business_id', businessId);

    const avgPunches = avgData && avgData.length > 0
      ? avgData.reduce((sum: number, card: any) => sum + card.total_punches, 0) / avgData.length
      : 0;

    return NextResponse.json({
      total_punches: totalPunches || 0,
      active_users: activeUsers || 0,
      prizes_redeemed: prizesRedeemed || 0,
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
