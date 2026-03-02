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

    // Mark as paid first
    const { error: payError } = await supabase
      .from('bookings')
      .update({ payment_status: 'paid' })
      .eq('id', bookingId)
      .eq('consultant_id', user.id)

    if (payError) throw payError

    // Get booking + profile details
    const { data: booking } = await supabase
      .from('bookings').select('*').eq('id', bookingId).single()

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()

    // Generate invoice only if consultant has GSTIN
    if (profile?.gstin) {
      const gst = calculateGST(booking.amount_inr, false)

      let invoiceNumber = booking.invoice_number
      if (!invoiceNumber) {
        const { data: invNum } = await supabase.rpc('generate_invoice_number')
        invoiceNumber = invNum || `SLY-${Date.now()}`
        await supabase.from('bookings').update({ invoice_number: invoiceNumber }).eq('id', bookingId)
      }

      const today = new Date().toISOString().split('T')[0]
      const totalInr = gst.total

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
        totalInr,
        sacCode: '9983',
      })

      const invoiceUrl = await uploadInvoiceToStorage(supabase, invoiceHTML, invoiceNumber)

      if (invoiceUrl) {
        // Save URL to booking
        await supabase.from('bookings')
          .update({ invoice_pdf_url: invoiceUrl })
          .eq('id', bookingId)

        // Save invoice record
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

        // Email invoice to client
        try {
          await sendInvoiceEmail({
            clientEmail: booking.client_email,
            clientName: booking.client_name,
            consultantName: profile.full_name,
            invoiceNumber,
            invoiceUrl,
            totalInr,
            slotDate: booking.slot_date,
          })
        } catch (e) {
          console.error('Invoice email failed:', e)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}