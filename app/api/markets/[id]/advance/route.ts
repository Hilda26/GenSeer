import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  closeMarketOnGenLayer,
  openEvidencePhaseOnGenLayer,
  cancelMarketOnGenLayer,
} from '@/lib/genlayer/market'

const OPERATOR_ADDRESS = process.env.GENLAYER_OPERATOR_ADDRESS || '0x171567e5Ce62b0Ed949580E4d601ef8072693B74'

// Valid status transitions
const TRANSITIONS: Record<string, string> = {
  open: 'closed',
  closed: 'evidence_phase',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const action = body.action as string | undefined  // 'advance' | 'cancel'

    const supabase = createAdminClient()

    const { data: market, error } = await supabase
      .from('markets')
      .select('id, genlayer_market_id, status, title')
      .eq('id', id)
      .single()

    if (error || !market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    const glMarketId = market.genlayer_market_id || market.id

    // Handle cancel
    if (action === 'cancel') {
      if (!['open', 'closed'].includes(market.status)) {
        return NextResponse.json(
          { error: `Cannot cancel market in status: ${market.status}` },
          { status: 400 }
        )
      }
      const glResult = await cancelMarketOnGenLayer(glMarketId, OPERATOR_ADDRESS)
      await supabase.from('markets').update({ status: 'cancelled' }).eq('id', id)
      await supabase.from('market_activity').insert({
        market_id: id,
        user_id: null,
        activity_type: 'market_cancelled',
        description: 'Market cancelled by operator',
        metadata: { genlayer_tx_hash: glResult.txHash },
      })
      return NextResponse.json({ success: true, status: 'cancelled', genlayer: glResult })
    }

    // Handle advance
    const nextStatus = TRANSITIONS[market.status]
    if (!nextStatus) {
      return NextResponse.json(
        { error: `No valid transition from status: ${market.status}` },
        { status: 400 }
      )
    }

    let glResult
    if (market.status === 'open') {
      glResult = await closeMarketOnGenLayer(glMarketId, OPERATOR_ADDRESS)
    } else if (market.status === 'closed') {
      glResult = await openEvidencePhaseOnGenLayer(glMarketId, OPERATOR_ADDRESS)
    } else {
      return NextResponse.json({ error: 'Unexpected status' }, { status: 400 })
    }

    await supabase.from('markets').update({ status: nextStatus }).eq('id', id)

    await supabase.from('market_activity').insert({
      market_id: id,
      user_id: null,
      activity_type: `status_advanced`,
      description: `Market advanced: ${market.status} → ${nextStatus}`,
      metadata: { from: market.status, to: nextStatus, genlayer_tx_hash: glResult.txHash },
    })

    return NextResponse.json({
      success: true,
      from: market.status,
      to: nextStatus,
      genlayer: glResult,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
