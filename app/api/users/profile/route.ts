import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get('wallet')
    if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', wallet)
      .single()

    return NextResponse.json({ user: user || null })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { wallet_address, username } = await request.json()
    if (!wallet_address) return NextResponse.json({ error: 'wallet_address required' }, { status: 400 })

    const trimmed = username?.trim() || null
    if (trimmed && trimmed.length > 32) {
      return NextResponse.json({ error: 'Username must be 32 characters or less' }, { status: 400 })
    }
    if (trimmed && !/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Username may only contain letters, numbers, _, - and .' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: user, error } = await supabase
      .from('users')
      .update({ username: trimmed })
      .eq('wallet_address', wallet_address)
      .select('*')
      .single()

    if (error || !user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ user })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
