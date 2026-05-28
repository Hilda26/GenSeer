import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 60 // cache for 60s

export async function GET() {
  try {
    const supabase = createAdminClient()

    const [marketsRes, outcomesRes] = await Promise.all([
      supabase.from('markets').select('id, title, status, created_at, outcomes(total_staked)'),
      supabase.from('outcomes').select('total_staked'),
    ])

    const markets = marketsRes.data || []
    const outcomes = outcomesRes.data || []

    const total_markets = markets.length
    const open_markets = markets.filter((m) => m.status === 'open').length
    const settled_markets = markets.filter((m) => m.status === 'settled').length
    const active_markets = markets.filter((m) =>
      ['open', 'closed', 'evidence_phase', 'settlement_pending'].includes(m.status)
    ).length

    const total_staked = outcomes.reduce((sum, o) => sum + (o.total_staked || 0), 0)

    // Top 5 markets by pool size
    const top_markets = markets
      .map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        total_pool: (m.outcomes as { total_staked: number }[] || []).reduce(
          (s: number, o: { total_staked: number }) => s + (o.total_staked || 0),
          0
        ),
      }))
      .sort((a, b) => b.total_pool - a.total_pool)
      .slice(0, 5)

    return NextResponse.json({
      total_markets,
      open_markets,
      settled_markets,
      active_markets,
      total_staked,
      top_markets,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
