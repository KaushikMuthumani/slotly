// src/app/api/whatsapp-webhook/route.ts
// WATI WhatsApp webhook — handles booking flow via WhatsApp
import { createClient as adminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const admin = () => adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Verify WATI webhook
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token === process.env.WATI_WEBHOOK_TOKEN) {
    return new NextResponse(token)
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// Handle incoming WhatsApp messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = admin()

    // WATI message format
    const phone = body.waId || body.from
    const messageText = (body.text?.body || body.text || '').trim().toLowerCase()
    const userName = body.senderName || body.pushName || 'there'

    if (!phone || !messageText) {
      return NextResponse.json({ status: 'ok' })
    }

    console.log(`[WhatsApp] From: ${phone}, Message: "${messageText}"`)

    // Get or create session
    let { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', phone)
      .single()

    if (!session) {
      const { data: newSession } = await supabase
        .from('whatsapp_sessions')
        .insert({ phone, step: 'start', session_data: {} })
        .select()
        .single()
      session = newSession
    }

    const step = session?.step || 'start'
    const sessionData = session?.session_data || {}

    let reply = ''
    let nextStep = step
    let updateData: any = {}

    // ── FLOW ──────────────────────────────────────────────

    if (messageText === 'hi' || messageText === 'hello' || messageText === 'book' || step === 'start') {
      // Find consultant by WhatsApp number
      const { data: consultant } = await supabase
        .from('profiles')
        .select('id, full_name, slug, profession, amount_inr, slot_duration_minutes')
        .eq('whatsapp_number', phone.replace(/\D/g, '').slice(-10))
        .eq('whatsapp_enabled', true)
        .single()

      // Check if message contains a consultant slug
      const slugMatch = messageText.match(/book\s+(\w+)/i)
      let profile = consultant

      if (!profile && slugMatch) {
        const { data: bySlug } = await supabase
          .from('profiles')
          .select('id, full_name, slug, profession, amount_inr, slot_duration_minutes')
          .eq('slug', slugMatch[1])
          .single()
        profile = bySlug
      }

      if (!profile) {
        // General welcome — ask for consultant slug
        reply = `👋 Welcome to *Zlotra*!\n\nTo book a consultation, reply with:\n*book [consultant-name]*\n\nExample: _book kaushik_`
        nextStep = 'start'
      } else {
        reply = `👋 Hi! I'm helping you book with *${profile.full_name}* (${profile.profession}).\n\n💰 Fee: ₹${profile.amount_inr}\n⏱ Duration: ${profile.slot_duration_minutes} minutes\n\nPlease share your *full name* to proceed:`
        nextStep = 'ask_name'
        updateData = { consultant_slug: profile.slug, session_data: { consultantId: profile.id, consultantName: profile.full_name, consultantSlug: profile.slug, fee: profile.amount_inr, duration: profile.slot_duration_minutes } }
      }
    }

    else if (step === 'ask_name') {
      updateData = { session_data: { ...sessionData, clientName: messageText.replace(/\b\w/g, (l: string) => l.toUpperCase()) } }
      reply = `Great, *${updateData.session_data.clientName}*! 📧 Please share your *email address*:`
      nextStep = 'ask_email'
    }

    else if (step === 'ask_email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(messageText)) {
        reply = `That doesn't look like a valid email. Please try again:`
        nextStep = 'ask_email'
      } else {
        updateData = { session_data: { ...sessionData, clientEmail: messageText } }
        // Fetch next 5 available dates
        const dates = getNextWorkingDays(5)
        const dateList = dates.map((d, i) => `${i + 1}. ${d.label}`).join('\n')
        reply = `📅 Choose a date:\n\n${dateList}\n\nReply with the *number* (e.g., 1)`
        nextStep = 'ask_date'
        updateData.session_data.availableDates = dates
      }
    }

    else if (step === 'ask_date') {
      const idx = parseInt(messageText) - 1
      const dates = sessionData.availableDates || []
      if (isNaN(idx) || idx < 0 || idx >= dates.length) {
        reply = `Please reply with a number between 1 and ${dates.length}`
        nextStep = 'ask_date'
      } else {
        const selectedDate = dates[idx]
        updateData = { session_data: { ...sessionData, selectedDate } }

        // Fetch available slots for that date
        const slots = await getAvailableSlots(sessionData.consultantId, selectedDate.value, sessionData.duration || 30)
        if (slots.length === 0) {
          reply = `No slots available on ${selectedDate.label}. Please pick another date:`
          const newDates = getNextWorkingDays(5)
          reply += '\n\n' + newDates.map((d, i) => `${i + 1}. ${d.label}`).join('\n')
          updateData.session_data.availableDates = newDates
          nextStep = 'ask_date'
        } else {
          const slotList = slots.slice(0, 8).map((s, i) => `${i + 1}. ${s.label}`).join('\n')
          reply = `🕐 Available slots on *${selectedDate.label}*:\n\n${slotList}\n\nReply with the *number*`
          updateData.session_data.availableSlots = slots.slice(0, 8)
          nextStep = 'ask_slot'
        }
      }
    }

    else if (step === 'ask_slot') {
      const idx = parseInt(messageText) - 1
      const slots = sessionData.availableSlots || []
      if (isNaN(idx) || idx < 0 || idx >= slots.length) {
        reply = `Please reply with a number between 1 and ${slots.length}`
        nextStep = 'ask_slot'
      } else {
        const selectedSlot = slots[idx]
        updateData = { session_data: { ...sessionData, selectedSlot } }
        reply = `✅ *Booking Summary*\n\n👤 Name: ${sessionData.clientName}\n📧 Email: ${sessionData.clientEmail}\n📅 Date: ${sessionData.selectedDate.label}\n🕐 Time: ${selectedSlot.label}\n💰 Fee: ₹${sessionData.fee}\n\nConfirm? Reply *YES* to book or *NO* to cancel`
        nextStep = 'confirm'
      }
    }

    else if (step === 'confirm') {
      if (messageText === 'yes' || messageText === 'y') {
        // Create booking
        const slotDate = sessionData.selectedDate.value
        const slotTime = sessionData.selectedSlot.value
        const { data: booking, error } = await supabase
          .from('bookings')
          .insert({
            consultant_id: sessionData.consultantId,
            client_name: sessionData.clientName,
            client_email: sessionData.clientEmail,
            slot_date: slotDate,
            slot_time: slotTime,
            duration_minutes: sessionData.duration || 30,
            amount_inr: sessionData.fee || 0,
            status: 'confirmed',
            payment_status: 'pending',
            notes: 'Booked via WhatsApp',
          })
          .select()
          .single()

        if (error || !booking) {
          reply = `❌ Sorry, something went wrong. Please try again or visit the website to book.`
        } else {
          reply = `🎉 *Booking Confirmed!*\n\n📅 ${sessionData.selectedDate.label}\n🕐 ${sessionData.selectedSlot.label}\n👤 With: ${sessionData.consultantName}\n\nYou'll receive a confirmation email at ${sessionData.clientEmail}.\n\nThank you! 🙏`
        }
        nextStep = 'start'
        updateData = { step: 'start', session_data: {}, consultant_slug: null }
      } else {
        reply = `Booking cancelled. Type *book* to start again anytime 👋`
        nextStep = 'start'
        updateData = { step: 'start', session_data: {}, consultant_slug: null }
      }
    }

    else {
      reply = `I didn't understand that. Type *book* to start booking a consultation 📅`
      nextStep = 'start'
    }

    // Update session
    await supabase
      .from('whatsapp_sessions')
      .update({ step: nextStep, updated_at: new Date().toISOString(), ...updateData })
      .eq('phone', phone)

    // Send reply via WATI
    await sendWatiMessage(phone, reply)

    return NextResponse.json({ status: 'ok' })
  } catch (e: any) {
    console.error('[whatsapp-webhook]', e.message)
    return NextResponse.json({ status: 'error', message: e.message })
  }
}

function getNextWorkingDays(count: number) {
  const days = []
  const current = new Date()
  current.setDate(current.getDate() + 1)

  while (days.length < count) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) { // skip weekends
      days.push({
        value: current.toISOString().split('T')[0],
        label: current.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      })
    }
    current.setDate(current.getDate() + 1)
  }
  return days
}

async function getAvailableSlots(consultantId: string, date: string, duration: number) {
  const supabase = admin()

  const { data: profile } = await supabase
    .from('profiles')
    .select('working_hours_start, working_hours_end')
    .eq('id', consultantId)
    .single()

  const startHour = parseInt((profile?.working_hours_start || '09:00').split(':')[0])
  const endHour = parseInt((profile?.working_hours_end || '18:00').split(':')[0])

  const { data: booked } = await supabase
    .from('bookings')
    .select('slot_time')
    .eq('consultant_id', consultantId)
    .eq('slot_date', date)
    .neq('status', 'cancelled')

  const bookedTimes = new Set((booked || []).map(b => b.slot_time?.slice(0, 5)))

  const slots = []
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += duration) {
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      if (!bookedTimes.has(timeStr)) {
        const label = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
        slots.push({ value: `${timeStr}:00`, label })
      }
    }
  }
  return slots
}

async function sendWatiMessage(phone: string, message: string) {
  const watiUrl = process.env.WATI_API_URL
  const watiToken = process.env.WATI_API_TOKEN

  if (!watiUrl || !watiToken) {
    console.log('[WATI] Missing config, would send:', message)
    return
  }

  await fetch(`${watiUrl}/api/v1/sendSessionMessage/${phone}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${watiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messageText: message }),
  })
}
