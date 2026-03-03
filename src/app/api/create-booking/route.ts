// src/app/api/create-booking/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendClientBookingConfirmation, sendConsultantBookingNotification } from '@/lib/email'
import { calculateGST } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      consultantId, clientName, clientEmail, clientPhone,
      clientNotes, clientGstin, slotDate, slotTime,
      durationMinutes, amountInr,
    } = body

    if (!consultantId || !clientName || !clientEmail || !slotDate || !slotTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Race condition check — is slot still free?
    const { data: existing } = await supabase
      .from('bookings').select('id')
      .eq('consultant_id', consultantId)
      .eq('slot_date', slotDate)
      .eq('slot_time', slotTime + ':00')
      .eq('status', 'confirmed')
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'This slot was just booked by someone else. Please pick another slot.' },
        { status: 409 }
      )
    }

    // 2. Free plan limit check
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, full_name, profession, gstin, email')
      .eq('id', consultantId).single()

    if (profile?.plan === 'free') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('bookings').select('id', { count: 'exact', head: true })
        .eq('consultant_id', consultantId)
        .gte('created_at', startOfMonth.toISOString())
      if ((count || 0) >= 10) {
        return NextResponse.json(
          { error: 'This consultant has reached their monthly booking limit. Please try again next month.' },
          { status: 429 }
        )
      }
    }

    // 3. Generate invoice number
    const year = new Date().getFullYear()
    const invoiceNumber = `SLY-${year}-${String(Date.now()).slice(-6)}`

    // 4. Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings').insert({
        consultant_id: consultantId,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone || null,
        client_notes: clientNotes || null,
        client_gstin: clientGstin || null,
        slot_date: slotDate,
        slot_time: slotTime + ':00',
        duration_minutes: durationMinutes,
        amount_inr: amountInr,
        payment_status: 'pending',
        status: 'confirmed',
        invoice_number: invoiceNumber,
      }).select().single()

    if (bookingError) throw new Error(bookingError.message)

    // 5. Send emails (non-blocking)
    const gst = calculateGST(amountInr, false)
    Promise.all([
      sendClientBookingConfirmation({
        clientName, clientEmail,
        consultantName: profile?.full_name || 'Your Consultant',
        consultantProfession: profile?.profession || '',
        slotDate, slotTime,
        duration: durationMinutes,
        amountInr: profile?.gstin ? gst.total : amountInr,
        hasGst: !!profile?.gstin,
      }),
      sendConsultantBookingNotification({
        consultantEmail: profile?.email || '',
        consultantName: profile?.full_name || '',
        clientName, clientEmail, clientPhone, clientNotes,
        slotDate, slotTime,
        duration: durationMinutes,
        amountInr: profile?.gstin ? gst.total : amountInr,
      }),
    ]).catch(e => console.error('Booking emails failed:', e))

    return NextResponse.json({ success: true, bookingId: booking.id })
  } catch (error: any) {
    console.error('create-booking error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create booking' }, { status: 500 })
  }
}
