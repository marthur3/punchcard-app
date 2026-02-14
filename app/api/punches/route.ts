import { NextRequest, NextResponse } from 'next/server';
import { collectPunchSchema } from '@/lib/validations';
import { getCurrentCustomer } from '@/lib/auth/server';
import { getSupabaseServer, isDemoMode } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = collectPunchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { nfc_tag_id } = parsed.data;

    if (isDemoMode) {
      return NextResponse.json(
        { error: 'Punches not available in demo mode via API' },
        { status: 400 }
      );
    }

    // Require authenticated user
    const user = await getCurrentCustomer();
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to collect punches' },
        { status: 401 }
      );
    }

    const db = getSupabaseServer();

    // Find business by NFC tag
    const { data: business, error: bizError } = await db
      .from('businesses')
      .select('id, name, max_punches')
      .eq('nfc_tag_id', nfc_tag_id)
      .single();

    if (bizError || !business) {
      return NextResponse.json(
        { error: 'Business not found for this NFC tag' },
        { status: 404 }
      );
    }

    // Get or create punch card
    let { data: punchCard } = await db
      .from('punch_cards')
      .select('id, current_punches, total_punches')
      .eq('user_id', user.id)
      .eq('business_id', business.id)
      .single();

    if (!punchCard) {
      const { data: newCard, error: cardError } = await db
        .from('punch_cards')
        .insert({
          user_id: user.id,
          business_id: business.id,
          current_punches: 0,
          total_punches: 0,
        })
        .select('id, current_punches, total_punches')
        .single();

      if (cardError || !newCard) {
        console.error('Punch card creation error:', cardError);
        return NextResponse.json(
          { error: 'Failed to create punch card' },
          { status: 500 }
        );
      }
      punchCard = newCard;
    }

    // Record the punch
    const { error: punchError } = await db.from('punches').insert({
      punch_card_id: punchCard.id,
      user_id: user.id,
      business_id: business.id,
    });

    if (punchError) {
      console.error('Punch recording error:', punchError);
      return NextResponse.json(
        { error: 'Failed to record punch' },
        { status: 500 }
      );
    }

    // Update punch card
    let newCurrentPunches = punchCard.current_punches + 1;
    const newTotalPunches = punchCard.total_punches + 1;
    let rewardEarned = false;

    if (newCurrentPunches >= business.max_punches) {
      newCurrentPunches = 0;
      rewardEarned = true;
    }

    const { error: updateError } = await db
      .from('punch_cards')
      .update({
        current_punches: newCurrentPunches,
        total_punches: newTotalPunches,
        updated_at: new Date().toISOString(),
      })
      .eq('id', punchCard.id);

    if (updateError) {
      console.error('Punch card update error:', updateError);
    }

    return NextResponse.json({
      success: true,
      punch: {
        business_name: business.name,
        business_id: business.id,
        current_punches: newCurrentPunches,
        total_punches: newTotalPunches,
        max_punches: business.max_punches,
        reward_earned: rewardEarned,
      },
    });
  } catch (error) {
    console.error('Punch collection error:', error);
    return NextResponse.json(
      { error: 'Failed to collect punch' },
      { status: 500 }
    );
  }
}
