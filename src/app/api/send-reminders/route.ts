// src/app/api/send-reminders/route.ts
// Called by Vercel Cron once per day
// Sends 24hr and 1hr reminders based on IST timezone

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendReminderEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // IST = UTC + 5:30
  const nowUTC = new Date()
  const nowIST = new Date(nowUTC.getTime() + (5.5 * 60 * 60 * 1000))

  const in24IST = new Date(nowIST.getTime() + 24 * 60 * 60 * 1000)
  const in1IST = new Date(nowIST.getTime() + 1 * 60 * 60 * 1000)

  const toDateStr = (d: Date) => d.toISOString().split('T')[0]
  const toTimeStr = (d: Date) => d.toTimeString().slice(0, 5)

  const date24 = toDateStr(in24IST)
  const time24 = toTimeStr(in24IST)
  const date1 = toDateStr(in1IST)
  const time1 = toTimeStr(in1IST)

  // Fetch bookings within a 15-min window of the target time
  const timeWindowEnd24 = toTimeStr(new Date(in24IST.getTime() + 15 * 60 * 1000))
  const timeWindowEnd1 = toTimeStr(new Date(in1IST.getTime() + 15 * 60 * 1000))

  const [{ data: bookings24 }, { data: bookings1 }] = await Promise.all([
    supabase.from('bookings')
      .select('*, profiles!consultant_id(full_name, email)')
      .eq('status', 'confirmed')
      .eq('slot_date', date24)
      .gte('slot_time', time24 + ':00')
      .lte('slot_time', timeWindowEnd24 + ':59'),
    supabase.from('bookings')
      .select('*, profiles!consultant_id(full_name, email)')
      .eq('status', 'confirmed')
      .eq('slot_date', date1)
      .gte('slot_time', time1 + ':00')
      .lte('slot_time', timeWindowEnd1 + ':59'),
  ])

  let sent = 0

  for (const b of (bookings24 || [])) {
    const p = b.profiles as any
    await Promise.allSettled([
      sendReminderEmail({ recipientEmail: b.client_email, recipientName: b.client_name, otherPartyName: p?.full_name, slotDate: b.slot_date, slotTime: b.slot_time, duration: b.duration_minutes, isConsultant: false, hoursBeforeAppointment: 24 }),
      sendReminderEmail({ recipientEmail: p?.email, recipientName: p?.full_name, otherPartyName: b.client_name, slotDate: b.slot_date, slotTime: b.slot_time, duration: b.duration_minutes, isConsultant: true, hoursBeforeAppointment: 24 }),
    ])
    sent += 2
  }

  for (const b of (bookings1 || [])) {
    const p = b.profiles as any
    await Promise.allSettled([
      sendReminderEmail({ recipientEmail: b.client_email, recipientName: b.client_name, otherPartyName: p?.full_name, slotDate: b.slot_date, slotTime: b.slot_time, duration: b.duration_minutes, isConsultant: false, hoursBeforeAppointment: 1 }),
      sendReminderEmail({ recipientEmail: p?.email, recipientName: p?.full_name, otherPartyName: b.client_name, slotDate: b.slot_date, slotTime: b.slot_time, duration: b.duration_minutes, isConsultant: true, hoursBeforeAppointment: 1 }),
    ])
    sent += 2
  }

  return NextResponse.json({ success: true, remindersSent: sent, checkedAt: nowIST.toISOString() })
}
