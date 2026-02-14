import { NextRequest, NextResponse } from 'next/server';
import { redeemPrizeSchema } from '@/lib/validations';
import { getCurrentCustomer } from '@/lib/auth/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (isDemoMode) {
      return NextResponse.json(
        { error: 'Prize redemption not available in demo mode via API' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = redeemPrizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const user = await getCurrentCustomer();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prize_id, business_id } = parsed.data;
    const db = getSupabaseServer();

    // Get the prize
    const { data: prize, error: prizeError } = await db
      .from('prizes')
      .select('id, name, punches_required, business_id, is_active')
      .eq('id', prize_id)
      .eq('business_id', business_id)
      .single();

    if (prizeError || !prize) {
      return NextResponse.json(
        { error: 'Prize not found' },
        { status: 404 }
      );
    }

    if (!prize.is_active) {
      return NextResponse.json(
        { error: 'This prize is no longer available' },
        { status: 400 }
      );
    }

    // Get user's punch card for this business
    const { data: punchCard } = await db
      .from('punch_cards')
      .select('id, current_punches, total_punches')
      .eq('user_id', user.id)
      .eq('business_id', business_id)
      .single();

    if (!punchCard) {
      return NextResponse.json(
        { error: 'No punch card found for this business' },
        { status: 400 }
      );
    }

    if (punchCard.current_punches < prize.punches_required) {
      return NextResponse.json(
        { error: `You need ${prize.punches_required - punchCard.current_punches} more punches to redeem this prize` },
        { status: 400 }
      );
    }

    // Record redemption
    const { error: redeemError } = await db.from('redeemed_prizes').insert({
      user_id: user.id,
      business_id,
      prize_id,
      punch_card_id: punchCard.id,
    });

    if (redeemError) {
      console.error('Prize redemption error:', redeemError);
      return NextResponse.json(
        { error: 'Failed to redeem prize' },
        { status: 500 }
      );
    }

    // Deduct punches from card
    const newCurrentPunches = punchCard.current_punches - prize.punches_required;
    await db
      .from('punch_cards')
      .update({
        current_punches: newCurrentPunches,
        updated_at: new Date().toISOString(),
      })
      .eq('id', punchCard.id);

    return NextResponse.json({
      success: true,
      redemption: {
        prize_name: prize.name,
        remaining_punches: newCurrentPunches,
      },
    });
  } catch (error) {
    console.error('Prize redemption error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem prize' },
      { status: 500 }
    );
  }
}
