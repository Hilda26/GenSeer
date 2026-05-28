import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMarketOnGenLayer } from '@/lib/genlayer/market'
import { validateMarketForm } from '@/lib/utils/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      category,
      outcomes,
      closeAt,
      evidenceEndsAt,
      settlementAt,
      settlementCriteria,
      approvedSources = [],
      minimumTotalPool = 100,
      minimumOpposingRatioBps = 1000,
      platformFeeBps = 500,
      walletAddress,
    } = body

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    const validation = validateMarketForm({
      title,
      description,
      category,
      outcomes,
      closeAt,
      evidenceEndsAt,
      settlementAt,
      settlementCriteria,
      minimumTotalPool,
    })
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Upsert user
    let userId: string
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: newUser, error: userErr } = await supabase
        .from('users')
        .insert({ wallet_address: walletAddress })
        .select('id')
        .single()
      if (userErr || !newUser) throw new Error('Failed to create user')
      userId = newUser.id
    }

    // Create market in Supabase
    const { data: market, error: marketErr } = await supabase
      .from('markets')
      .insert({
        creator_id: userId,
        title,
        description,
        category,
        status: 'draft',
        close_at: closeAt,
        evidence_ends_at: evidenceEndsAt,
        settlement_at: settlementAt,
        settlement_criteria: settlementCriteria,
        approved_sources: approvedSources,
        minimum_total_pool: minimumTotalPool,
        minimum_opposing_ratio: minimumOpposingRatioBps / 10000,
        platform_fee_bps: platformFeeBps,
      })
      .select()
      .single()

    if (marketErr || !market) throw new Error('Failed to create market in database')

    // Insert outcomes
    const outcomeInserts = outcomes.map((label: string, i: number) => ({
      market_id: market.id,
      outcome_index: i,
      label,
    }))
    await supabase.from('outcomes').insert(outcomeInserts)

    // Call GenLayer
    const genLayerMarketId = `mkt_${market.id.replace(/-/g, '').slice(0, 16)}`
    const glResult = await createMarketOnGenLayer({
      marketId: genLayerMarketId,
      creatorAddress: walletAddress,
      title,
      category,
      outcomes,
      closeAt: Math.floor(new Date(closeAt).getTime() / 1000),
      evidenceEndsAt: Math.floor(new Date(evidenceEndsAt).getTime() / 1000),
      settlementAt: Math.floor(new Date(settlementAt).getTime() / 1000),
      settlementCriteria,
      approvedSources,
      minimumTotalPool,
      minimumOpposingRatioBps,
      platformFeeBps,
    })

    // Update market with GenLayer ID and status
    const newStatus = glResult.success ? 'open' : 'draft'
    await supabase
      .from('markets')
      .update({
        genlayer_market_id: glResult.success ? genLayerMarketId : null,
        status: newStatus,
      })
      .eq('id', market.id)

    // Log activity
    await supabase.from('market_activity').insert({
      market_id: market.id,
      user_id: userId,
      activity_type: 'market_created',
      description: `Market created: ${title}`,
      metadata: { genlayer_market_id: genLayerMarketId, genlayer_success: glResult.success },
    })

    return NextResponse.json({
      market: { ...market, status: newStatus, genlayer_market_id: genLayerMarketId },
      genlayer: glResult,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
