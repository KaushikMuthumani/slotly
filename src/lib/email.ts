// src/lib/email.ts
// All Resend email functions for Slotly

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://slotly-two.vercel.app'

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set — email not sent')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Slotly <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return false
    }
    return true
  } catch (err) {
    console.error('Email send exception:', err)
    return false
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

// ─── Base template ────────────────────────────────────────────────────────────

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fafaf8;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:#1a1a2e;padding:20px 28px;display:flex;align-items:center;gap:10px;">
      <div style="width:34px;height:34px;background:#e8a838;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
        <span style="color:#1a1a2e;font-weight:700;font-size:18px;">S</span>
      </div>
      <span style="color:white;font-size:20px;font-weight:600;letter-spacing:-0.5px;">Slotly</span>
    </div>
    <div style="padding:28px;">
      ${content}
    </div>
    <div style="padding:16px 28px;background:#f4f4f0;border-top:1px solid #e8e8e2;text-align:center;">
      <p style="margin:0;color:#9a9aaa;font-size:12px;">© 2025 Slotly. Made with ❤️ in India.</p>
    </div>
  </div>
</body>
</html>`
}

// ─── 1. Booking confirmation → client ─────────────────────────────────────────

export async function sendClientBookingConfirmation({
  clientName,
  clientEmail,
  consultantName,
  consultantProfession,
  slotDate,
  slotTime,
  duration,
  amountInr,
  hasGst,
}: {
  clientName: string
  clientEmail: string
  consultantName: string
  consultantProfession: string
  slotDate: string
  slotTime: string
  duration: number
  amountInr: number
  hasGst: boolean
}) {
  const rows = [
    ['Consultant', `${consultantName} (${consultantProfession})`],
    ['Date', formatDate(slotDate)],
    ['Time', formatTime(slotTime)],
    ['Duration', `${duration} minutes`],
    ['Amount', formatINR(amountInr)],
  ]
  const content = `
    <h2 style="margin:0 0 6px;color:#1a1a2e;font-size:22px;">Booking Confirmed! ✅</h2>
    <p style="margin:0 0 20px;color:#5a5a72;">Your appointment has been booked successfully.</p>
    <div style="background:#f4f4f0;border-radius:10px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        ${rows.map(([l, v]) => `<tr>
          <td style="padding:7px 0;color:#9a9aaa;font-size:13px;width:110px;">${l}</td>
          <td style="padding:7px 0;color:#1a1a2e;font-weight:500;font-size:13px;">${v}</td>
        </tr>`).join('')}
      </table>
    </div>
    ${hasGst ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:14px;">
      <p style="margin:0;color:#16a34a;font-size:13px;">🧾 <strong>GST Invoice</strong> will be emailed after payment confirmation.</p>
    </div>` : ''}
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin-bottom:14px;">
      <p style="margin:0;color:#92400e;font-size:13px;">💳 <strong>Payment Pending</strong> — The consultant will reach out with payment details shortly.</p>
    </div>
    <p style="color:#5a5a72;font-size:13px;line-height:1.6;margin:0;">You will receive a reminder 24 hours and 1 hour before your appointment.</p>
  `
  return sendEmail({
    to: clientEmail,
    subject: `Booking Confirmed — ${consultantName} on ${formatDate(slotDate)}`,
    html: baseTemplate(content),
  })
}

// ─── 2. Booking notification → consultant ─────────────────────────────────────

export async function sendConsultantBookingNotification({
  consultantEmail,
  consultantName,
  clientName,
  clientEmail,
  clientPhone,
  clientNotes,
  slotDate,
  slotTime,
  duration,
  amountInr,
}: {
  consultantEmail: string
  consultantName: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  clientNotes?: string
  slotDate: string
  slotTime: string
  duration: number
  amountInr: number
}) {
  const rows = [
    ['Client', clientName],
    ['Email', clientEmail],
    ['Phone', clientPhone || 'Not provided'],
    ['Date', formatDate(slotDate)],
    ['Time', formatTime(slotTime)],
    ['Duration', `${duration} minutes`],
    ['Fee', formatINR(amountInr)],
  ]
  const content = `
    <h2 style="margin:0 0 6px;color:#1a1a2e;font-size:22px;">New Booking! 🎉</h2>
    <p style="margin:0 0 20px;color:#5a5a72;">You have a new appointment.</p>
    <div style="background:#f4f4f0;border-radius:10px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        ${rows.map(([l, v]) => `<tr>
          <td style="padding:7px 0;color:#9a9aaa;font-size:13px;width:110px;">${l}</td>
          <td style="padding:7px 0;color:#1a1a2e;font-weight:500;font-size:13px;">${v}</td>
        </tr>`).join('')}
      </table>
    </div>
    ${clientNotes ? `<div style="background:#f4f4f0;border-radius:8px;padding:12px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-weight:600;font-size:13px;color:#1a1a2e;">Client Query:</p>
      <p style="margin:0;color:#5a5a72;font-size:13px;">${clientNotes}</p>
    </div>` : ''}
    <a href="${APP_URL}/dashboard/bookings" style="display:inline-block;background:#1a1a2e;color:white;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View in Dashboard →</a>
  `
  return sendEmail({
    to: consultantEmail,
    subject: `New Booking from ${clientName} — ${formatDate(slotDate)}`,
    html: baseTemplate(content),
  })
}

// ─── 3. Reminder email ─────────────────────────────────────────────────────────

export async function sendReminderEmail({
  recipientEmail,
  recipientName,
  otherPartyName,
  slotDate,
  slotTime,
  duration,
  isConsultant,
  hoursBeforeAppointment,
}: {
  recipientEmail: string
  recipientName: string
  otherPartyName: string
  slotDate: string
  slotTime: string
  duration: number
  isConsultant: boolean
  hoursBeforeAppointment: number
}) {
  const timeLabel = hoursBeforeAppointment === 1 ? '1 hour' : '24 hours'
  const otherLabel = isConsultant ? 'Client' : 'Consultant'
  const rows = [
    [otherLabel, otherPartyName],
    ['Date', formatDate(slotDate)],
    ['Time', formatTime(slotTime)],
    ['Duration', `${duration} minutes`],
  ]
  const content = `
    <h2 style="margin:0 0 6px;color:#1a1a2e;font-size:22px;">Reminder: ${timeLabel} to go ⏰</h2>
    <p style="margin:0 0 20px;color:#5a5a72;">Your appointment is coming up in ${timeLabel}.</p>
    <div style="background:#f4f4f0;border-radius:10px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        ${rows.map(([l, v]) => `<tr>
          <td style="padding:7px 0;color:#9a9aaa;font-size:13px;width:110px;">${l}</td>
          <td style="padding:7px 0;color:#1a1a2e;font-weight:500;font-size:13px;">${v}</td>
        </tr>`).join('')}
      </table>
    </div>
    <p style="color:#5a5a72;font-size:13px;">Please be ready a few minutes early. 🙏</p>
  `
  return sendEmail({
    to: recipientEmail,
    subject: `Reminder: Appointment in ${timeLabel} — ${formatDate(slotDate)} at ${formatTime(slotTime)}`,
    html: baseTemplate(content),
  })
}

// ─── 4. Cancellation email ────────────────────────────────────────────────────

export async function sendCancellationEmail({
  recipientEmail,
  recipientName,
  otherPartyName,
  slotDate,
  slotTime,
  isConsultant,
  reason,
}: {
  recipientEmail: string
  recipientName: string
  otherPartyName: string
  slotDate: string
  slotTime: string
  isConsultant: boolean
  reason?: string
}) {
  const rows = [
    [isConsultant ? 'Client' : 'Consultant', otherPartyName],
    ['Date', formatDate(slotDate)],
    ['Time', formatTime(slotTime)],
  ]
  const content = `
    <h2 style="margin:0 0 6px;color:#1a1a2e;font-size:22px;">Booking Cancelled ❌</h2>
    <p style="margin:0 0 20px;color:#5a5a72;">Your appointment has been cancelled.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        ${rows.map(([l, v]) => `<tr>
          <td style="padding:7px 0;color:#9a9aaa;font-size:13px;width:110px;">${l}</td>
          <td style="padding:7px 0;color:#dc2626;font-weight:500;font-size:13px;">${v}</td>
        </tr>`).join('')}
      </table>
    </div>
    ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-bottom:14px;">
      <p style="margin:0;font-size:13px;color:#dc2626;"><strong>Reason:</strong> ${reason}</p>
    </div>` : ''}
    <p style="color:#5a5a72;font-size:13px;">If you have questions, contact the ${isConsultant ? 'client' : 'consultant'} directly.</p>
    ${!isConsultant ? `<a href="${APP_URL}" style="display:inline-block;background:#1a1a2e;color:white;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px;">Book Again →</a>` : ''}
  `
  return sendEmail({
    to: recipientEmail,
    subject: `Booking Cancelled — ${formatDate(slotDate)} at ${formatTime(slotTime)}`,
    html: baseTemplate(content),
  })
}

// ─── 5. Invoice ready email → client ─────────────────────────────────────────

export async function sendInvoiceEmail({
  clientEmail,
  clientName,
  consultantName,
  invoiceNumber,
  invoiceUrl,
  totalInr,
  slotDate,
}: {
  clientEmail: string
  clientName: string
  consultantName: string
  invoiceNumber: string
  invoiceUrl: string
  totalInr: number
  slotDate: string
}) {
  const rows = [
    ['Invoice No.', invoiceNumber],
    ['Consultant', consultantName],
    ['Date', formatDate(slotDate)],
    ['Amount Paid', formatINR(totalInr)],
  ]
  const content = `
    <h2 style="margin:0 0 6px;color:#1a1a2e;font-size:22px;">Your Invoice is Ready 🧾</h2>
    <p style="margin:0 0 20px;color:#5a5a72;">Payment confirmed. Your GST invoice is below.</p>
    <div style="background:#f4f4f0;border-radius:10px;padding:16px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        ${rows.map(([l, v]) => `<tr>
          <td style="padding:7px 0;color:#9a9aaa;font-size:13px;width:110px;">${l}</td>
          <td style="padding:7px 0;color:#1a1a2e;font-weight:500;font-size:13px;">${v}</td>
        </tr>`).join('')}
      </table>
    </div>
    <a href="${invoiceUrl}" target="_blank" style="display:inline-block;background:#1a1a2e;color:white;padding:13px 26px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:16px;">📄 View & Download Invoice</a>
    <p style="color:#9a9aaa;font-size:12px;margin-top:12px;">Opens as a web page. Use browser Print → Save as PDF to download.</p>
  `
  return sendEmail({
    to: clientEmail,
    subject: `Invoice ${invoiceNumber} from ${consultantName}`,
    html: baseTemplate(content),
  })
}
