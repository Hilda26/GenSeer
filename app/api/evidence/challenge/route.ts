import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateEvidenceChallenge } from '@/lib/utils/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { evidence_id, market_id, wallet_address, reason, details } = body

    if (!evidence_id || !market_id || !wallet_address) {
      return NextResponse.json({ error: 'evidence_id, market_id, wallet_address required' }, { status: 400 })
    }

    const validation = validateEvidenceChallenge({ reason, details })
    if (!validation.valid) return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 })

    const supabase = createAdminClient()

    const { data: evidence } = await supabase.from('evidence_items').select('id').eq('id', evidence_id).single()
    if (!evidence) return NextResponse.json({ error: 'Evidence not found' }, { status: 404 })

    // Upsert user
    let userId: string | null = null
    const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet_address).single()
    if (user) {
      userId = user.id
    } else {
      const { data: newUser } = await supabase.from('users').insert({ wallet_address }).select('id').single()
      userId = newUser?.id || null
    }

    const { data: challenge, error } = await supabase
      .from('evidence_challenges')
      .insert({
        evidence_id,
        market_id,
        challenger_id: userId,
        reason,
        details,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Update evidence status to challenged
    await supabase.from('evidence_items').update({ status: 'challenged' }).eq('id', evidence_id)

    // Mark market as disputed
    await supabase.from('markets').update({ status: 'disputed' }).eq('id', market_id).eq('status', 'evidence_phase')

    await supabase.from('market_activity').insert({
      market_id,
      user_id: userId,
      activity_type: 'evidence_challenged',
      description: `Evidence challenged: ${reason}`,
      metadata: { evidence_id, challenge_id: challenge.id, reason },
    })

    return NextResponse.json({ challenge })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
