import jsPDF from 'jspdf'

export interface InvoiceData {
  invoiceNumber: string; invoiceDate: string
  consultantName: string; consultantProfession: string; consultantGstin: string
  clientName: string; clientEmail: string; clientGstin?: string | null
  slotDate: string; slotTime: string; durationMinutes: number
  subtotalInr: number; cgstRate: number; sgstRate: number
  cgstAmount: number; sgstAmount: number; totalInr: number; sacCode: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return (h % 12 || 12) + ':' + m.toString().padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM')
}
function toWords(n: number): string {
  const o = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
  const t = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
  if (n === 0) return 'Zero'
  if (n < 20) return o[n]
  if (n < 100) return t[Math.floor(n/10)] + (n%10 ? ' '+o[n%10] : '')
  if (n < 1000) return o[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' '+toWords(n%100) : '')
  if (n < 100000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' '+toWords(n%1000) : '')
  return toWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' '+toWords(n%100000) : '')
}
function hexRgb(hex: string): [number,number,number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)]
}

export function generateInvoicePDF(data: InvoiceData): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, PAD = 16
  let y = 0

  const fill = (h: string) => doc.setFillColor(...hexRgb(h))
  const draw = (h: string) => doc.setDrawColor(...hexRgb(h))
  const clr  = (h: string) => doc.setTextColor(...hexRgb(h))
  const B = (sz: number) => { doc.setFont('helvetica','bold'); doc.setFontSize(sz) }
  const N = (sz: number) => { doc.setFont('helvetica','normal'); doc.setFontSize(sz) }
  const box = (x: number, yy: number, w: number, h: number, col: string) => {
    fill(col); draw(col); doc.rect(x, yy, w, h, 'F')
  }
  const hr = (yy: number, col = '#e0e0da') => {
    draw(col); doc.setLineWidth(0.25); doc.line(PAD, yy, W-PAD, yy)
  }
  const T = (s: string, x: number, yy: number, a: 'left'|'right'|'center' = 'left') =>
    doc.text(s, x, yy, { align: a })

  // Header
  box(0, 0, W, 30, '#1a1a2e')
  B(20); clr('#ffffff'); T('Slotly', PAD, 14)
  N(8); doc.setTextColor(170,170,204); T('Professional Consulting Platform', PAD, 21)
  B(24); clr('#ffffff'); T('INVOICE', W-PAD, 12, 'right')
  box(W-PAD-38, 15, 38, 7, '#e8a838')
  B(7.5); clr('#1a1a2e'); T('GST TAX INVOICE', W-PAD-19, 20.5, 'center')
  N(8); doc.setTextColor(170,170,204); T('No. ' + data.invoiceNumber, W-PAD, 26, 'right')
  y = 36

  N(9); clr('#5a5a72'); T('Invoice Date: ' + fmtDate(data.invoiceDate), W-PAD, y, 'right')
  y += 8

  // Parties
  const pw = (W - PAD*2 - 6) / 2
  const ph = data.clientGstin ? 30 : 26
  box(PAD, y, pw, ph, '#f4f4f0')
  B(7); clr('#5a5a72'); T('BILL FROM', PAD+5, y+6)
  B(11); clr('#1a1a2e'); T(data.consultantName.slice(0,28), PAD+5, y+13)
  N(8); clr('#5a5a72'); T(data.consultantProfession.slice(0,30), PAD+5, y+19)
  B(8); clr('#1a1a2e'); T('GSTIN: ' + data.consultantGstin, PAD+5, y+25)
  const tx = PAD + pw + 6
  box(tx, y, pw, ph, '#f4f4f0')
  B(7); clr('#5a5a72'); T('BILL TO', tx+5, y+6)
  B(11); clr('#1a1a2e'); T(data.clientName.slice(0,28), tx+5, y+13)
  N(8); clr('#5a5a72'); T(data.clientEmail.slice(0,32), tx+5, y+19)
  if (data.clientGstin) { B(8); clr('#1a1a2e'); T('GSTIN: ' + data.clientGstin, tx+5, y+25) }
  y += ph + 8

  // Table header
  box(PAD, y, W-PAD*2, 9, '#1a1a2e')
  B(8); clr('#ffffff')
  T('#', PAD+3, y+6); T('DESCRIPTION', PAD+12, y+6); T('SAC', PAD+78, y+6)
  T('DATE & TIME', PAD+98, y+6); T('AMOUNT', W-PAD-3, y+6, 'right')
  y += 9

  // Table row
  box(PAD, y, W-PAD*2, 18, '#fafaf8')
  draw('#e0e0da'); doc.setLineWidth(0.2); doc.rect(PAD, y, W-PAD*2, 18)
  N(9); clr('#1a1a2e'); T('1', PAD+3, y+7)
  B(9); T('Professional Consultation Services', PAD+12, y+7)
  N(8); clr('#5a5a72'); T('Duration: ' + data.durationMinutes + ' min', PAD+12, y+13)
  N(9); clr('#1a1a2e'); T(data.sacCode, PAD+78, y+7)
  T(fmtDate(data.slotDate), PAD+98, y+7)
  N(8); clr('#5a5a72'); T(fmtTime(data.slotTime), PAD+98, y+13)
  B(9); clr('#1a1a2e'); T(fmt(data.subtotalInr), W-PAD-3, y+7, 'right')
  y += 26

  // Totals
  const tx2 = W-PAD-72, tw = 72
  const trow = (label: string, val: string, grand = false) => {
    if (grand) {
      box(tx2, y-2, tw, 11, '#1a1a2e')
      B(11); clr('#ffffff')
      T(label, tx2+4, y+6); T(val, tx2+tw-4, y+6, 'right')
    } else {
      hr(y-2); N(9); clr('#5a5a72'); T(label, tx2+4, y+5)
      clr('#1a1a2e'); T(val, tx2+tw-4, y+5, 'right')
    }
    y += 10
  }
  trow('Subtotal', fmt(data.subtotalInr))
  trow('CGST @ ' + data.cgstRate + '%', fmt(data.cgstAmount))
  trow('SGST @ ' + data.sgstRate + '%', fmt(data.sgstAmount))
  trow('Total', fmt(data.totalInr), true)
  y += 6

  // Amount in words
  box(PAD, y, W-PAD*2, 14, '#f4f4f0')
  B(7); clr('#5a5a72'); T('AMOUNT IN WORDS', PAD+5, y+5)
  B(10); clr('#1a1a2e'); T(toWords(Math.round(data.totalInr)) + ' Rupees Only', PAD+5, y+11)
  y += 20
  N(8); clr('#5a5a72')
  T('Thank you for your business. Payment is due within the agreed terms.', PAD, y)

  // Footer
  hr(282, '#cccccc')
  N(7); doc.setTextColor(150,150,160)
  T('Computer-generated invoice — no physical signature required  |  SAC ' + data.sacCode + '  |  Generated by Slotly', W/2, 287, 'center')

  return Buffer.from(doc.output('arraybuffer'))
}