import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordStakeOnGenLayer } from '@/lib/genlayer/market'
import { validateStakeInput } from '@/lib/utils/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { market_id, outcome_index, amount, wallet_address } = body

    if (!market_id || !wallet_address) {
      return NextResponse.json({ error: 'market_id and wallet_address are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Load market + outcomes
    const { data: market, error: mErr } = await supabase
      .from('markets')
      .select('*, outcomes(*)')
      .eq('id', market_id)
      .single()

    if (mErr || !market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    if (market.status !== 'open') {
      return NextResponse.json({ error: `Market is not open for staking (status: ${market.status})` }, { status: 400 })
    }

    const validation = validateStakeInput({ amount, outcomeIndex: outcome_index, totalOutcomes: market.outcomes?.length || 0 })
    if (!validation.valid) return NextResponse.json({ error: validation.errors.join('; ') }, { status: 400 })

    // Upsert user
    let userId: string
    const { data: existingUser } = await supabase.from('users').select('id').eq('wallet_address', wallet_address).single()
    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: newUser } = await supabase.from('users').insert({ wallet_address }).select('id').single()
      userId = newUser!.id
    }

    // Call GenLayer
    const glResult = await recordStakeOnGenLayer({
      marketId: market.genlayer_market_id || market_id,
      outcomeIndex: outcome_index,
      amount,
      senderAddress: wallet_address,
    })

    // Mirror stake in Supabase
    await supabase.from('stakes').insert({
      market_id,
      outcome_index,
      user_id: userId,
      wallet_address,
      amount,
      genlayer_tx_hash: glResult.txHash || null,
    })

    // Update outcome total_staked
    const { data: outcome } = await supabase
      .from('outcomes')
      .select('total_staked')
      .eq('market_id', market_id)
      .eq('outcome_index', outcome_index)
      .single()

    if (outcome) {
      await supabase
        .from('outcomes')
        .update({ total_staked: (outcome.total_staked || 0) + amount })
        .eq('market_id', market_id)
        .eq('outcome_index', outcome_index)
    }

    // Log activity
    await supabase.from('market_activity').insert({
      market_id,
      user_id: userId,
      activity_type: 'stake_recorded',
      description: `Staked ${amount} units on outcome ${outcome_index}`,
      metadata: { outcome_index, amount, genlayer_tx_hash: glResult.txHash },
    })

    // Broadcast to Realtime channel so open market pages update instantly
    supabase
      .channel(`market-pool-${market_id}`)
      .send({ type: 'broadcast', event: 'stake_recorded', payload: { market_id, outcome_index, amount } })
      .catch(() => { /* non-critical — ignore broadcast errors */ })

    return NextResponse.json({
      success: true,
      genlayer_tx_hash: glResult.txHash,
      genlayer_success: glResult.success,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
