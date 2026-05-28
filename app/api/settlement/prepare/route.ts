import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSettlementPacket } from '@/lib/utils/settlementPacket'
import { settleMarketOnGenLayer } from '@/lib/genlayer/market'

// This route builds a settlement packet WITHOUT any AI/LLM call.
// It formats structured data for the GenLayer contract to reason over.
// No OpenAI. No Claude. No external LLM.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { market_id } = body

    if (!market_id) return NextResponse.json({ error: 'market_id required' }, { status: 400 })

    const supabase = createAdminClient()

    // Load all data
    const [marketRes, evidenceRes, challengesRes] = await Promise.all([
      supabase.from('markets').select('*, outcomes(*)').eq('id', market_id).single(),
      supabase.from('evidence_items').select('*').eq('market_id', market_id).order('created_at'),
      supabase.from('evidence_challenges').select('*').eq('market_id', market_id).order('created_at'),
    ])

    if (marketRes.error || !marketRes.data) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    const market = marketRes.data
    const outcomes = (market.outcomes as unknown as Array<{ outcome_index: number; label: string; total_staked: number }>) || []
    const evidence = evidenceRes.data || []
    const challenges = challengesRes.data || []

    const outcomePools = outcomes.map((o) => o.total_staked || 0)
    const totalPool = outcomePools.reduce((a, b) => a + b, 0)
    const fundedOutcomes = outcomePools.filter((p) => p > 0).length

    const poolSummary = {
      total_pool: totalPool,
      outcome_pools: outcomePools,
      funded_outcomes: fundedOutcomes,
      platform_fee_bps: market.platform_fee_bps || 500,
    }

    const packet = buildSettlementPacket({
      market: {
        id: market.id,
        genlayer_market_id: market.genlayer_market_id,
        title: market.title,
        category: market.category,
        settlement_criteria: market.settlement_criteria,
        approved_sources: market.approved_sources || [],
        minimum_total_pool: market.minimum_total_pool || 100,
        minimum_opposing_ratio: market.minimum_opposing_ratio || 0.1,
      },
      outcomes,
      evidence,
      challenges,
      poolSummary,
    })

    // Store packet
    await supabase.from('settlement_packets').insert({
      market_id,
      packet,
      status: 'prepared',
    })

    // Update market status
    await supabase.from('markets').update({ status: 'settlement_pending' }).eq('id', market_id)

    // Submit to GenLayer
    const glResult = await settleMarketOnGenLayer({
      marketId: market.genlayer_market_id || market_id,
      evidenceJson: JSON.stringify(evidence),
      challengesJson: JSON.stringify(challenges),
      poolSummaryJson: JSON.stringify(poolSummary),
      senderAddress: '0xsystem_operator',
    })

    await supabase.from('market_activity').insert({
      market_id,
      user_id: null,
      activity_type: 'settlement_submitted',
      description: 'Settlement packet prepared and submitted to GenLayer',
      metadata: { genlayer_tx_hash: glResult.txHash, genlayer_success: glResult.success },
    })

    return NextResponse.json({
      success: true,
      packet,
      genlayer: glResult,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
