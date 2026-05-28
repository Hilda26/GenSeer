import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const creator_wallet = searchParams.get('creator_wallet')

    const supabase = createAdminClient()

    // If filtering by creator wallet, resolve to user_id first
    let creatorUserId: string | null = null
    if (creator_wallet) {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', creator_wallet)
        .single()
      creatorUserId = user?.id || 'none' // 'none' ensures empty result if wallet not found
    }

    let query = supabase
      .from('markets')
      .select(`
        *,
        outcomes (*),
        creator:users!markets_creator_id_fkey(wallet_address, username)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) query = query.eq('status', status)
    if (category) query = query.eq('category', category)
    if (creatorUserId) query = query.eq('creator_id', creatorUserId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ markets: data || [] })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
