import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { claimRefundOnGenLayer } from '@/lib/genlayer/market'

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
    if (!['invalid', 'cancelled'].includes(market.status)) {
      return NextResponse.json({ error: `Refunds not available in status: ${market.status}` }, { status: 400 })
    }

    const { data: existingClaim } = await supabase
      .from('claims')
      .select('id')
      .eq('market_id', market_id)
      .eq('wallet_address', wallet_address)
      .eq('claim_type', 'refund')
      .single()

    if (existingClaim) return NextResponse.json({ error: 'Already claimed refund' }, { status: 400 })

    const glResult = await claimRefundOnGenLayer(market.genlayer_market_id || market_id, wallet_address)

    const { data: user } = await supabase.from('users').select('id').eq('wallet_address', wallet_address).single()

    await supabase.from('claims').insert({
      market_id,
      user_id: user?.id || null,
      wallet_address,
      claim_type: 'refund',
      amount: 0,
      genlayer_tx_hash: glResult.txHash || null,
      status: glResult.success ? 'completed' : 'pending',
    })

    await supabase.from('market_activity').insert({
      market_id,
      user_id: user?.id || null,
      activity_type: 'refund_claimed',
      description: `Refund claimed by ${wallet_address.slice(0, 8)}...`,
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
