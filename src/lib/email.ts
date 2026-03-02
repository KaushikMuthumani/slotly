// src/lib/email.ts
// All email sending functions using Resend

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
    console.error('RESEND_API_KEY not set')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
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
    console.error('Email send failed:', err)
    return false
  }
}

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`
}

// Base email template
function baseTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Slotly</title>
    </head>
    <body style="margin:0;padding:0;background:#fafaf8;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background:#1a1a2e;padding:24px 32px;display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;background:#e8a838;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
            <span style="color:#1a1a2e;font-weight:700;font-size:20px;">S</span>
          </div>
          <span style="color:white;font-size:22px;font-weight:600;letter-spacing:-0.5px;">Slotly</span>
        </div>
        <!-- Content -->
        <div style="padding:32px;">
          ${content}
        </div>
        <!-- Footer -->
        <div style="padding:20px 32px;background:#f4f4f0;border-top:1px solid #e8e8e2;text-align:center;">
          <p style="margin:0;color:#9a9aaa;font-size:13px;">Slotly — Smart Booking for Indian Professionals</p>
          <p style="margin:4px 0 0;color:#9a9aaa;font-size:12px;">© 2025 Slotly. Made with ❤️ in India.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// 1. Booking confirmation to CLIENT
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
  invoiceNote,
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
  invoiceNote?: string
}) {
  const content = `
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:24px;">Booking Confirmed! ✅</h2>
    <p style="margin:0 0 24px;color:#5a5a72;">Your appointment has been successfully booked.</p>

    <div style="background:#f4f4f0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        ${[
          ['Consultant', `${consultantName} (${consultantProfession})`],
          ['Date', formatDate(slotDate)],
          ['Time', formatTime(slotTime)],
          ['Duration', `${duration} minutes`],
          ['Amount', formatINR(amountInr)],
        ].map(([label, value]) => `
          <tr>
            <td style="padding:8px 0;color:#9a9aaa;font-size:14px;width:120px;">${label}</td>
            <td style="padding:8px 0;color:#1a1a2e;font-weight:500;font-size:14px;">${value}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    ${hasGst ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;color:#16a34a;font-size:14px;">🧾 <strong>GST Invoice</strong> — A tax invoice will be emailed to you after payment is confirmed.</p>
    </div>
    ` : ''}

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:20px;">
      <p style="margin:0;color:#92400e;font-size:14px;">💳 <strong>Payment Pending</strong> — Please complete your payment to confirm the slot. The consultant will reach out with payment details shortly.</p>
    </div>

    <p style="color:#5a5a72;font-size:14px;line-height:1.6;">You will receive a reminder 24 hours and 1 hour before your appointment. Please keep this email for your records.</p>
  `

  return sendEmail({
    to: clientEmail,
    subject: `Booking Confirmed — ${consultantName} on ${formatDate(slotDate)}`,
    html: baseTemplate(content),
  })
}

// 2. Booking notification to CONSULTANT
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
  const content = `
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:24px;">New Booking! 🎉</h2>
    <p style="margin:0 0 24px;color:#5a5a72;">You have a new appointment request.</p>

    <div style="background:#f4f4f0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        ${[
          ['Client', clientName],
          ['Email', clientEmail],
          ['Phone', clientPhone || 'Not provided'],
          ['Date', formatDate(slotDate)],
          ['Time', formatTime(slotTime)],
          ['Duration', `${duration} minutes`],
          ['Fee', formatINR(amountInr)],
        ].map(([label, value]) => `
          <tr>
            <td style="padding:8px 0;color:#9a9aaa;font-size:14px;width:120px;">${label}</td>
            <td style="padding:8px 0;color:#1a1a2e;font-weight:500;font-size:14px;">${value}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    ${clientNotes ? `
    <div style="background:#f4f4f0;border-radius:10px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-weight:600;font-size:14px;color:#1a1a2e;">Client's Query:</p>
      <p style="margin:0;color:#5a5a72;font-size:14px;">${clientNotes}</p>
    </div>
    ` : ''}

    <a href="${APP_URL}/dashboard/bookings" style="display:inline-block;background:#1a1a2e;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">View in Dashboard →</a>
  `

  return sendEmail({
    to: consultantEmail,
    subject: `New Booking from ${clientName} — ${formatDate(slotDate)}`,
    html: baseTemplate(content),
  })
}

// 3. Reminder email (used for both 24hr and 1hr)
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

  const content = `
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:24px;">Reminder: ${timeLabel} to go ⏰</h2>
    <p style="margin:0 0 24px;color:#5a5a72;">Your appointment is coming up in ${timeLabel}.</p>

    <div style="background:#f4f4f0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        ${[
          [otherLabel, otherPartyName],
          ['Date', formatDate(slotDate)],
          ['Time', formatTime(slotTime)],
          ['Duration', `${duration} minutes`],
        ].map(([label, value]) => `
          <tr>
            <td style="padding:8px 0;color:#9a9aaa;font-size:14px;width:120px;">${label}</td>
            <td style="padding:8px 0;color:#1a1a2e;font-weight:500;font-size:14px;">${value}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <p style="color:#5a5a72;font-size:14px;">Please be ready a few minutes early. Good luck! 🙏</p>
  `

  return sendEmail({
    to: recipientEmail,
    subject: `Reminder: Appointment in ${timeLabel} — ${formatDate(slotDate)} at ${formatTime(slotTime)}`,
    html: baseTemplate(content),
  })
}

// 4. Cancellation email
export async function sendCancellationEmail({
  recipientEmail,
  recipientName,
  otherPartyName,
  slotDate,
  slotTime,
  isConsultant,
  reason,
}: {
  reason?: string
  recipientEmail: string
  recipientName: string
  otherPartyName: string
  slotDate: string
  slotTime: string
  isConsultant: boolean
}) {
  const content = `
    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:24px;">Booking Cancelled ❌</h2>
    <p style="margin:0 0 24px;color:#5a5a72;">Your appointment has been cancelled.</p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        ${[
          [isConsultant ? 'Client' : 'Consultant', otherPartyName],
          ['Date', formatDate(slotDate)],
          ['Time', formatTime(slotTime)],
        ].map(([label, value]) => `
          <tr>
            <td style="padding:8px 0;color:#9a9aaa;font-size:14px;width:120px;">${label}</td>
            <td style="padding:8px 0;color:#dc2626;font-weight:500;font-size:14px;">${value}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    ${reason ? `
<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin-bottom:16px;">
  <p style="margin:0;font-size:14px;color:#dc2626;"><strong>Reason:</strong> ${reason}</p>
</div>
` : ''}

    <p style="color:#5a5a72;font-size:14px;">If you have any questions, please contact the ${isConsultant ? 'client' : 'consultant'} directly.</p>
    ${!isConsultant ? `<a href="${APP_URL}" style="display:inline-block;background:#1a1a2e;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Book Again →</a>` : ''}
  `

  return sendEmail({
    to: recipientEmail,
    subject: `Booking Cancelled — ${formatDate(slotDate)} at ${formatTime(slotTime)}`,
    html: baseTemplate(content),
  })
}
