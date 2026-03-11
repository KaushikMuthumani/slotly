// src/app/api/client-score/route.ts
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/client-score?email=xxx — get score for a client
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('client_scores')
    .select('*')
    .eq('client_email', email)
    .single()

  return NextResponse.json({ score: data || null })
}

// POST /api/client-score — mark a booking as no-show
export async function POST(request: NextRequest) {
  try {
    const { bookingId, noShow } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify ownership
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('consultant_id', user.id)
      .single()
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Update no_show flag — trigger will auto-update score
    await supabase
      .from('bookings')
      .update({ no_show: noShow })
      .eq('id', bookingId)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
