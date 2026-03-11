// src/app/api/telegram-webhook/route.ts
// Telegram booking bot — zero cost, zero approval, works instantly
import { createClient as adminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const admin = () => adminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function sendMessage(chatId: number, text: string, keyboard?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  }
  if (keyboard) {
    body.reply_markup = { inline_keyboard: keyboard }
  }
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function answerCallback(callbackQueryId: string) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId }),
  })
}

function getNextWorkingDays(count: number) {
  const days = []
  const current = new Date()
  current.setDate(current.getDate() + 1)
  while (days.length < count) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6) {
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
  const db = admin()
  const { data: profile } = await db.from('profiles').select('working_hours_start, working_hours_end').eq('id', consultantId).single()
  const startHour = parseInt((profile?.working_hours_start || '09:00').split(':')[0])
  const endHour = parseInt((profile?.working_hours_end || '18:00').split(':')[0])

  const { data: booked } = await db.from('bookings').select('slot_time').eq('consultant_id', consultantId).eq('slot_date', date).neq('status', 'cancelled')
  const bookedTimes = new Set((booked || []).map((b: any) => b.slot_time?.slice(0, 5)))

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
  return slots.slice(0, 8)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = admin()

    // Handle callback queries (button presses)
    if (body.callback_query) {
      const cq = body.callback_query
      const chatId = cq.message.chat.id
      const data = cq.data as string
      await answerCallback(cq.id)

      // Get session
      let { data: session } = await db.from('whatsapp_sessions').select('*').eq('phone', String(chatId)).single()

      if (!session) {
        await sendMessage(chatId, "Session expired. Type /start to begin again.")
        return NextResponse.json({ ok: true })
      }

      const sessionData = session.session_data || {}

      if (data.startsWith('date:')) {
        const dateValue = data.replace('date:', '')
        const dates = sessionData.availableDates || []
        const selectedDate = dates.find((d: any) => d.value === dateValue)
        if (!selectedDate) { await sendMessage(chatId, "Invalid date. Type /start to restart."); return NextResponse.json({ ok: true }) }

        const slots = await getAvailableSlots(sessionData.consultantId, dateValue, sessionData.duration || 30)
        if (slots.length === 0) {
          await sendMessage(chatId, `No slots available on *${selectedDate.label}*. Pick another date:`)
          return NextResponse.json({ ok: true })
        }

        await db.from('whatsapp_sessions').update({ step: 'ask_slot', session_data: { ...sessionData, selectedDate } }).eq('phone', String(chatId))

        const keyboard = slots.map(s => [{ text: s.label, callback_data: `slot:${s.value}` }])
        await sendMessage(chatId, `🕐 Available slots on *${selectedDate.label}*:`, keyboard)
      }

      else if (data.startsWith('slot:')) {
        const slotValue = data.replace('slot:', '')
        const slots = await getAvailableSlots(sessionData.consultantId, sessionData.selectedDate?.value, sessionData.duration || 30)
        const selectedSlot = slots.find(s => s.value === slotValue)
        if (!selectedSlot) { await sendMessage(chatId, "Slot unavailable. Type /start to restart."); return NextResponse.json({ ok: true }) }

        await db.from('whatsapp_sessions').update({ step: 'confirm', session_data: { ...sessionData, selectedSlot } }).eq('phone', String(chatId))

        const summary = `✅ *Booking Summary*\n\n👤 *Name:* ${sessionData.clientName}\n📧 *Email:* ${sessionData.clientEmail}\n📅 *Date:* ${sessionData.selectedDate.label}\n🕐 *Time:* ${selectedSlot.label}\n💰 *Fee:* ₹${sessionData.fee}\n⏱ *Duration:* ${sessionData.duration} min\n\nConfirm booking?`
        const keyboard = [[
          { text: '✅ Confirm', callback_data: 'confirm:yes' },
          { text: '❌ Cancel', callback_data: 'confirm:no' },
        ]]
        await sendMessage(chatId, summary, keyboard)
      }

      else if (data === 'confirm:yes') {
        const { data: booking, error } = await db.from('bookings').insert({
          consultant_id: sessionData.consultantId,
          client_name: sessionData.clientName,
          client_email: sessionData.clientEmail,
          slot_date: sessionData.selectedDate.value,
          slot_time: sessionData.selectedSlot.value,
          duration_minutes: sessionData.duration || 30,
          amount_inr: sessionData.fee || 0,
          status: 'confirmed',
          payment_status: 'pending',
          notes: 'Booked via Telegram',
        }).select().single()

        if (error || !booking) {
          await sendMessage(chatId, `❌ Booking failed. Please try again or visit the website directly.`)
        } else {
          await sendMessage(chatId,
            `🎉 *Booking Confirmed!*\n\n📅 ${sessionData.selectedDate.label}\n🕐 ${sessionData.selectedSlot.label}\n👤 With: *${sessionData.consultantName}*\n\nA confirmation email has been sent to ${sessionData.clientEmail}.\n\nThank you! 🙏`
          )
        }
        await db.from('whatsapp_sessions').update({ step: 'start', session_data: {}, consultant_slug: null }).eq('phone', String(chatId))
      }

      else if (data === 'confirm:no') {
        await db.from('whatsapp_sessions').update({ step: 'start', session_data: {}, consultant_slug: null }).eq('phone', String(chatId))
        await sendMessage(chatId, "Booking cancelled. Type /start to begin again anytime 👋")
      }

      return NextResponse.json({ ok: true })
    }

    // Handle text messages
    const message = body.message
    if (!message || !message.text) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const text = message.text.trim()
    const userName = message.from?.first_name || 'there'

    // Get or create session
    let { data: session } = await db.from('whatsapp_sessions').select('*').eq('phone', String(chatId)).single()

    if (!session) {
      await db.from('whatsapp_sessions').insert({ phone: String(chatId), step: 'start', session_data: {} })
      session = { phone: String(chatId), step: 'start', session_data: {} }
    }

    const step = session.step || 'start'
    const sessionData = session.session_data || {}

    // ── /start or /book ──────────────────────────────────

    if (text === '/start' || text === '/help') {
      await db.from('whatsapp_sessions').update({ step: 'start', session_data: {} }).eq('phone', String(chatId))
      await sendMessage(chatId,
        `👋 Hi *${userName}*! Welcome to *Zlotra*.\n\nI can help you book consultations.\n\nUse: \`/book [consultant-username]\`\n\nExample: \`/book kaushik\`\n\nOr ask your consultant to share their booking link.`
      )
    }

    else if (text.startsWith('/book')) {
      const parts = text.split(' ')
      const slug = parts[1]?.toLowerCase()

      if (!slug) {
        await sendMessage(chatId, `Please provide a consultant username.\n\nExample: \`/book kaushik\``)
        return NextResponse.json({ ok: true })
      }

      const { data: profile } = await db.from('profiles').select('id, full_name, slug, profession, amount_inr, slot_duration_minutes').eq('slug', slug).single()

      if (!profile) {
        await sendMessage(chatId, `❌ Consultant *${slug}* not found. Please check the username and try again.`)
        return NextResponse.json({ ok: true })
      }

      await db.from('whatsapp_sessions').update({
        step: 'ask_name',
        consultant_slug: profile.slug,
        session_data: {
          consultantId: profile.id,
          consultantName: profile.full_name,
          consultantSlug: profile.slug,
          fee: profile.amount_inr,
          duration: profile.slot_duration_minutes,
        }
      }).eq('phone', String(chatId))

      await sendMessage(chatId,
        `👋 You're booking with *${profile.full_name}* (${profile.profession || 'Consultant'})\n\n💰 Fee: ₹${profile.amount_inr}\n⏱ Duration: ${profile.slot_duration_minutes} minutes\n\nPlease enter your *full name*:`
      )
    }

    // ── Conversation flow ─────────────────────────────────

    else if (step === 'ask_name') {
      const name = text.replace(/\b\w/g, (l: string) => l.toUpperCase())
      await db.from('whatsapp_sessions').update({ step: 'ask_email', session_data: { ...sessionData, clientName: name } }).eq('phone', String(chatId))
      await sendMessage(chatId, `Nice to meet you, *${name}*! 📧\n\nPlease enter your *email address*:`)
    }

    else if (step === 'ask_email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(text)) {
        await sendMessage(chatId, `That doesn't look like a valid email. Please try again:`)
        return NextResponse.json({ ok: true })
      }

      const dates = getNextWorkingDays(5)
      await db.from('whatsapp_sessions').update({
        step: 'ask_date',
        session_data: { ...sessionData, clientEmail: text.toLowerCase(), availableDates: dates }
      }).eq('phone', String(chatId))

      const keyboard = dates.map(d => [{ text: `📅 ${d.label}`, callback_data: `date:${d.value}` }])
      await sendMessage(chatId, `📅 Choose a date for your consultation:`, keyboard)
    }

    else if (step === 'ask_slot') {
      await sendMessage(chatId, `Please tap one of the time slots above 👆`)
    }

    else if (step === 'confirm') {
      await sendMessage(chatId, `Please tap *Confirm* or *Cancel* above 👆`)
    }

    else {
      await sendMessage(chatId, `Type /start to book a consultation, or /book [username] to book with a specific consultant.`)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[telegram-webhook]', e.message)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}
