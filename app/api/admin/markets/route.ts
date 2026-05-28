import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  // Simple wallet-based admin check via query param
  const { searchParams } = new URL(request.url)
  const wallet = searchParams.get('wallet')
  const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET

  if (!adminWallet || wallet?.toLowerCase() !== adminWallet.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('markets')
      .select(`
        id, title, status, category, close_at, created_at,
        outcomes(total_staked)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    const markets = (data || []).map((m) => ({
      ...m,
      total_pool: (m.outcomes as { total_staked: number }[] || []).reduce(
        (s: number, o: { total_staked: number }) => s + (o.total_staked || 0),
        0
      ),
    }))

    // Summary stats
    const summary = {
      total: markets.length,
      by_status: markets.reduce((acc: Record<string, number>, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1
        return acc
      }, {}),
      total_staked: markets.reduce((s, m) => s + m.total_pool, 0),
    }

    return NextResponse.json({ markets, summary })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
