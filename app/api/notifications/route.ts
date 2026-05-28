import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/notifications?wallet=X — list recent notifications for wallet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('wallet_address', wallet)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error

    const unread = (data || []).filter((n) => !n.read).length
    return NextResponse.json({ notifications: data || [], unread })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// PATCH /api/notifications — mark notifications as read
// body: { wallet, id? } — omit id to mark all as read
export async function PATCH(request: NextRequest) {
  try {
    const { wallet, id } = await request.json()
    if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

    const supabase = createAdminClient()

    let query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('wallet_address', wallet)

    if (id) query = query.eq('id', id)

    const { error } = await query
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

// POST /api/notifications — create a notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const { wallet_address, market_id, type, message } = await request.json()
    if (!wallet_address || !type || !message) {
      return NextResponse.json({ error: 'wallet_address, type, message required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('notifications')
      .insert({ wallet_address, market_id: market_id || null, type, message })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ notification: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
