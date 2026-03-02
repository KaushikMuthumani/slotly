import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendCancellationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { bookingId, reason } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).eq('consultant_id', user.id).single()
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })

    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single()

    await supabase.from('bookings').update({ status: 'cancelled', consultant_notes: reason || null }).eq('id', bookingId)

    try {
      await Promise.all([
        sendCancellationEmail({ recipientEmail: booking.client_email, recipientName: booking.client_name, otherPartyName: profile?.full_name || '', slotDate: booking.slot_date, slotTime: booking.slot_time, isConsultant: false, reason }),
        sendCancellationEmail({ recipientEmail: profile?.email || '', recipientName: profile?.full_name || '', otherPartyName: booking.client_name, slotDate: booking.slot_date, slotTime: booking.slot_time, isConsultant: true, reason }),
      ])
    } catch (e) { console.error('Cancel email failed:', e) }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}