// src/app/api/generate-invoice/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateInvoiceHTML } from '@/lib/invoice'
import { uploadInvoiceToStorage } from '@/lib/pdf'
import { sendInvoiceEmail } from '@/lib/email'
import { calculateGST } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get full booking details
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('consultant_id', user.id)
      .single()

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Get consultant profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Calculate GST
    const gst = calculateGST(booking.amount_inr, false)

    // Generate invoice number if not exists
    let invoiceNumber = booking.invoice_number
    if (!invoiceNumber) {
      const { data: invNum } = await supabase.rpc('generate_invoice_number')
      invoiceNumber = invNum || `SLY-${Date.now()}`
      await supabase.from('bookings').update({ invoice_number: invoiceNumber }).eq('id', bookingId)
    }

    const today = new Date().toISOString().split('T')[0]

    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML({
      invoiceNumber,
      invoiceDate: today,
      consultantName: profile.full_name,
      consultantProfession: profile.profession,
      consultantGstin: profile.gstin,
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      clientGstin: booking.client_gstin,
      serviceDescription: 'Professional Consultation Services',
      slotDate: booking.slot_date,
      slotTime: booking.slot_time.slice(0, 5),
      durationMinutes: booking.duration_minutes,
      subtotalInr: gst.subtotal,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 0,
      cgstAmount: gst.cgst,
      sgstAmount: gst.sgst,
      igstAmount: 0,
      totalInr: profile.gstin ? gst.total : gst.subtotal,
      sacCode: '9983',
    })

    // Upload to Supabase Storage
    const invoiceUrl = await uploadInvoiceToStorage(supabase, invoiceHTML, invoiceNumber)

    if (!invoiceUrl) {
      return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
    }

    // Update booking with invoice URL
    await supabase.from('bookings')
      .update({ invoice_pdf_url: invoiceUrl })
      .eq('id', bookingId)

    // Upsert invoice record
    await supabase.from('invoices').upsert({
      booking_id: bookingId,
      consultant_id: user.id,
      invoice_number: invoiceNumber,
      invoice_date: today,
      consultant_name: profile.full_name,
      consultant_gstin: profile.gstin || null,
      client_name: booking.client_name,
      client_email: booking.client_email,
      client_gstin: booking.client_gstin || null,
      subtotal_inr: gst.subtotal,
      cgst_rate: 9,
      sgst_rate: 9,
      igst_rate: 0,
      cgst_amount: gst.cgst,
      sgst_amount: gst.sgst,
      igst_amount: 0,
      total_inr: profile.gstin ? gst.total : gst.subtotal,
      service_description: 'Professional Consultation Services',
      sac_code: '9983',
      pdf_url: invoiceUrl,
    }, { onConflict: 'booking_id' })

    // Send invoice email to client
    try {
      await sendInvoiceEmail({
        clientEmail: booking.client_email,
        clientName: booking.client_name,
        consultantName: profile.full_name,
        invoiceNumber,
        invoiceUrl,
        totalInr: profile.gstin ? gst.total : gst.subtotal,
        slotDate: booking.slot_date,
      })
    } catch (emailErr) {
      console.error('Invoice email failed:', emailErr)
    }

    return NextResponse.json({ success: true, invoiceUrl })
  } catch (error: any) {
    console.error('Invoice generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}