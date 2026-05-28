import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateEvidenceSubmission } from '@/lib/utils/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { market_id, source_url, source_type, title, description, supports_outcome_index, wallet_address } = body

    if (!market_id || !wallet_address) {
      return NextResponse.json({ error: 'market_id and wallet_address required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: market } = await supabase.from('markets').select('status, outcomes(*)').eq('id', market_id).single()
    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })

    const allowedStatuses = ['open', 'closed', 'evidence_phase']
    if (!allowedStatuses.includes(market.status)) {
      return NextResponse.json({ error: `Evidence not accepted in market status: ${market.status}` }, { status: 400 })
    }

    const validation = validateEvidenceSubmission({
      sourceUrl: source_url,
      sourceType: source_type,
      description,
      supportsOutcomeIndex: supports_outcome_index ?? null,
      totalOutcomes: (market.outcomes as unknown[])?.length || 0,
    })
    if (!validation.valid) return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 })

    // Upsert user
    let userId: string | null = null
    const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet_address).single()
    if (user) {
      userId = user.id
    } else {
      const { data: newUser } = await supabase.from('users').insert({ wallet_address }).select('id').single()
      userId = newUser?.id || null
    }

    const { data: evidence, error } = await supabase
      .from('evidence_items')
      .insert({
        market_id,
        submitted_by: userId,
        source_url,
        source_type,
        title: title || null,
        description,
        supports_outcome_index: supports_outcome_index ?? null,
        status: 'submitted',
      })
      .select()
      .single()

    if (error) throw error

    await supabase.from('market_activity').insert({
      market_id,
      user_id: userId,
      activity_type: 'evidence_submitted',
      description: `Evidence submitted: ${source_url}`,
      metadata: { evidence_id: evidence.id, source_type },
    })

    return NextResponse.json({ evidence })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
