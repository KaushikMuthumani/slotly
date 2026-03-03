// src/lib/pdf.ts
// Generates a real PDF using @react-pdf/renderer
// Run: npm install @react-pdf/renderer --legacy-peer-deps

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export interface InvoicePDFData {
  invoiceNumber: string
  invoiceDate: string
  consultantName: string
  consultantProfession: string
  consultantGstin?: string
  consultantAddress?: string
  clientName: string
  clientEmail: string
  clientGstin?: string
  serviceDescription: string
  slotDate: string
  slotTime: string
  durationMinutes: number
  subtotalInr: number
  cgstRate: number
  sgstRate: number
  igstRate: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalInr: number
  sacCode: string
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2
  }).format(n)
}

function formatDateStr(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function formatTimeStr(t: string) {
  const [h, m] = t.split(':').map(Number)
  const p = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${p}`
}

function toWords(n: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  if (n === 0) return 'Zero'
  if (n < 20) return ones[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '')
  if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '')
  if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '')
  return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '')
}

export async function generateInvoicePDFBuffer(data: InvoicePDFData): Promise<Buffer | null> {
  try {
    // Dynamic import to avoid issues with SSR/edge runtime
    const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer')
    const React = await import('react')

    const isIGST = data.igstRate > 0
    const amountWords = toWords(Math.round(data.totalInr)) + ' Rupees Only'

    const styles = StyleSheet.create({
      page: { padding: 32, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a2e', backgroundColor: '#ffffff' },
      // Header
      header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: '#1a1a2e' },
      logoBox: { width: 34, height: 34, backgroundColor: '#1a1a2e', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
      logoText: { color: '#e8a838', fontFamily: 'Helvetica-Bold', fontSize: 18 },
      logoName: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: '#1a1a2e', marginTop: 4 },
      invRight: { alignItems: 'flex-end' },
      invTitle: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: '#1a1a2e', letterSpacing: 2 },
      invSub: { color: '#5a5a72', fontSize: 9, marginTop: 2 },
      badge: { backgroundColor: '#e8a838', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3, marginTop: 5 },
      badgeText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#1a1a2e', letterSpacing: 1 },
      // Parties
      parties: { flexDirection: 'row', gap: 12, marginBottom: 18 },
      partyBox: { flex: 1, backgroundColor: '#f4f4f0', borderRadius: 8, padding: 12 },
      partyLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9a9aaa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
      partyName: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#1a1a2e', marginBottom: 3 },
      partyDetail: { color: '#5a5a72', fontSize: 9, lineHeight: 1.5 },
      gstinTag: { backgroundColor: '#1a1a2e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, marginTop: 4, alignSelf: 'flex-start' },
      gstinText: { color: '#e8a838', fontSize: 8, fontFamily: 'Helvetica-Bold' },
      // Table
      tableHeader: { flexDirection: 'row', backgroundColor: '#1a1a2e', padding: 8, borderRadius: 4, marginBottom: 1 },
      tableHeaderText: { color: 'white', fontFamily: 'Helvetica-Bold', fontSize: 9 },
      tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#e8e8e2' },
      tableRowAlt: { backgroundColor: '#fafaf8' },
      tableText: { fontSize: 9, color: '#1a1a2e' },
      tableTextMuted: { fontSize: 8, color: '#5a5a72', marginTop: 2 },
      // Totals
      totalsContainer: { alignItems: 'flex-end', marginTop: 12 },
      totalsBox: { width: 240 },
      totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#e8e8e2' },
      totalLabel: { color: '#5a5a72', fontSize: 9 },
      totalValue: { fontSize: 9, color: '#1a1a2e' },
      grandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 2, borderTopColor: '#1a1a2e', marginTop: 4 },
      grandLabel: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#1a1a2e' },
      grandValue: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#1a1a2e' },
      // Words
      wordsBox: { backgroundColor: '#f4f4f0', borderRadius: 8, padding: 12, marginTop: 16 },
      wordsLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9a9aaa', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
      wordsValue: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#1a1a2e' },
      // Footer
      footer: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e8e8e2', alignItems: 'center' },
      footerText: { color: '#9a9aaa', fontSize: 8, textAlign: 'center', lineHeight: 1.6 },
      // Col widths
      col1: { width: '5%' },
      col2: { width: '38%' },
      col3: { width: '10%' },
      col4: { width: '22%' },
      col5: { width: '25%', textAlign: 'right' },
    })

    const InvoiceDoc = () =>
      React.createElement(Document, { title: `Invoice ${data.invoiceNumber}` },
        React.createElement(Page, { size: 'A4', style: styles.page },

          // Header
          React.createElement(View, { style: styles.header },
            React.createElement(View, null,
              React.createElement(View, { style: styles.logoBox },
                React.createElement(Text, { style: styles.logoText }, 'S')
              ),
              React.createElement(Text, { style: styles.logoName }, 'Slotly')
            ),
            React.createElement(View, { style: styles.invRight },
              React.createElement(Text, { style: styles.invTitle }, 'INVOICE'),
              React.createElement(Text, { style: styles.invSub }, `No. ${data.invoiceNumber}`),
              React.createElement(Text, { style: styles.invSub }, `Date: ${formatDateStr(data.invoiceDate)}`),
              React.createElement(View, { style: styles.badge },
                React.createElement(Text, { style: styles.badgeText }, 'TAX INVOICE')
              )
            )
          ),

          // Parties
          React.createElement(View, { style: styles.parties },
            React.createElement(View, { style: styles.partyBox },
              React.createElement(Text, { style: styles.partyLabel }, 'BILL FROM'),
              React.createElement(Text, { style: styles.partyName }, data.consultantName),
              React.createElement(Text, { style: styles.partyDetail }, data.consultantProfession),
              data.consultantAddress ? React.createElement(Text, { style: styles.partyDetail }, data.consultantAddress) : null,
              data.consultantGstin
                ? React.createElement(View, { style: styles.gstinTag },
                    React.createElement(Text, { style: styles.gstinText }, `GSTIN: ${data.consultantGstin}`)
                  )
                : React.createElement(Text, { style: [styles.partyDetail, { color: '#d97706' }] }, 'GSTIN not provided')
            ),
            React.createElement(View, { style: styles.partyBox },
              React.createElement(Text, { style: styles.partyLabel }, 'BILL TO'),
              React.createElement(Text, { style: styles.partyName }, data.clientName),
              React.createElement(Text, { style: styles.partyDetail }, data.clientEmail),
              data.clientGstin
                ? React.createElement(View, { style: styles.gstinTag },
                    React.createElement(Text, { style: styles.gstinText }, `GSTIN: ${data.clientGstin}`)
                  )
                : null
            )
          ),

          // Table header
          React.createElement(View, { style: styles.tableHeader },
            React.createElement(Text, { style: [styles.tableHeaderText, styles.col1] }, '#'),
            React.createElement(Text, { style: [styles.tableHeaderText, styles.col2] }, 'Description'),
            React.createElement(Text, { style: [styles.tableHeaderText, styles.col3] }, 'SAC'),
            React.createElement(Text, { style: [styles.tableHeaderText, styles.col4] }, 'Date & Time'),
            React.createElement(Text, { style: [styles.tableHeaderText, styles.col5] }, 'Amount'),
          ),

          // Table row
          React.createElement(View, { style: styles.tableRow },
            React.createElement(Text, { style: [styles.tableText, styles.col1] }, '1'),
            React.createElement(View, { style: styles.col2 },
              React.createElement(Text, { style: [styles.tableText, { fontFamily: 'Helvetica-Bold' }] }, data.serviceDescription),
              React.createElement(Text, { style: styles.tableTextMuted }, `Duration: ${data.durationMinutes} minutes`)
            ),
            React.createElement(Text, { style: [styles.tableText, styles.col3] }, data.sacCode),
            React.createElement(View, { style: styles.col4 },
              React.createElement(Text, { style: styles.tableText }, formatDateStr(data.slotDate)),
              React.createElement(Text, { style: styles.tableTextMuted }, formatTimeStr(data.slotTime))
            ),
            React.createElement(Text, { style: [styles.tableText, styles.col5] }, formatINR(data.subtotalInr)),
          ),

          // Totals
          React.createElement(View, { style: styles.totalsContainer },
            React.createElement(View, { style: styles.totalsBox },
              React.createElement(View, { style: styles.totalRow },
                React.createElement(Text, { style: styles.totalLabel }, 'Subtotal'),
                React.createElement(Text, { style: styles.totalValue }, formatINR(data.subtotalInr))
              ),
              isIGST
                ? React.createElement(View, { style: styles.totalRow },
                    React.createElement(Text, { style: styles.totalLabel }, `IGST @ ${data.igstRate}%`),
                    React.createElement(Text, { style: styles.totalValue }, formatINR(data.igstAmount))
                  )
                : React.createElement(React.Fragment, null,
                    React.createElement(View, { style: styles.totalRow },
                      React.createElement(Text, { style: styles.totalLabel }, `CGST @ ${data.cgstRate}%`),
                      React.createElement(Text, { style: styles.totalValue }, formatINR(data.cgstAmount))
                    ),
                    React.createElement(View, { style: styles.totalRow },
                      React.createElement(Text, { style: styles.totalLabel }, `SGST @ ${data.sgstRate}%`),
                      React.createElement(Text, { style: styles.totalValue }, formatINR(data.sgstAmount))
                    )
                  ),
              React.createElement(View, { style: styles.grandRow },
                React.createElement(Text, { style: styles.grandLabel }, 'Total'),
                React.createElement(Text, { style: styles.grandValue }, formatINR(data.totalInr))
              )
            )
          ),

          // Amount in words
          React.createElement(View, { style: styles.wordsBox },
            React.createElement(Text, { style: styles.wordsLabel }, 'Amount in Words'),
            React.createElement(Text, { style: styles.wordsValue }, amountWords)
          ),

          // Footer
          React.createElement(View, { style: styles.footer },
            React.createElement(Text, { style: styles.footerText },
              'This is a computer-generated invoice and does not require a physical signature.\n' +
              `SAC Code ${data.sacCode} — Professional and Management Consulting Services | Generated by Slotly`
            )
          )
        )
      )

    const pdfBlob = await pdf(React.createElement(InvoiceDoc)).toBuffer()
    return Buffer.from(pdfBlob)
  } catch (err) {
    console.error('PDF generation error:', err)
    return null
  }
}

export async function uploadInvoicePDFToStorage(
  pdfBuffer: Buffer,
  invoiceNumber: string
): Promise<string | null> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars')
      return null
    }

    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )

    const fileName = `${invoiceNumber}.pdf`

    const { error: uploadError } = await adminClient.storage
      .from('invoices')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('PDF upload error:', JSON.stringify(uploadError))
      return null
    }

    const { data: urlData } = adminClient.storage
      .from('invoices')
      .getPublicUrl(fileName)

    return urlData?.publicUrl || null
  } catch (err) {
    console.error('uploadInvoicePDFToStorage error:', err)
    return null
  }
}
