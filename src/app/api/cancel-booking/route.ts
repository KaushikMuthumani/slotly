import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function formatTime(t: string) {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

async function sendCancelEmail(to: string, name: string, otherName: string, date: string, time: string, reason?: string) {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  if (!resendKey) { console.error('[cancel] No RESEND_API_KEY'); return }

  const reasonBlock = reason
    ? `<div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0;font-size:14px;color:#dc2626;"><strong>Reason:</strong> ${reason}</p>
       </div>`
    : ''

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#dc2626;padding:28px 32px;">
        <h1 style="color:white;margin:0;font-size:22px;">Booking Cancelled</h1>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">We're sorry to inform you</p>
      </div>
      <div style="padding:28px 32px;">
        <p style="font-size:15px;color:#374151;">Hi <strong>${name}</strong>,</p>
        <p style="font-size:15px;color:#374151;">Your booking with <strong>${otherName}</strong> has been cancelled.</p>
        ${reasonBlock}
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Cancelled Booking</p>
          <p style="margin:4px 0;font-size:15px;color:#111827;"><strong>📅 ${date}</strong></p>
          <p style="margin:4px 0;font-size:14px;color:#374151;">🕐 ${time}</p>
          <p style="margin:4px 0;font-size:14px;color:#374151;">👤 With: ${otherName}</p>
        </div>
        <p style="font-size:14px;color:#6b7280;">If you have any questions, please contact us directly.</p>
      </div>
      <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Slotly · Professional Booking Platform</p>
      </div>
    </div>
  `

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Slotly <${fromEmail}>`,
      to: [to],
      subject: `Booking Cancelled — ${date}`,
      html,
    }),
  })
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId, reason } = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: booking } = await supabase
      .from('bookings').select('*').eq('id', bookingId).eq('consultant_id', user.id).single()
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.status === 'cancelled') return NextResponse.json({ error: 'Already cancelled' }, { status: 400 })

    const { data: profile } = await supabase
      .from('profiles').select('full_name, email').eq('id', user.id).single()

    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)

    const date = formatDate(booking.slot_date)
    const time = formatTime(booking.slot_time)

    // Send to both — don't let one failure block the other
    try {
      await sendCancelEmail(booking.client_email, booking.client_name, profile?.full_name || 'Your Consultant', date, time, reason)
      console.log('[cancel] Client email sent to', booking.client_email)
    } catch (e: any) {
      console.error('[cancel] Client email failed:', e.message)
    }

    try {
      await sendCancelEmail(profile?.email || '', profile?.full_name || '', booking.client_name, date, time, reason)
      console.log('[cancel] Consultant email sent to', profile?.email)
    } catch (e: any) {
      console.error('[cancel] Consultant email failed:', e.message)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[cancel] Fatal:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}