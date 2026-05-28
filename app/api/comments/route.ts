import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const market_id = searchParams.get('market_id')
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100)
    const offset = Number(searchParams.get('offset') || 0)

    if (!market_id) return NextResponse.json({ error: 'market_id required' }, { status: 400 })

    const supabase = createAdminClient()

    const { data, error, count } = await supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .eq('market_id', market_id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({ comments: data || [], total: count || 0 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { market_id, wallet_address, text } = await request.json()

    if (!market_id || !wallet_address || !text?.trim()) {
      return NextResponse.json({ error: 'market_id, wallet_address, text required' }, { status: 400 })
    }

    if (text.length > 500) {
      return NextResponse.json({ error: 'Comment must be 500 characters or less' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch username if user exists
    const { data: user } = await supabase
      .from('users')
      .select('username')
      .eq('wallet_address', wallet_address)
      .single()

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        market_id,
        wallet_address,
        username: user?.username || null,
        text: text.trim(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
