import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const marketId = searchParams.get('market_id')
    if (!marketId) return NextResponse.json({ error: 'market_id required' }, { status: 400 })

    const supabase = createAdminClient()
    const { data } = await supabase
      .from('settlements')
      .select('*')
      .eq('market_id', marketId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ settlement: data || null })
  } catch {
    return NextResponse.json({ settlement: null })
  }
}
