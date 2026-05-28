import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMarketSettlementFromGenLayer } from '@/lib/genlayer/market'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { market_id } = body

    if (!market_id) return NextResponse.json({ error: 'market_id required' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: market } = await supabase
      .from('markets')
      .select('genlayer_market_id, id')
      .eq('id', market_id)
      .single()

    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })

    // Read settlement from GenLayer
    const rawSettlement = await getMarketSettlementFromGenLayer(
      market.genlayer_market_id || market_id
    )

    let settlementData: Record<string, unknown>
    if (!rawSettlement) {
      return NextResponse.json({ error: 'Invalid settlement data from GenLayer' }, { status: 500 })
    }
    if (typeof rawSettlement === 'string') {
      // Contract returns JSON strings (Python str return type) — parse them
      try {
        settlementData = JSON.parse(rawSettlement)
      } catch {
        return NextResponse.json({ error: 'Invalid settlement JSON from GenLayer' }, { status: 500 })
      }
    } else if (typeof rawSettlement === 'object') {
      settlementData = rawSettlement as Record<string, unknown>
    } else {
      return NextResponse.json({ error: 'Invalid settlement data from GenLayer' }, { status: 500 })
    }

    if (settlementData.error) {
      return NextResponse.json({ error: 'No settlement found on GenLayer' }, { status: 404 })
    }

    const verdict = settlementData.verdict as string
    const isSettled = verdict === 'settled'
    const newStatus = isSettled ? 'settled' : 'invalid'

    // Store settlement
    const { data: settlement } = await supabase
      .from('settlements')
      .insert({
        market_id,
        winning_outcome_index: isSettled ? (settlementData.winning_outcome_index as number) : null,
        winning_outcome_label: isSettled ? (settlementData.winning_outcome_label as string) : null,
        verdict: verdict || 'invalid',
        confidence: (settlementData.confidence as number) || 0,
        evidence_strength: (settlementData.evidence_strength as string) || null,
        sentiment_analysis: (settlementData.sentiment_analysis as string) || null,
        metrics_analysis: (settlementData.metrics_analysis as string) || null,
        sceptic_analysis: (settlementData.sceptic_analysis as string) || null,
        context_analysis: (settlementData.context_analysis as string) || null,
        reasoning: (settlementData.reasoning as string) || 'See GenLayer settlement',
        evidence_summary: (settlementData.evidence_summary as string) || 'Settlement recorded',
        counterarguments: (settlementData.counterarguments as string) || null,
        refund_recommended: (settlementData.refund_recommended as boolean) || !isSettled,
      })
      .select()
      .single()

    // Update market status
    await supabase.from('markets').update({ status: newStatus }).eq('id', market_id)

    await supabase.from('market_activity').insert({
      market_id,
      user_id: null,
      activity_type: 'settlement_synced',
      description: `Settlement synced: verdict=${verdict}`,
      metadata: { verdict, winning_outcome_index: settlementData.winning_outcome_index },
    })

    return NextResponse.json({ success: true, settlement, status: newStatus })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
