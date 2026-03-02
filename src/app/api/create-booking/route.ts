// src/app/api/create-booking/route.3232222ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendClientBookingConfirmation, sendConsultantBookingNotification } from '@/lib/email'
import { generateInvoiceHTML } from '@/lib/invoice'
import { calculateGST } from '@/lib/utils'


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      consultantId,
      clientName,
      clientEmail,
      clientPhone,
      clientNotes,
      clientGstin,
      slotDate,
      slotTime,
      durationMinutes,
      amountInr,
    } = body

    const supabase = await createClient()

    // 1. Check slot is still available (race condition fix)
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('consultant_id', consultantId)
      .eq('slot_date', slotDate)
      .eq('slot_time', slotTime)
      .eq('status', 'confirmed')
      .single()

    if (existingBooking) {
      return NextResponse.json(
        { error: 'This slot was just booked by someone else. Please pick another slot.' },
        { status: 409 }
      )
    }

    // 2. Check free plan limit
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, full_name, profession, gstin, email')
      .eq('id', consultantId)
      .single()

    if (profile?.plan === 'free') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
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
    const { data: invoiceNumData } = await supabase.rpc('generate_invoice_number')
    const invoiceNumber = invoiceNumData || `SLY-${Date.now()}`

    // 4. Calculate GST
    const gst = calculateGST(amountInr, false) // assume intra-state for now

    // 5. Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
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
      })
      .select()
      .single()

    if (bookingError) throw bookingError

    // 6. Create invoice record (if consultant has GSTIN = Pro feature)
    if (profile?.gstin && profile?.plan !== 'free') {
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('invoices').insert({
        booking_id: booking.id,
        consultant_id: consultantId,
        invoice_number: invoiceNumber,
        invoice_date: today,
        consultant_name: profile.full_name,
        consultant_gstin: profile.gstin,
        client_name: clientName,
        client_email: clientEmail,
        client_gstin: clientGstin || null,
        subtotal_inr: gst.subtotal,
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 0,
        cgst_amount: gst.cgst,
        sgst_amount: gst.sgst,
        igst_amount: 0,
        total_inr: gst.total,
        service_description: 'Professional Consultation Services',
        sac_code: '9983',
      })
    }

    // 7. Send emails (non-blocking — don't fail booking if email fails)
    try {
      await Promise.all([
        sendClientBookingConfirmation({
          clientName,
          clientEmail,
          consultantName: profile?.full_name || 'Your Consultant',
          consultantProfession: profile?.profession || '',
          slotDate,
          slotTime,
          duration: durationMinutes,
          amountInr,
          hasGst: !!profile?.gstin && profile?.plan !== 'free',
        }),
        sendConsultantBookingNotification({
          consultantEmail: profile?.email || '',
          consultantName: profile?.full_name || '',
          clientName,
          clientEmail,
          clientPhone,
          clientNotes,
          slotDate,
          slotTime,
          duration: durationMinutes,
          amountInr,
        }),
      ])
    } catch (emailErr) {
      console.error('Email sending failed (booking still created):', emailErr)
    }

    return NextResponse.json({ success: true, bookingId: booking.id })
  } catch (error: any) {
    console.error('Booking creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create booking' },
      { status: 500 }
    )
  }
}
