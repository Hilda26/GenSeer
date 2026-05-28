import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/stake/user?market_id=X&wallet=Y
 * Returns the calling user's stakes for a given market, summed by outcome.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const market_id = searchParams.get('market_id')
    const wallet = searchParams.get('wallet')

    if (!market_id || !wallet) {
      return NextResponse.json({ error: 'market_id and wallet required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Resolve wallet → user_id
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', wallet)
      .single()

    if (!user) return NextResponse.json({ stakes_by_outcome: [], total_staked: 0 })

    // Sum stakes per outcome for this user + market
    const { data: stakes } = await supabase
      .from('stakes')
      .select('outcome_index, amount')
      .eq('market_id', market_id)
      .eq('user_id', user.id)

    if (!stakes || stakes.length === 0) {
      return NextResponse.json({ stakes_by_outcome: [], total_staked: 0 })
    }

    // Aggregate by outcome_index
    const byOutcome: Record<number, number> = {}
    let total = 0
    for (const s of stakes) {
      byOutcome[s.outcome_index] = (byOutcome[s.outcome_index] || 0) + (s.amount || 0)
      total += s.amount || 0
    }

    return NextResponse.json({
      stakes_by_outcome: byOutcome,
      total_staked: total,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
