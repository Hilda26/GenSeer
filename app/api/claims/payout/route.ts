import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { claimPayoutOnGenLayer } from '@/lib/genlayer/market'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { market_id, wallet_address } = body

    if (!market_id || !wallet_address) {
      return NextResponse.json({ error: 'market_id and wallet_address required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: market } = await supabase
      .from('markets')
      .select('genlayer_market_id, status')
      .eq('id', market_id)
      .single()

    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    if (market.status !== 'settled') {
      return NextResponse.json({ error: 'Market is not settled' }, { status: 400 })
    }

    // Check for existing claim
    const { data: existingClaim } = await supabase
      .from('claims')
      .select('id')
      .eq('market_id', market_id)
      .eq('wallet_address', wallet_address)
      .eq('claim_type', 'payout')
      .single()

    if (existingClaim) return NextResponse.json({ error: 'Already claimed' }, { status: 400 })

    // Call GenLayer
    const glResult = await claimPayoutOnGenLayer(market.genlayer_market_id || market_id, wallet_address)

    // Get user
    const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet_address).single()

    // Record claim
    await supabase.from('claims').insert({
      market_id,
      user_id: user?.id || null,
      wallet_address,
      claim_type: 'payout',
      amount: 0,
      genlayer_tx_hash: glResult.txHash || null,
      status: glResult.success ? 'completed' : 'pending',
    })

    await supabase.from('market_activity').insert({
      market_id,
      user_id: user?.id || null,
      activity_type: 'payout_claimed',
      description: `Payout claimed by ${wallet_address.slice(0, 8)}...`,
      metadata: { genlayer_tx_hash: glResult.txHash },
    })

    return NextResponse.json({
      success: glResult.success,
      genlayer_tx_hash: glResult.txHash,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
