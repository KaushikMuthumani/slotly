// src/lib/invoice.ts

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

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatTime(t: string) {
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

export function generateInvoiceHTML(d: InvoiceData): string {
  const isIGST = d.igstRate > 0
  const amountWords = toWords(Math.round(d.totalInr)) + ' Rupees Only'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${d.invoiceNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a2e;background:white;padding:32px}
  @media print{body{padding:0}@page{margin:15mm}}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #1a1a2e}
  .logo{display:flex;align-items:center;gap:10px}
  .logo-box{width:38px;height:38px;background:#1a1a2e;border-radius:8px;display:flex;align-items:center;justify-content:center}
  .logo-box span{color:#e8a838;font-weight:700;font-size:20px}
  .logo-name{font-size:22px;font-weight:700;color:#1a1a2e}
  .inv-title h1{font-size:26px;color:#1a1a2e;letter-spacing:2px;text-align:right}
  .inv-title p{color:#5a5a72;font-size:12px;text-align:right;margin-top:3px}
  .badge{background:#e8a838;color:#1a1a2e;padding:3px 10px;border-radius:4px;font-weight:700;font-size:11px;letter-spacing:1px;display:inline-block;margin-top:6px}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
  .party{background:#f4f4f0;border-radius:10px;padding:14px}
  .party-label{font-size:10px;font-weight:700;color:#9a9aaa;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}
  .party-name{font-size:15px;font-weight:700;color:#1a1a2e;margin-bottom:3px}
  .party-detail{color:#5a5a72;font-size:12px;line-height:1.7}
  .gstin{display:inline-block;background:#1a1a2e;color:#e8a838;padding:2px 7px;border-radius:3px;font-size:11px;font-weight:600;font-family:monospace;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  thead tr{background:#1a1a2e;color:white}
  thead th{padding:10px 12px;text-align:left;font-size:12px;font-weight:600}
  tbody tr{border-bottom:1px solid #e8e8e2}
  tbody tr:nth-child(even){background:#fafaf8}
  tbody td{padding:12px;font-size:13px}
  .totals{margin-left:auto;width:280px}
  .t-row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e8e8e2;font-size:13px}
  .t-label{color:#5a5a72}
  .t-grand{font-weight:700;font-size:15px;border-bottom:none;border-top:2px solid #1a1a2e;padding-top:10px;margin-top:3px}
  .words{background:#f4f4f0;border-radius:8px;padding:12px;margin:16px 0}
  .words-label{font-size:10px;font-weight:700;color:#9a9aaa;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
  .words-value{font-size:13px;font-weight:600;color:#1a1a2e}
  .print-btn{position:fixed;bottom:24px;right:24px;background:#1a1a2e;color:white;border:none;padding:12px 20px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.2)}
  @media print{.print-btn{display:none}}
  .footer{margin-top:24px;padding-top:16px;border-top:1px solid #e8e8e2;text-align:center;color:#9a9aaa;font-size:11px;line-height:1.8}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>

<div class="header">
  <div class="logo">
    <div class="logo-box"><span>S</span></div>
    <span class="logo-name">zlotra</span>
  </div>
  <div class="inv-title">
    <h1>INVOICE</h1>
    <p>No. <strong>${d.invoiceNumber}</strong></p>
    <p>Date: ${formatDate(d.invoiceDate)}</p>
    <div class="badge">TAX INVOICE</div>
  </div>
</div>

<div class="parties">
  <div class="party">
    <div class="party-label">Bill From</div>
    <div class="party-name">${d.consultantName}</div>
    <div class="party-detail">
      ${d.consultantProfession}<br>
      ${d.consultantAddress || ''}
      ${d.consultantGstin ? `<br><span class="gstin">GSTIN: ${d.consultantGstin}</span>` : '<br><span style="color:#d97706;font-size:11px;">GSTIN not provided</span>'}
    </div>
  </div>
  <div class="party">
    <div class="party-label">Bill To</div>
    <div class="party-name">${d.clientName}</div>
    <div class="party-detail">
      ${d.clientEmail}
      ${d.clientGstin ? `<br><span class="gstin">GSTIN: ${d.clientGstin}</span>` : ''}
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Description</th>
      <th>SAC</th>
      <th>Date & Time</th>
      <th style="text-align:right">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td><strong>${d.serviceDescription}</strong><br><span style="color:#5a5a72;font-size:12px">Duration: ${d.durationMinutes} minutes</span></td>
      <td>${d.sacCode}</td>
      <td>${formatDate(d.slotDate)}<br><span style="color:#5a5a72;font-size:12px">${formatTime(d.slotTime)}</span></td>
      <td style="text-align:right">${formatINR(d.subtotalInr)}</td>
    </tr>
  </tbody>
</table>

<div style="display:flex;justify-content:flex-end">
  <div class="totals">
    <div class="t-row"><span class="t-label">Subtotal</span><span>${formatINR(d.subtotalInr)}</span></div>
    ${isIGST
      ? `<div class="t-row"><span class="t-label">IGST @ ${d.igstRate}%</span><span>${formatINR(d.igstAmount)}</span></div>`
      : `<div class="t-row"><span class="t-label">CGST @ ${d.cgstRate}%</span><span>${formatINR(d.cgstAmount)}</span></div>
         <div class="t-row"><span class="t-label">SGST @ ${d.sgstRate}%</span><span>${formatINR(d.sgstAmount)}</span></div>`
    }
    <div class="t-row t-grand"><span>Total</span><span>${formatINR(d.totalInr)}</span></div>
  </div>
</div>

<div class="words">
  <div class="words-label">Amount in Words</div>
  <div class="words-value">${amountWords}</div>
</div>

<div class="footer">
  <p>This is a computer-generated invoice and does not require a physical signature.</p>
  <p>SAC Code ${d.sacCode} — Professional and Management Consulting Services | Generated by zlotra</p>
</div>
</body>
</html>`
}
