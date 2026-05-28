import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel cron: runs every 15 minutes (see vercel.json)
// Also callable manually: GET /api/cron/auto-close
// Protected by CRON_SECRET env var on Vercel (Vercel sets Authorization header automatically)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Allow unauthenticated in dev, require secret in production
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // Find all open markets whose close_at has passed
    const { data: expiredMarkets, error } = await supabase
      .from('markets')
      .select('id, title, close_at')
      .eq('status', 'open')
      .lt('close_at', now)

    if (error) throw error

    if (!expiredMarkets || expiredMarkets.length === 0) {
      return NextResponse.json({ closed: 0, message: 'No markets to close' })
    }

    const ids = expiredMarkets.map((m) => m.id)

    // Bulk-update status to 'closed'
    const { error: updateError } = await supabase
      .from('markets')
      .update({ status: 'closed', updated_at: now })
      .in('id', ids)

    if (updateError) throw updateError

    // Log activity for each closed market
    const activityRows = expiredMarkets.map((m) => ({
      market_id: m.id,
      user_id: null,
      activity_type: 'auto_closed',
      description: `Market automatically closed at ${now} (close_at: ${m.close_at})`,
      metadata: { trigger: 'cron', closed_at: now },
    }))

    await supabase.from('market_activity').insert(activityRows)

    console.log(`[cron/auto-close] Closed ${ids.length} markets:`, ids)

    return NextResponse.json({
      closed: ids.length,
      markets: expiredMarkets.map((m) => ({ id: m.id, title: m.title })),
    })
  } catch (err) {
    console.error('[cron/auto-close] Error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
