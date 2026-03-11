// src/app/api/reschedule/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST — consultant initiates reschedule, AI suggests slots
export async function POST(request: NextRequest) {
  try {
    const { bookingId, reason } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('consultant_id', user.id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, working_hours_start, working_hours_end, slot_duration_minutes, working_days')
      .eq('id', user.id)
      .single()

    // Get existing bookings to avoid conflicts
    const originalDate = new Date(booking.slot_date)
    const startWindow = new Date(originalDate)
    startWindow.setDate(startWindow.getDate() + 1)
    const endWindow = new Date(originalDate)
    endWindow.setDate(endWindow.getDate() + 8)

    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('slot_date, slot_time')
      .eq('consultant_id', user.id)
      .neq('status', 'cancelled')
      .gte('slot_date', startWindow.toISOString().split('T')[0])
      .lte('slot_date', endWindow.toISOString().split('T')[0])

    // Generate available slots using AI
    const workDays = profile?.working_days || [1, 2, 3, 4, 5]
    const startHour = parseInt((profile?.working_hours_start || '09:00').split(':')[0])
    const endHour = parseInt((profile?.working_hours_end || '18:00').split(':')[0])
    const duration = profile?.slot_duration_minutes || 30

    const bookedSlots = new Set(
      (existingBookings || []).map(b => `${b.slot_date}T${b.slot_time}`)
    )

    const suggested: { date: string; time: string; label: string }[] = []
    const current = new Date(startWindow)

    while (current <= endWindow && suggested.length < 5) {
      if (workDays.includes(current.getDay())) {
        for (let hour = startHour; hour < endHour; hour++) {
          for (let min = 0; min < 60; min += duration) {
            const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`
            const dateStr = current.toISOString().split('T')[0]
            const key = `${dateStr}T${timeStr}`

            if (!bookedSlots.has(key) && suggested.length < 5) {
              const d = new Date(current)
              d.setHours(hour, min)
              const h = hour % 12 || 12
              const ampm = hour >= 12 ? 'PM' : 'AM'
              const timeLabel = `${h}:${String(min).padStart(2, '0')} ${ampm}`
              const dateLabel = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
              suggested.push({ date: dateStr, time: timeStr, label: `${dateLabel} at ${timeLabel}` })
            }
          }
        }
      }
      current.setDate(current.getDate() + 1)
    }

    // Save reschedule request
    const { data: rr, error } = await supabase
      .from('reschedule_requests')
      .insert({
        booking_id: bookingId,
        requested_by: 'consultant',
        reason,
        suggested_slots: suggested,
        client_email: booking.client_email,
        client_name: booking.client_name,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error

    // Send email to client with reschedule link
    const rescheduleUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reschedule/${rr.id}`
    await sendRescheduleEmail({
      clientEmail: booking.client_email,
      clientName: booking.client_name,
      consultantName: profile?.full_name || 'Your consultant',
      originalDate: booking.slot_date,
      originalTime: booking.slot_time,
      reason,
      suggestedSlots: suggested,
      rescheduleUrl,
    })

    return NextResponse.json({ success: true, requestId: rr.id, suggestedSlots: suggested })
  } catch (e: any) {
    console.error('[reschedule]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH — client accepts a suggested slot
export async function PATCH(request: NextRequest) {
  try {
    const { requestId, acceptedSlot } = await request.json()

    const supabase = await createClient()

    const { data: rr } = await supabase
      .from('reschedule_requests')
      .select('*, bookings(*)')
      .eq('id', requestId)
      .single()

    if (!rr) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (rr.status !== 'pending') return NextResponse.json({ error: 'Request already resolved' }, { status: 400 })

    // Update booking with new slot
    await supabase
      .from('bookings')
      .update({ slot_date: acceptedSlot.date, slot_time: acceptedSlot.time })
      .eq('id', rr.booking_id)

    // Mark request as accepted
    await supabase
      .from('reschedule_requests')
      .update({ status: 'accepted', accepted_slot: acceptedSlot })
      .eq('id', requestId)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — get reschedule requests for consultant
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('reschedule_requests')
    .select('*, bookings!inner(consultant_id, client_name, slot_date, slot_time)')
    .eq('bookings.consultant_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ requests: data || [] })
}

async function sendRescheduleEmail(params: {
  clientEmail: string
  clientName: string
  consultantName: string
  originalDate: string
  originalTime: string
  reason?: string
  suggestedSlots: { date: string; time: string; label: string }[]
  rescheduleUrl: string
}) {
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  if (!resendKey) return

  const slotsHtml = params.suggestedSlots
    .map(s => `<a href="${params.rescheduleUrl}?slot=${encodeURIComponent(JSON.stringify(s))}"
      style="display:block;padding:12px 16px;margin:8px 0;background:#f0f4ff;border:1px solid #c7d7f9;border-radius:8px;text-decoration:none;color:#1a1a2e;font-weight:500;">
      📅 ${s.label}
    </a>`)
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;">
      <div style="background:#1a1a2e;padding:28px 32px;border-radius:12px 12px 0 0;">
        <h1 style="color:#e8a838;margin:0;font-size:22px;">Reschedule Request</h1>
        <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:14px;">from ${params.consultantName}</p>
      </div>
      <div style="padding:28px 32px;">
        <p>Hi <strong>${params.clientName}</strong>,</p>
        <p>${params.consultantName} needs to reschedule your meeting originally on <strong>${params.originalDate} at ${params.originalTime.slice(0,5)}</strong>.</p>
        ${params.reason ? `<p style="background:#fef9ec;padding:12px;border-radius:8px;border-left:3px solid #e8a838;"><strong>Reason:</strong> ${params.reason}</p>` : ''}
        <p><strong>Please pick a new time:</strong></p>
        ${slotsHtml}
        <p style="margin-top:20px;font-size:13px;color:#6b7280;">Or <a href="${params.rescheduleUrl}">view all options here</a></p>
      </div>
    </div>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `Zlotra <${fromEmail}>`,
      to: [params.clientEmail],
      subject: `Reschedule needed — ${params.consultantName}`,
      html,
    }),
  })
}
