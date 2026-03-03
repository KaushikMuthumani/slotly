import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { generateInvoicePDF } from '@/lib/invoice-pdf'
import { sendInvoiceEmail } from '@/lib/email'
import { calculateGST } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Mark paid
    const { error: payErr } = await supabase
      .from('bookings').update({ payment_status: 'paid' })
      .eq('id', bookingId).eq('consultant_id', user.id)
    if (payErr) throw new Error('Mark paid failed: ' + payErr.message)

    // 2. Fetch booking + profile
    const [{ data: booking }, { data: profile }] = await Promise.all([
      supabase.from('bookings').select('*').eq('id', bookingId).single(),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])
    if (!booking) throw new Error('Booking not found')
    if (!profile) throw new Error('Profile not found')
    if (!profile.gstin) return NextResponse.json({ success: true, invoiceGenerated: false })

    const gst = calculateGST(booking.amount_inr, false)
    const today = new Date().toISOString().split('T')[0]
    let invoiceNumber = booking.invoice_number
    if (!invoiceNumber) {
      invoiceNumber = 'SLY-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6)
      await supabase.from('bookings').update({ invoice_number: invoiceNumber }).eq('id', bookingId)
    }

    // 3. Generate PDF — pure jsPDF, no React
    console.log('[mark-paid] Generating PDF:', invoiceNumber)
    let pdfBuffer: Buffer
    try {
      pdfBuffer = generateInvoicePDF({
        invoiceNumber, invoiceDate: today,
        consultantName: profile.full_name,
        consultantProfession: profile.profession || 'Consultant',
        consultantGstin: profile.gstin,
        clientName: booking.client_name, clientEmail: booking.client_email,
        clientGstin: booking.client_gstin || null,
        slotDate: booking.slot_date,
        slotTime: (booking.slot_time || '').slice(0, 5),
        durationMinutes: booking.duration_minutes,
        subtotalInr: gst.subtotal, cgstRate: 9, sgstRate: 9,
        cgstAmount: gst.cgst, sgstAmount: gst.sgst,
        totalInr: gst.total, sacCode: '9983',
      })
      console.log('[mark-paid] PDF OK, size =', pdfBuffer.length)
    } catch (e: any) {
      console.error('[mark-paid] PDF failed:', e.message)
      return NextResponse.json({ success: true, invoiceGenerated: false, warning: e.message })
    }

    // 4. Upload
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const clientSlug = booking.client_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20)
const dateSlug = booking.slot_date.replace(/-/g, '')
const fileName = `${invoiceNumber}-${clientSlug}-${dateSlug}.pdf`
    const { error: uploadErr } = await admin.storage
      .from('invoices').upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) {
      console.error('[mark-paid] Upload failed:', uploadErr.message)
      return NextResponse.json({ success: true, invoiceGenerated: false, warning: uploadErr.message })
    }
    const { data: urlData } = admin.storage.from('invoices').getPublicUrl(fileName)
    const invoiceUrl = urlData.publicUrl
    console.log('[mark-paid] Uploaded:', invoiceUrl)

    // 5. Save to DB
    await Promise.all([
      supabase.from('bookings').update({ invoice_pdf_url: invoiceUrl }).eq('id', bookingId),
      supabase.from('invoices').upsert({
        booking_id: bookingId, consultant_id: user.id,
        invoice_number: invoiceNumber, invoice_date: today,
        consultant_name: profile.full_name, consultant_gstin: profile.gstin,
        client_name: booking.client_name, client_email: booking.client_email,
        client_gstin: booking.client_gstin || null,
        subtotal_inr: gst.subtotal, cgst_rate: 9, sgst_rate: 9, igst_rate: 0,
        cgst_amount: gst.cgst, sgst_amount: gst.sgst, igst_amount: 0,
        total_inr: gst.total,
        service_description: 'Professional Consultation Services',
        sac_code: '9983', pdf_url: invoiceUrl,
      }, { onConflict: 'booking_id' }),
    ])

    // 6. Email
    sendInvoiceEmail({
      clientEmail: booking.client_email, clientName: booking.client_name,
      consultantName: profile.full_name, invoiceNumber, invoiceUrl,
      totalInr: gst.total, slotDate: booking.slot_date,
    }).catch((e: any) => console.error('[mark-paid] Email failed:', e.message))

    return NextResponse.json({ success: true, invoiceGenerated: true, invoiceUrl })

  } catch (error: any) {
    console.error('[mark-paid] Fatal:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}