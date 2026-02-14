import { NextResponse } from 'next/server';
import { getCurrentCustomer } from '@/lib/auth/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

export async function GET() {
  try {
    if (isDemoMode) {
      return NextResponse.json({ punch_cards: [], demo: true });
    }

    const user = await getCurrentCustomer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getSupabaseServer();

    // Get all punch cards for the user with business info
    const { data: punchCards, error } = await db
      .from('punch_cards')
      .select(`
        id,
        current_punches,
        total_punches,
        created_at,
        updated_at,
        businesses:business_id (
          id,
          name,
          description,
          logo_url,
          nfc_tag_id,
          max_punches
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Punch cards fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch punch cards' },
        { status: 500 }
      );
    }

    // Get recent punches for history
    const { data: recentPunches } = await db
      .from('punches')
      .select(`
        id,
        created_at,
        businesses:business_id (name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get redeemed prizes
    const { data: redeemedPrizes } = await db
      .from('redeemed_prizes')
      .select(`
        id,
        redeemed_at,
        prizes:prize_id (name, description, punches_required),
        businesses:business_id (name)
      `)
      .eq('user_id', user.id)
      .order('redeemed_at', { ascending: false });

    return NextResponse.json({
      punch_cards: punchCards || [],
      recent_punches: recentPunches || [],
      redeemed_prizes: redeemedPrizes || [],
    });
  } catch (error) {
    console.error('Punch cards error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch punch cards' },
      { status: 500 }
    );
  }
}
