import { NextResponse } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth/server'
import { getSupabaseServer, isDemoMode } from '@/lib/supabase'

export async function GET() {
  try {
    if (isDemoMode) {
      const { demoUsers, demoPunchCards, demoPunches } = await import('@/lib/demo-data')

      // Simulate business_id "1" (Coffee Corner) as the logged-in business
      const adminSession = { business_id: '1' }
      const businessId = adminSession.business_id

      const businessCards = demoPunchCards.filter((c) => c.business_id === businessId)

      const customers = businessCards.map((card) => {
        const user = demoUsers.find((u) => u.id === card.user_id)
        const userPunches = demoPunches
          .filter((p) => p.user_id === card.user_id && p.business_id === businessId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        return {
          id: user?.id,
          name: user?.name,
          email: user?.email,
          phone: user?.phone,
          current_punches: card.current_punches,
          total_punches: card.total_punches,
          prizes_redeemed: 0,
          last_visit: userPunches[0]?.created_at || card.updated_at,
          joined_at: card.created_at,
          punch_card_id: card.id,
        }
      })

      customers.sort((a, b) => b.total_punches - a.total_punches)
      return NextResponse.json({ customers, demo: true })
    }

    const admin = await getCurrentAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getSupabaseServer()
    const businessId = admin.business_id

    // Run all three queries in parallel instead of sequentially
    const [cardsResult, redemptionsResult, lastPunchesResult] = await Promise.all([
      db
        .from('punch_cards')
        .select(`
          id,
          user_id,
          current_punches,
          total_punches,
          created_at,
          updated_at,
          users (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('business_id', businessId)
        .order('total_punches', { ascending: false }),
      db
        .from('redeemed_prizes')
        .select('user_id')
        .eq('business_id', businessId),
      db
        .from('punches')
        .select('user_id, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
    ])

    const redemptionCounts: Record<string, number> = {}
    redemptionsResult.data?.forEach((r: { user_id: string }) => {
      redemptionCounts[r.user_id] = (redemptionCounts[r.user_id] || 0) + 1
    })

    const lastVisits: Record<string, string> = {}
    lastPunchesResult.data?.forEach((p: { user_id: string; created_at: string }) => {
      if (!lastVisits[p.user_id]) lastVisits[p.user_id] = p.created_at
    })

    const customers = cardsResult.data?.map((card: any) => ({
      id: card.users?.id,
      name: card.users?.name,
      email: card.users?.email,
      phone: card.users?.phone,
      current_punches: card.current_punches,
      total_punches: card.total_punches,
      prizes_redeemed: redemptionCounts[card.user_id] || 0,
      last_visit: lastVisits[card.user_id] || card.updated_at,
      joined_at: card.created_at,
      punch_card_id: card.id,
    })) || []

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('Business customers error:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}
