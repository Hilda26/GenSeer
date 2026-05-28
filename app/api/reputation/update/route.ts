import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet_address, market_id: _market_id, event_type } = body

    if (!wallet_address || !event_type) {
      return NextResponse.json({ error: 'wallet_address and event_type required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: user } = await supabase.from('users').select('*').eq('wallet_address', wallet_address).single()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const updates: Record<string, number> = {}

    switch (event_type) {
      case 'prediction_correct':
        updates.prediction_accuracy = Math.min(100, (user.prediction_accuracy || 0) + 5)
        updates.reputation_score = (user.reputation_score || 0) + 10
        break
      case 'prediction_incorrect':
        updates.prediction_accuracy = Math.max(0, (user.prediction_accuracy || 0) - 2)
        updates.reputation_score = Math.max(0, (user.reputation_score || 0) - 3)
        break
      case 'evidence_accepted':
        updates.evidence_score = Math.min(100, (user.evidence_score || 0) + 5)
        updates.reputation_score = (user.reputation_score || 0) + 8
        break
      case 'evidence_rejected':
        updates.evidence_score = Math.max(0, (user.evidence_score || 0) - 3)
        updates.reputation_score = Math.max(0, (user.reputation_score || 0) - 5)
        break
      case 'challenge_valid':
        updates.challenge_score = Math.min(100, (user.challenge_score || 0) + 6)
        updates.reputation_score = (user.reputation_score || 0) + 8
        break
      case 'challenge_invalid':
        updates.challenge_score = Math.max(0, (user.challenge_score || 0) - 3)
        updates.reputation_score = Math.max(0, (user.reputation_score || 0) - 4)
        break
      case 'market_settled_normally':
        updates.creator_score = Math.min(100, (user.creator_score || 0) + 8)
        updates.reputation_score = (user.reputation_score || 0) + 12
        break
      case 'market_invalid':
        updates.creator_score = Math.max(0, (user.creator_score || 0) - 5)
        updates.reputation_score = Math.max(0, (user.reputation_score || 0) - 8)
        break
      default:
        return NextResponse.json({ error: `Unknown event_type: ${event_type}` }, { status: 400 })
    }

    await supabase.from('users').update(updates).eq('wallet_address', wallet_address)

    return NextResponse.json({ success: true, updates })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
