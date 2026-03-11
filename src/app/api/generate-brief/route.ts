// src/app/api/generate-brief/route.ts
// Generates an AI meeting brief using Claude API
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch booking with answers
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('consultant_id', user.id)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (!booking.intake_answers) return NextResponse.json({ error: 'No intake answers found' }, { status: 400 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, profession')
      .eq('id', user.id)
      .single()

    // Get client score
    const { data: clientScore } = await supabase
      .from('client_scores')
      .select('*')
      .eq('client_email', booking.client_email)
      .single()

    // Format slot date/time
    const slotDate = new Date(booking.slot_date).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
    const [h, m] = (booking.slot_time || '').slice(0, 5).split(':').map(Number)
    const slotTime = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`

    // Build answers summary
    const answersText = Object.entries(booking.intake_answers as Record<string, string>)
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n\n')

    const prompt = `You are an expert meeting preparation assistant for ${profile?.profession || 'consultants'} in India.

Generate a concise, actionable meeting brief for the following consultation:

CONSULTANT: ${profile?.full_name} (${profile?.profession || 'Consultant'})
CLIENT: ${booking.client_name} (${booking.client_email})
DATE & TIME: ${slotDate} at ${slotTime}
DURATION: ${booking.duration_minutes} minutes
CLIENT RELIABILITY SCORE: ${clientScore?.reliability_score ?? 'New client'}/100 (${clientScore?.total_bookings ?? 0} past bookings)

CLIENT'S INTAKE RESPONSES:
${answersText}

Generate a structured brief with these sections:
1. **Meeting Overview** (2-3 sentences summarizing the purpose)
2. **Key Topics to Cover** (3-5 bullet points)
3. **Suggested Questions to Ask** (3-4 smart questions based on their answers)
4. **Watch Out For** (any red flags or important context to note)
5. **Preparation Checklist** (2-3 things to have ready)

Keep it practical and under 300 words. Format with clear section headers.`

    // Call Claude API
    const claudeRes = await fetch('https://api.x.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GROK_API_KEY || ''}`,
  },
  body: JSON.stringify({
    model: 'grok-3-mini',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  }),
})

if (!claudeRes.ok) {
  const err = await claudeRes.text()
  throw new Error(`Grok API error: ${err}`)
}

const claudeData = await claudeRes.json()
const brief = claudeData.choices?.[0]?.message?.content || ''

    // Save to booking
    await supabase
      .from('bookings')
      .update({ ai_brief: brief, brief_generated_at: new Date().toISOString() })
      .eq('id', bookingId)

    return NextResponse.json({ brief })
  } catch (e: any) {
    console.error('[generate-brief]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
