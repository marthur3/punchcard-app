import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

// GET /api/leaderboard?business_id=xxx&limit=10
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (isDemoMode) {
      const { generateLeaderboardData, getBusinessLeaderboard } = await import('@/lib/demo-data');
      if (businessId) {
        return NextResponse.json({ leaderboard: getBusinessLeaderboard(businessId) });
      }
      return NextResponse.json({ leaderboard: generateLeaderboardData() });
    }

    const db = getSupabaseServer();

    if (businessId) {
      // Business-specific leaderboard
      const { data: entries, error } = await db
        .from('punch_cards')
        .select(`
          total_punches,
          current_punches,
          users:user_id (id, name)
        `)
        .eq('business_id', businessId)
        .order('total_punches', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Business leaderboard error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch leaderboard' },
          { status: 500 }
        );
      }

      const leaderboard = (entries || []).map((entry: any, index: number) => ({
        rank: index + 1,
        user_id: entry.users?.id,
        display_name: entry.users?.name || 'Anonymous',
        total_punches: entry.total_punches,
        current_punches: entry.current_punches,
        tier: getTier(entry.total_punches),
      }));

      return NextResponse.json({ leaderboard });
    }

    // Global leaderboard - aggregate total_punches across all businesses
    const { data: entries, error } = await db
      .rpc('get_global_leaderboard', { result_limit: limit });

    if (error) {
      // Fallback: simple query if RPC doesn't exist
      const { data: fallbackEntries } = await db
        .from('punch_cards')
        .select(`
          user_id,
          total_punches,
          users:user_id (id, name)
        `)
        .order('total_punches', { ascending: false })
        .limit(limit);

      // Aggregate by user
      const userMap = new Map<string, { name: string; total: number }>();
      for (const entry of fallbackEntries || []) {
        const userId = entry.user_id;
        const existing = userMap.get(userId);
        if (existing) {
          existing.total += entry.total_punches;
        } else {
          userMap.set(userId, {
            name: (entry.users as any)?.name || 'Anonymous',
            total: entry.total_punches,
          });
        }
      }

      const leaderboard = Array.from(userMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, limit)
        .map(([userId, data], index) => ({
          rank: index + 1,
          user_id: userId,
          display_name: data.name,
          total_punches: data.total,
          tier: getTier(data.total),
        }));

      return NextResponse.json({ leaderboard });
    }

    const leaderboard = (entries || []).map((entry: any, index: number) => ({
      rank: index + 1,
      user_id: entry.user_id,
      display_name: entry.name || 'Anonymous',
      total_punches: entry.total_punches,
      tier: getTier(entry.total_punches),
    }));

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

function getTier(totalPunches: number): string {
  if (totalPunches >= 50) return 'platinum';
  if (totalPunches >= 30) return 'gold';
  if (totalPunches >= 15) return 'silver';
  if (totalPunches >= 5) return 'bronze';
  return 'none';
}
