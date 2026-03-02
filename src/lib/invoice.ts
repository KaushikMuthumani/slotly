// src/lib/invoice.ts
// Generates GST invoice HTML and converts to PDF using browser-compatible approach

export interface InvoiceData {
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

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (num === 0) return 'Zero'
  if (num < 20) return ones[num]
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '')
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '')
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '')
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '')
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '')
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const isInterState = data.igstRate > 0
  const amountInWords = numberToWords(data.totalInr) + ' Rupees Only'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: white; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #1a1a2e; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 40px; height: 40px; background: #1a1a2e; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    .logo-icon span { color: #e8a838; font-weight: 700; font-size: 22px; }
    .logo-name { font-size: 24px; font-weight: 700; color: #1a1a2e; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; color: #1a1a2e; letter-spacing: 2px; }
    .invoice-title p { color: #5a5a72; font-size: 13px; margin-top: 4px; }
    .tax-invoice-badge { background: #e8a838; color: #1a1a2e; padding: 4px 12px; border-radius: 4px; font-weight: 700; font-size: 12px; letter-spacing: 1px; display: inline-block; margin-top: 8px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .party-box { background: #f4f4f0; border-radius: 10px; padding: 16px; }
    .party-label { font-size: 11px; font-weight: 700; color: #9a9aaa; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px; }
    .party-name { font-size: 16px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .party-detail { color: #5a5a72; font-size: 12px; line-height: 1.7; }
    .gstin-tag { display: inline-block; background: #1a1a2e; color: #e8a838; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; font-family: monospace; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #1a1a2e; color: white; }
    thead th { padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
    tbody tr { border-bottom: 1px solid #e8e8e2; }
    tbody tr:nth-child(even) { background: #fafaf8; }
    tbody td { padding: 14px; color: #1a1a2e; font-size: 13px; }
    .totals { margin-left: auto; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8e8e2; font-size: 13px; }
    .total-row.grand { font-weight: 700; font-size: 16px; border-bottom: none; border-top: 2px solid #1a1a2e; padding-top: 12px; margin-top: 4px; color: #1a1a2e; }
    .total-label { color: #5a5a72; }
    .amount-words { background: #f4f4f0; border-radius: 10px; padding: 14px; margin: 20px 0; }
    .amount-words-label { font-size: 11px; font-weight: 700; color: #9a9aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .amount-words-value { font-size: 14px; font-weight: 600; color: #1a1a2e; }
    .footer-note { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e8e8e2; text-align: center; color: #9a9aaa; font-size: 12px; line-height: 1.8; }
    .sac-note { color: #5a5a72; font-size: 11px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon"><span>S</span></div>
      <span class="logo-name">Slotly</span>
    </div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <p>No. <strong>${data.invoiceNumber}</strong></p>
      <p>Date: ${formatDate(data.invoiceDate)}</p>
      <div class="tax-invoice-badge">TAX INVOICE</div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <div class="party-label">Bill From</div>
      <div class="party-name">${data.consultantName}</div>
      <div class="party-detail">
        ${data.consultantProfession}<br>
        ${data.consultantAddress || ''}<br>
        ${data.consultantGstin ? `<span class="gstin-tag">GSTIN: ${data.consultantGstin}</span>` : '<span style="color:#d97706;font-size:11px;">GSTIN not provided</span>'}
      </div>
    </div>
    <div class="party-box">
      <div class="party-label">Bill To</div>
      <div class="party-name">${data.clientName}</div>
      <div class="party-detail">
        ${data.clientEmail}<br>
        ${data.clientGstin ? `<span class="gstin-tag">GSTIN: ${data.clientGstin}</span>` : ''}
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>SAC Code</th>
        <th>Date & Time</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>
          <strong>${data.serviceDescription}</strong><br>
          <span style="color:#5a5a72;font-size:12px;">Duration: ${data.durationMinutes} minutes</span>
        </td>
        <td>${data.sacCode}</td>
        <td>${formatDate(data.slotDate)}<br><span style="color:#5a5a72;font-size:12px;">${formatTime(data.slotTime)}</span></td>
        <td style="text-align:right;">${formatINR(data.subtotalInr)}</td>
      </tr>
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;">
    <div class="totals">
      <div class="total-row">
        <span class="total-label">Subtotal</span>
        <span>${formatINR(data.subtotalInr)}</span>
      </div>
      ${isInterState ? `
      <div class="total-row">
        <span class="total-label">IGST @ ${data.igstRate}%</span>
        <span>${formatINR(data.igstAmount)}</span>
      </div>
      ` : `
      <div class="total-row">
        <span class="total-label">CGST @ ${data.cgstRate}%</span>
        <span>${formatINR(data.cgstAmount)}</span>
      </div>
      <div class="total-row">
        <span class="total-label">SGST @ ${data.sgstRate}%</span>
        <span>${formatINR(data.sgstAmount)}</span>
      </div>
      `}
      <div class="total-row grand">
        <span>Total</span>
        <span>${formatINR(data.totalInr)}</span>
      </div>
    </div>
  </div>

  <div class="amount-words">
    <div class="amount-words-label">Amount in Words</div>
    <div class="amount-words-value">${amountInWords}</div>
  </div>

  <div class="footer-note">
    <p>This is a computer-generated invoice and does not require a physical signature.</p>
    <p class="sac-note">SAC Code ${data.sacCode} — Professional and Management Consulting Services | Generated by Slotly</p>
  </div>
</body>
</html>
  `
}
