// src/app/api/mark-paid/route.ts
// VERSION WITH FULL STEP-BY-STEP LOGGING
// Check Vercel logs after clicking Mark as Paid — every step is logged

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { sendInvoiceEmail } from '@/lib/email'
import { calculateGST } from '@/lib/utils'

async function generateAndUploadPDF(data: any): Promise<string | null> {
  try {
    console.log('[PDF] Step 1: Importing @react-pdf/renderer...')
    const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer')
    const React = await import('react')
    console.log('[PDF] Step 1: Import OK')

    console.log('[PDF] Step 2: Building document...')

    function formatINR(n: number) {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)
    }
    function formatDateStr(d: string) {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    }
    function formatTimeStr(t: string) {
      const [h, m] = t.split(':').map(Number)
      return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
    }
    function toWords(n: number): string {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
      if (n === 0) return 'Zero'
      if (n < 20) return ones[n]
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '')
      if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '')
      return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '')
    }

    const styles = StyleSheet.create({
      page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a2e', backgroundColor: '#ffffff' },
      header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: '#1a1a2e' },
      title: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#1a1a2e', letterSpacing: 2 },
      sub: { color: '#5a5a72', fontSize: 9, marginTop: 3 },
      parties: { flexDirection: 'row', gap: 16, marginBottom: 20 },
      partyBox: { flex: 1, backgroundColor: '#f4f4f0', borderRadius: 8, padding: 14 },
      partyLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9a9aaa', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
      partyName: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#1a1a2e', marginBottom: 4 },
      partyDetail: { color: '#5a5a72', fontSize: 9, lineHeight: 1.5 },
      tableHeader: { flexDirection: 'row', backgroundColor: '#1a1a2e', padding: 9, borderRadius: 4, marginBottom: 2 },
      thText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9 },
      row: { flexDirection: 'row', padding: 9, borderBottomWidth: 1, borderBottomColor: '#e8e8e2' },
      cell: { fontSize: 9, color: '#1a1a2e' },
      muted: { fontSize: 8, color: '#5a5a72', marginTop: 2 },
      totalsWrap: { alignItems: 'flex-end', marginTop: 14 },
      totalsBox: { width: 240 },
      tRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e8e8e2' },
      tLabel: { color: '#5a5a72', fontSize: 9 },
      tVal: { fontSize: 9 },
      grandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 2, borderTopColor: '#1a1a2e', marginTop: 4 },
      grandLabel: { fontFamily: 'Helvetica-Bold', fontSize: 13 },
      words: { backgroundColor: '#f4f4f0', borderRadius: 8, padding: 12, marginTop: 18 },
      wordsLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9a9aaa', letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' },
      wordsVal: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#1a1a2e' },
      footer: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e8e8e2', alignItems: 'center' },
      footerText: { color: '#9a9aaa', fontSize: 8, textAlign: 'center', lineHeight: 1.6 },
    })

    const isIGST = data.igstRate > 0

    const InvoiceDoc = () =>
      React.createElement(Document, { title: `Invoice ${data.invoiceNumber}` },
        React.createElement(Page, { size: 'A4', style: styles.page },
          // Header
          React.createElement(View, { style: styles.header },
            React.createElement(View, null,
              React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: '#1a1a2e' } }, 'Slotly'),
              React.createElement(Text, { style: styles.sub }, 'Professional Consulting Platform')
            ),
            React.createElement(View, { style: { alignItems: 'flex-end' } },
              React.createElement(Text, { style: styles.title }, 'INVOICE'),
              React.createElement(Text, { style: styles.sub }, `No. ${data.invoiceNumber}`),
              React.createElement(Text, { style: styles.sub }, `Date: ${formatDateStr(data.invoiceDate)}`),
              React.createElement(View, { style: { backgroundColor: '#e8a838', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, marginTop: 6 } },
                React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#1a1a2e', letterSpacing: 1 } }, 'TAX INVOICE')
              )
            )
          ),
          // Parties
          React.createElement(View, { style: styles.parties },
            React.createElement(View, { style: styles.partyBox },
              React.createElement(Text, { style: styles.partyLabel }, 'BILL FROM'),
              React.createElement(Text, { style: styles.partyName }, data.consultantName),
              React.createElement(Text, { style: styles.partyDetail }, data.consultantProfession),
              data.consultantGstin && React.createElement(Text, { style: [styles.partyDetail, { marginTop: 4, fontFamily: 'Helvetica-Bold' }] }, `GSTIN: ${data.consultantGstin}`)
            ),
            React.createElement(View, { style: styles.partyBox },
              React.createElement(Text, { style: styles.partyLabel }, 'BILL TO'),
              React.createElement(Text, { style: styles.partyName }, data.clientName),
              React.createElement(Text, { style: styles.partyDetail }, data.clientEmail),
              data.clientGstin && React.createElement(Text, { style: [styles.partyDetail, { fontFamily: 'Helvetica-Bold' }] }, `GSTIN: ${data.clientGstin}`)
            )
          ),
          // Table header
          React.createElement(View, { style: styles.tableHeader },
            React.createElement(Text, { style: [styles.thText, { width: '5%' }] }, '#'),
            React.createElement(Text, { style: [styles.thText, { width: '38%' }] }, 'Description'),
            React.createElement(Text, { style: [styles.thText, { width: '12%' }] }, 'SAC'),
            React.createElement(Text, { style: [styles.thText, { width: '25%' }] }, 'Date'),
            React.createElement(Text, { style: [styles.thText, { width: '20%', textAlign: 'right' }] }, 'Amount'),
          ),
          // Table row
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: [styles.cell, { width: '5%' }] }, '1'),
            React.createElement(View, { style: { width: '38%' } },
              React.createElement(Text, { style: [styles.cell, { fontFamily: 'Helvetica-Bold' }] }, 'Professional Consultation'),
              React.createElement(Text, { style: styles.muted }, `${data.durationMinutes} minutes`)
            ),
            React.createElement(Text, { style: [styles.cell, { width: '12%' }] }, data.sacCode),
            React.createElement(View, { style: { width: '25%' } },
              React.createElement(Text, { style: styles.cell }, formatDateStr(data.slotDate)),
              React.createElement(Text, { style: styles.muted }, formatTimeStr(data.slotTime))
            ),
            React.createElement(Text, { style: [styles.cell, { width: '20%', textAlign: 'right' }] }, formatINR(data.subtotalInr)),
          ),
          // Totals
          React.createElement(View, { style: styles.totalsWrap },
            React.createElement(View, { style: styles.totalsBox },
              React.createElement(View, { style: styles.tRow },
                React.createElement(Text, { style: styles.tLabel }, 'Subtotal'),
                React.createElement(Text, { style: styles.tVal }, formatINR(data.subtotalInr))
              ),
              isIGST
                ? React.createElement(View, { style: styles.tRow },
                    React.createElement(Text, { style: styles.tLabel }, `IGST @ ${data.igstRate}%`),
                    React.createElement(Text, { style: styles.tVal }, formatINR(data.igstAmount))
                  )
                : React.createElement(React.Fragment, null,
                    React.createElement(View, { style: styles.tRow },
                      React.createElement(Text, { style: styles.tLabel }, `CGST @ ${data.cgstRate}%`),
                      React.createElement(Text, { style: styles.tVal }, formatINR(data.cgstAmount))
                    ),
                    React.createElement(View, { style: styles.tRow },
                      React.createElement(Text, { style: styles.tLabel }, `SGST @ ${data.sgstRate}%`),
                      React.createElement(Text, { style: styles.tVal }, formatINR(data.sgstAmount))
                    )
                  ),
              React.createElement(View, { style: styles.grandRow },
                React.createElement(Text, { style: styles.grandLabel }, 'Total'),
                React.createElement(Text, { style: styles.grandLabel }, formatINR(data.totalInr))
              )
            )
          ),
          // Words
          React.createElement(View, { style: styles.words },
            React.createElement(Text, { style: styles.wordsLabel }, 'Amount in Words'),
            React.createElement(Text, { style: styles.wordsVal }, toWords(Math.round(data.totalInr)) + ' Rupees Only')
          ),
          // Footer
          React.createElement(View, { style: styles.footer },
            React.createElement(Text, { style: styles.footerText },
              'This is a computer-generated invoice. SAC ' + data.sacCode + ' | Generated by Slotly'
            )
          )
        )
      )

    console.log('[PDF] Step 3: Rendering to buffer...')
    const buffer = await pdf(React.createElement(InvoiceDoc)).toBuffer()
    console.log('[PDF] Step 3: Buffer ready, size =', buffer.length)
    return Buffer.from(buffer)
  } catch (err: any) {
    console.error('[PDF] FAILED:', err.message)
    console.error('[PDF] Stack:', err.stack)
    return null
  }
}

export async function POST(request: NextRequest) {
  const steps: string[] = []

  try {
    const { bookingId } = await request.json()
    console.log('[mark-paid] bookingId =', bookingId)
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    // STEP 1: Auth
    steps.push('auth')
    console.log('[mark-paid] Step 1: Auth...')
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      console.error('[mark-paid] Auth failed:', authErr?.message)
      return NextResponse.json({ error: 'Unauthorized', step: 'auth' }, { status: 401 })
    }
    console.log('[mark-paid] Step 1 OK: userId =', user.id)

    // STEP 2: Mark paid
    steps.push('markPaid')
    console.log('[mark-paid] Step 2: Marking booking as paid...')
    const { error: payErr } = await supabase
      .from('bookings').update({ payment_status: 'paid' })
      .eq('id', bookingId).eq('consultant_id', user.id)
    if (payErr) {
      console.error('[mark-paid] markPaid failed:', payErr.message)
      throw new Error('Mark paid failed: ' + payErr.message)
    }
    console.log('[mark-paid] Step 2 OK')

    // STEP 3: Fetch booking + profile
    steps.push('fetchData')
    console.log('[mark-paid] Step 3: Fetching booking + profile...')
    const [{ data: booking, error: bErr }, { data: profile, error: pErr }] = await Promise.all([
      supabase.from('bookings').select('*').eq('id', bookingId).single(),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])
    if (bErr || !booking) { console.error('[mark-paid] booking fetch failed:', bErr?.message); throw new Error('Booking not found') }
    if (pErr || !profile) { console.error('[mark-paid] profile fetch failed:', pErr?.message); throw new Error('Profile not found') }
    console.log('[mark-paid] Step 3 OK: booking =', booking.id, '| gstin =', profile.gstin || 'NONE')

    // If no GSTIN — done
    if (!profile.gstin) {
      console.log('[mark-paid] No GSTIN — skipping invoice')
      return NextResponse.json({ success: true, invoiceGenerated: false, reason: 'No GSTIN set on profile' })
    }

    // STEP 4: Env vars
    steps.push('envCheck')
    console.log('[mark-paid] Step 4: Checking env vars...')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      const missing = [!supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL', !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean)
      console.error('[mark-paid] Missing env vars:', missing)
      throw new Error('Missing env vars: ' + missing.join(', '))
    }
    console.log('[mark-paid] Step 4 OK: serviceKey length =', serviceKey.length)

    // STEP 5: Invoice number
    steps.push('invoiceNumber')
    const year = new Date().getFullYear()
    let invoiceNumber = booking.invoice_number
    if (!invoiceNumber) {
      invoiceNumber = `SLY-${year}-${String(Date.now()).slice(-6)}`
      await supabase.from('bookings').update({ invoice_number: invoiceNumber }).eq('id', bookingId)
    }
    console.log('[mark-paid] Step 5 OK: invoiceNumber =', invoiceNumber)

    // STEP 6: GST calc
    steps.push('gstCalc')
    const gst = calculateGST(booking.amount_inr, false)
    const today = new Date().toISOString().split('T')[0]
    console.log('[mark-paid] Step 6 OK: total =', gst.total)

    // STEP 7: Generate PDF
    steps.push('pdfGen')
    console.log('[mark-paid] Step 7: Generating PDF...')
    const pdfBuffer = await generateAndUploadPDF({
      invoiceNumber,
      invoiceDate: today,
      consultantName: profile.full_name,
      consultantProfession: profile.profession || 'Consultant',
      consultantGstin: profile.gstin,
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      clientGstin: booking.client_gstin || null,
      slotDate: booking.slot_date,
      slotTime: (booking.slot_time || '').slice(0, 5),
      durationMinutes: booking.duration_minutes,
      subtotalInr: gst.subtotal,
      cgstRate: 9, sgstRate: 9, igstRate: 0,
      cgstAmount: gst.cgst, sgstAmount: gst.sgst, igstAmount: 0,
      totalInr: gst.total,
      sacCode: '9983',
    })

    if (!pdfBuffer) {
      console.error('[mark-paid] Step 7 FAILED: PDF generation returned null')
      return NextResponse.json({
        success: true,
        invoiceGenerated: false,
        failedAt: 'pdfGeneration',
        warning: 'Payment marked paid but PDF generation failed. Check Vercel logs for [PDF] errors.'
      })
    }
    console.log('[mark-paid] Step 7 OK: PDF buffer size =', pdfBuffer.length)

    // STEP 8: Upload to storage
    steps.push('storageUpload')
    console.log('[mark-paid] Step 8: Uploading to Supabase Storage...')
    const adminClient = createAdminClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const fileName = `${invoiceNumber}.pdf`

    const { error: uploadErr } = await adminClient.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadErr) {
      console.error('[mark-paid] Step 8 FAILED: upload error =', JSON.stringify(uploadErr))
      return NextResponse.json({
        success: true,
        invoiceGenerated: false,
        failedAt: 'storageUpload',
        uploadError: uploadErr.message,
        warning: 'PDF generated but upload failed: ' + uploadErr.message
      })
    }

    const { data: urlData } = adminClient.storage.from('invoices').getPublicUrl(fileName)
    const invoiceUrl = urlData?.publicUrl
    console.log('[mark-paid] Step 8 OK: invoiceUrl =', invoiceUrl)

    // STEP 9: Save to DB
    steps.push('saveToDb')
    console.log('[mark-paid] Step 9: Saving to database...')
    await Promise.all([
      supabase.from('bookings').update({ invoice_pdf_url: invoiceUrl }).eq('id', bookingId),
      supabase.from('invoices').upsert({
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
        cgst_rate: 9, sgst_rate: 9, igst_rate: 0,
        cgst_amount: gst.cgst, sgst_amount: gst.sgst, igst_amount: 0,
        total_inr: gst.total,
        service_description: 'Professional Consultation Services',
        sac_code: '9983',
        pdf_url: invoiceUrl,
      }, { onConflict: 'booking_id' }),
    ])
    console.log('[mark-paid] Step 9 OK')

    // STEP 10: Email
    steps.push('email')
    console.log('[mark-paid] Step 10: Sending invoice email...')
    sendInvoiceEmail({
      clientEmail: booking.client_email,
      clientName: booking.client_name,
      consultantName: profile.full_name,
      invoiceNumber,
      invoiceUrl,
      totalInr: gst.total,
      slotDate: booking.slot_date,
    }).then(() => console.log('[mark-paid] Email sent OK'))
      .catch(e => console.error('[mark-paid] Email failed:', e.message))

    console.log('[mark-paid] ALL STEPS COMPLETE ✅')
    return NextResponse.json({ success: true, invoiceGenerated: true, invoiceUrl })

  } catch (error: any) {
    console.error('[mark-paid] ERROR at step', steps[steps.length - 1], ':', error.message)
    console.error('[mark-paid] Stack:', error.stack)
    return NextResponse.json({
      error: error.message,
      failedAtStep: steps[steps.length - 1] || 'unknown',
    }, { status: 500 })
  }
}
