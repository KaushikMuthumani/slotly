// src/app/api/send-reminders/route.ts
// Called by Vercel Cron every hour
// Set up in vercel.json as a cron job

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendReminderEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()

  // Find bookings that need 24hr reminder
  const in24hrs = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in24Date = in24hrs.toISOString().split('T')[0]
  const in24Time = in24hrs.toTimeString().slice(0, 5)

  // Find bookings that need 1hr reminder
  const in1hr = new Date(now.getTime() + 60 * 60 * 1000)
  const in1Date = in1hr.toISOString().split('T')[0]
  const in1Time = in1hr.toTimeString().slice(0, 5)

  const { data: bookings24 } = await supabase
    .from('bookings')
    .select('*, profiles!consultant_id(full_name, email)')
    .eq('status', 'confirmed')
    .eq('slot_date', in24Date)
    .gte('slot_time', in24Time + ':00')
    .lt('slot_time', in24hrs.toTimeString().slice(0, 5) + ':59')

  const { data: bookings1 } = await supabase
    .from('bookings')
    .select('*, profiles!consultant_id(full_name, email)')
    .eq('status', 'confirmed')
    .eq('slot_date', in1Date)
    .gte('slot_time', in1Time + ':00')
    .lt('slot_time', in1hr.toTimeString().slice(0, 5) + ':59')

  let sent = 0

  for (const booking of (bookings24 || [])) {
    const profile = booking.profiles as any
    await Promise.allSettled([
      sendReminderEmail({ recipientEmail: booking.client_email, recipientName: booking.client_name, otherPartyName: profile?.full_name, slotDate: booking.slot_date, slotTime: booking.slot_time, duration: booking.duration_minutes, isConsultant: false, hoursBeforeAppointment: 24 }),
      sendReminderEmail({ recipientEmail: profile?.email, recipientName: profile?.full_name, otherPartyName: booking.client_name, slotDate: booking.slot_date, slotTime: booking.slot_time, duration: booking.duration_minutes, isConsultant: true, hoursBeforeAppointment: 24 }),
    ])
    sent += 2
  }

  for (const booking of (bookings1 || [])) {
    const profile = booking.profiles as any
    await Promise.allSettled([
      sendReminderEmail({ recipientEmail: booking.client_email, recipientName: booking.client_name, otherPartyName: profile?.full_name, slotDate: booking.slot_date, slotTime: booking.slot_time, duration: booking.duration_minutes, isConsultant: false, hoursBeforeAppointment: 1 }),
      sendReminderEmail({ recipientEmail: profile?.email, recipientName: profile?.full_name, otherPartyName: booking.client_name, slotDate: booking.slot_date, slotTime: booking.slot_time, duration: booking.duration_minutes, isConsultant: true, hoursBeforeAppointment: 1 }),
    ])
    sent += 2
  }

  return NextResponse.json({ success: true, remindersSent: sent })
}
