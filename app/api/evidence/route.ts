import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const marketId = searchParams.get('market_id')

    if (!marketId) return NextResponse.json({ error: 'market_id is required' }, { status: 400 })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('evidence_items')
      .select('*, evidence_challenges(*)')
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ evidence: data || [] })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
