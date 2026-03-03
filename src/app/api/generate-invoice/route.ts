// src/app/api/generate-invoice/route.ts
// Standalone API to (re)generate invoice PDF for a booking
// Called internally by mark-paid, or manually by consultant

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePDFBuffer, uploadInvoicePDFToStorage } from '@/lib/pdf'
import { sendInvoiceEmail } from '@/lib/email'
import { calculateGST } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch booking
    const { data: booking, error: bErr } = await supabase
      .from('bookings').select('*').eq('id', bookingId).eq('consultant_id', user.id).single()
    if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // Fetch profile
    const { data: profile, error: pErr } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    if (pErr || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    if (!profile.gstin) {
      return NextResponse.json({ error: 'GSTIN not set. Add it in Settings to generate invoices.' }, { status: 400 })
    }

    const gst = calculateGST(booking.amount_inr, false)

    let invoiceNumber = booking.invoice_number
    if (!invoiceNumber) {
      const year = new Date().getFullYear()
      invoiceNumber = `SLY-${year}-${String(Date.now()).slice(-6)}`
      await supabase.from('bookings').update({ invoice_number: invoiceNumber }).eq('id', bookingId)
    }

    const today = new Date().toISOString().split('T')[0]
    const totalInr = gst.total

    // Generate real PDF buffer
    const pdfBuffer = await generateInvoicePDFBuffer({
      invoiceNumber,
      invoiceDate: today,
      consultantName: profile.full_name,
      consultantProfession: profile.profession || 'Consultant',
      consultantGstin: profile.gstin,
      consultantAddress: profile.address || '',
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      clientGstin: booking.client_gstin || undefined,
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
      totalInr,
      sacCode: '9983',
    })

    if (!pdfBuffer) {
      return NextResponse.json({ error: 'PDF generation failed. Check server logs.' }, { status: 500 })
    }

    // Upload PDF to Supabase Storage
    const invoiceUrl = await uploadInvoicePDFToStorage(pdfBuffer, invoiceNumber)
    if (!invoiceUrl) {
      return NextResponse.json({ error: 'PDF upload failed. Check storage bucket and service role key.' }, { status: 500 })
    }

    // Update booking
    await supabase.from('bookings').update({ invoice_pdf_url: invoiceUrl }).eq('id', bookingId)

    // Upsert invoice record
    await supabase.from('invoices').upsert({
      booking_id: bookingId,
      consultant_id: user.id,
      invoice_number: invoiceNumber,
      invoice_date: today,
      consultant_name: profile.full_name,
      consultant_gstin: profile.gstin,
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
      total_inr: totalInr,
      service_description: 'Professional Consultation Services',
      sac_code: '9983',
      pdf_url: invoiceUrl,
    }, { onConflict: 'booking_id' })

    // Send email (non-blocking)
    sendInvoiceEmail({
      clientEmail: booking.client_email,
      clientName: booking.client_name,
      consultantName: profile.full_name,
      invoiceNumber,
      invoiceUrl,
      totalInr,
      slotDate: booking.slot_date,
    }).catch(e => console.error('Invoice email failed:', e))

    return NextResponse.json({ success: true, invoiceUrl })
  } catch (error: any) {
    console.error('generate-invoice error:', error)
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 })
  }
}
