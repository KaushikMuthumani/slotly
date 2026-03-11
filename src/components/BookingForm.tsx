'use client'
// src/components/BookingForm.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface IntakeQuestion {
  id: string
  question: string
  question_type: string
  options?: string[]
  is_required: boolean
}

interface BookingFormProps {
  profile: any
  availability: any[]
  blockedDates: any[]
  partialBlocks: { date: any; start: any; end: any }[]
  bookedSlots: string[]
  blockedTimes: any[]
  intakeQuestions?: IntakeQuestion[]
  pricingRules?: any[]
}

function generateSlots(
  profile: any,
  availability: any[],
  blockedDates: string[],
  partialBlocks: { date: string; start: string; end: string }[],
  bookedSlots: string[],
  blockedTimes: any[],
  dateStr: string
): string[] {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  const avail = availability.find((a: any) => a.day_of_week === dayOfWeek)
  if (!avail) return []
  if (blockedDates.includes(dateStr)) return []

  const startHour = parseInt((avail.start_time || '09:00').split(':')[0])
  const startMin = parseInt((avail.start_time || '09:00').split(':')[1] || '0')
  const endHour = parseInt((avail.end_time || '18:00').split(':')[0])
  const duration = profile.session_duration || profile.slot_duration_minutes || 30

  const slots: string[] = []
  let h = startHour
  let m = startMin

  while (h < endHour) {
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const slotKey = `${dateStr}_${timeStr}`

    const isBooked = bookedSlots.includes(slotKey)
    const isPartialBlocked = partialBlocks.some(b =>
      b.date === dateStr && timeStr >= b.start && timeStr < b.end
    )
    const isRecurringBlocked = blockedTimes.some((bt: any) => {
      if (!bt.applies_to_days?.includes(dayOfWeek)) return false
      const s = (bt.start_time || '').slice(0, 5)
      const e = (bt.end_time || '').slice(0, 5)
      return timeStr >= s && timeStr < e
    })

    if (!isBooked && !isPartialBlocked && !isRecurringBlocked) {
      slots.push(timeStr)
    }

    m += duration
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60 }
  }

  return slots
}

function getAvailableDates(availability: any[], blockedDates: string[], daysAhead = 60): string[] {
  const dates: string[] = []
  const availDays = new Set(availability.map((a: any) => a.day_of_week))
  const today = new Date()
  for (let i = 1; i <= daysAhead; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    if (availDays.has(d.getDay()) && !blockedDates.includes(dateStr)) {
      dates.push(dateStr)
    }
  }
  return dates
}

function calcDynamicPrice(basePrice: number, dateStr: string, timeStr: string, rules: any[]): number {
  if (!rules || rules.length === 0) return basePrice
  const dt = new Date(`${dateStr}T${timeStr}`)
  const hour = dt.getHours()
  const day = dt.getDay()
  const hoursUntil = (dt.getTime() - Date.now()) / (1000 * 60 * 60)
  let price = basePrice
  const active = [...rules].filter(r => r.is_active).sort((a, b) => b.priority - a.priority)
  for (const rule of active) {
    let applies = false
    if (rule.rule_type === 'time_based') applies = hour >= rule.start_hour && hour < rule.end_hour
    else if (rule.rule_type === 'day_based') applies = rule.applies_to_days?.includes(day)
    else if (rule.rule_type === 'last_minute') applies = hoursUntil <= rule.last_minute_hours && hoursUntil > 0
    else if (rule.rule_type === 'base') applies = true
    if (applies) {
      if (rule.price_type === 'fixed') price = rule.price_value
      else if (rule.price_type === 'multiplier') price = price * rule.price_value
      else if (rule.price_type === 'add') price = price + rule.price_value
    }
  }
  return Math.round(price)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function fmtINR(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function BookingForm({
  profile,
  availability,
  blockedDates,
  partialBlocks,
  bookedSlots,
  blockedTimes,
  intakeQuestions = [],
  pricingRules = [],
}: BookingFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<'date' | 'time' | 'form'>('date')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const availableDates = getAvailableDates(availability, blockedDates)
  const basePrice = profile.fee_inr || profile.amount_inr || 0
  const dynamicPrice = selectedDate && selectedTime
    ? calcDynamicPrice(basePrice, selectedDate, selectedTime, pricingRules)
    : basePrice
  const priceChanged = dynamicPrice !== basePrice
  const slotsForDate = selectedDate
    ? generateSlots(profile, availability, blockedDates, partialBlocks, bookedSlots, blockedTimes, selectedDate)
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    for (const q of intakeQuestions) {
      if (q.is_required && !intakeAnswers[q.question]?.trim()) {
        setError(`Please answer: "${q.question}"`)
        return
      }
    }
    setLoading(true)
    try {
      const res = await fetch('/api/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId: profile.id,
          clientName: form.name.trim(),
          clientEmail: form.email.trim(),
          clientPhone: form.phone.trim(),
          slotDate: selectedDate,
          slotTime: selectedTime + ':00',
          durationMinutes: profile.session_duration || profile.slot_duration_minutes || 30,
          amountInr: dynamicPrice,
          notes: form.notes.trim(),
          intakeAnswers: Object.keys(intakeAnswers).length > 0 ? intakeAnswers : null,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      router.push(
        `/book/confirmed?consultant=${encodeURIComponent(profile.full_name)}&date=${encodeURIComponent(fmtDate(selectedDate))}&time=${encodeURIComponent(fmtTime(selectedTime))}`
      )
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── STEP 1: Date ──────────────────────────────────────────────────────────
  if (step === 'date') {
    const byMonth: Record<string, string[]> = {}
    for (const d of availableDates) {
      const key = d.slice(0, 7)
      if (!byMonth[key]) byMonth[key] = []
      byMonth[key].push(d)
    }
    return (
      <div>
        <h3 style={{ marginBottom: 4, fontSize: '1.25rem' }}>Select a Date</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>Choose from available slots below</p>
        {availableDates.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
            <p>No available dates. Please check back later.</p>
          </div>
        ) : (
          Object.entries(byMonth).map(([monthKey, dates]) => {
            const [yr, mo] = monthKey.split('-')
            return (
              <div key={monthKey} style={{ marginBottom: 24 }}>
                <p style={{ fontWeight: 600, marginBottom: 12, color: 'var(--color-text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {MONTHS[parseInt(mo) - 1]} {yr}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
                  {dates.map(d => {
                    const dt = new Date(d)
                    return (
                      <button key={d} onClick={() => { setSelectedDate(d); setStep('time') }}
                        style={{ padding: '12px 8px', borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                          {dt.toLocaleDateString('en-IN', { weekday: 'short' })}
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>
                          {dt.getDate()}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  // ── STEP 2: Time ──────────────────────────────────────────────────────────
  if (step === 'time') {
    return (
      <div>
        <button onClick={() => setStep('date')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', marginBottom: 16, fontSize: '0.9rem', padding: 0 }}>
          ← Back to dates
        </button>
        <h3 style={{ marginBottom: 4, fontSize: '1.25rem' }}>Select a Time</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>{fmtDate(selectedDate)}</p>
        {slotsForDate.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
            <p>No slots available on this date.</p>
            <button onClick={() => setStep('date')} className="btn" style={{ marginTop: 16 }}>Pick another date</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {slotsForDate.map(t => {
              const price = pricingRules.length > 0 ? calcDynamicPrice(basePrice, selectedDate, t, pricingRules) : basePrice
              const isHigher = price > basePrice
              const isLower = price < basePrice
              return (
                <button key={t} onClick={() => { setSelectedTime(t); setStep('form') }}
                  style={{ padding: '12px 8px', borderRadius: 10, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{fmtTime(t)}</div>
                  {pricingRules.length > 0 && (
                    <div style={{ fontSize: '0.7rem', marginTop: 3, fontWeight: 500, color: isHigher ? '#d97706' : isLower ? '#16a34a' : 'var(--color-text-muted)' }}>
                      {fmtINR(price)}{isHigher ? ' ⚡' : isLower ? ' 🏷' : ''}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── STEP 3: Form ──────────────────────────────────────────────────────────
  return (
    <div>
      <div className="card" style={{ marginBottom: 24, background: 'var(--color-bg-muted)', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>📅 {fmtDate(selectedDate)}</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              🕐 {fmtTime(selectedTime)} · {profile.session_duration || profile.slot_duration_minutes || 30} min with {profile.full_name}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-primary)' }}>{fmtINR(dynamicPrice)}</p>
            {priceChanged && (
              <p style={{ fontSize: '0.75rem', color: '#d97706' }}>⚡ Dynamic price (base {fmtINR(basePrice)})</p>
            )}
          </div>
        </div>
        <button onClick={() => setStep('time')} style={{ marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.8125rem', padding: 0 }}>
          ← Change time
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><span>⚠️</span> {error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="form-group">
          <label>Full Name *</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" required />
        </div>
        <div className="form-group">
          <label>Email Address *</label>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" required />
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
        </div>

        {intakeQuestions.length > 0 && (
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>📋 A few questions before we book</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
              {profile.full_name} wants to understand your needs better.
            </p>
            {intakeQuestions.map(q => (
              <div key={q.id} className="form-group" style={{ marginBottom: 16 }}>
                <label>
                  {q.question}
                  {q.is_required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                </label>
                {q.question_type === 'select' && q.options ? (
                  <select value={intakeAnswers[q.question] || ''} onChange={e => setIntakeAnswers(p => ({ ...p, [q.question]: e.target.value }))} required={q.is_required}>
                    <option value="">Select an option</option>
                    {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : q.question_type === 'textarea' ? (
                  <textarea rows={3} value={intakeAnswers[q.question] || ''} onChange={e => setIntakeAnswers(p => ({ ...p, [q.question]: e.target.value }))} placeholder="Your answer..." required={q.is_required} style={{ resize: 'vertical' }} />
                ) : (
                  <input value={intakeAnswers[q.question] || ''} onChange={e => setIntakeAnswers(p => ({ ...p, [q.question]: e.target.value }))} placeholder="Your answer..." required={q.is_required} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="form-group">
          <label>Additional Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Anything else?" style={{ resize: 'vertical' }} />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-lg">
          {loading ? <><div className="spinner" /> Booking...</> : `Confirm Booking · ${fmtINR(dynamicPrice)}`}
        </button>
      </form>
    </div>
  )
}
