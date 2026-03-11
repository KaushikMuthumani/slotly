'use client'
// src/components/BookingForm.tsx
// Updated with: intake questions, dynamic pricing display
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BookingFormProps {
  consultant: {
    id: string
    full_name: string
    slug: string
    amount_inr: number
    slot_duration_minutes: number
    profession?: string
    currency?: string
  }
  selectedDate: string
  selectedTime: string
  intakeQuestions?: Array<{
    id: string
    question: string
    question_type: string
    options?: string[]
    is_required: boolean
  }>
  slotPrice?: number // dynamic price for this specific slot
  onBack: () => void
}

export default function BookingForm({ consultant, selectedDate, selectedTime, intakeQuestions = [], slotPrice, onBack }: BookingFormProps) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const displayPrice = slotPrice ?? consultant.amount_inr
  const priceChanged = slotPrice != null && slotPrice !== consultant.amount_inr

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fmtTime = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required intake questions
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
          consultantId: consultant.id,
          clientName: form.name.trim(),
          clientEmail: form.email.trim(),
          clientPhone: form.phone.trim(),
          slotDate: selectedDate,
          slotTime: selectedTime,
          durationMinutes: consultant.slot_duration_minutes,
          amountInr: displayPrice,
          notes: form.notes.trim(),
          intakeAnswers: Object.keys(intakeAnswers).length > 0 ? intakeAnswers : null,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      router.push(`/book/confirmed?consultant=${encodeURIComponent(consultant.full_name)}&date=${encodeURIComponent(fmtDate(selectedDate))}&time=${encodeURIComponent(fmtTime(selectedTime))}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Booking summary */}
      <div className="card" style={{ marginBottom: 24, background: 'var(--color-bg-muted)', border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>📅 {fmtDate(selectedDate)}</p>
            <p style={{ color: 'var(--color-text-secondary)' }}>🕐 {fmtTime(selectedTime)} · {consultant.slot_duration_minutes} min with {consultant.full_name}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-primary)' }}>
              ₹{Number(displayPrice).toLocaleString('en-IN')}
            </p>
            {priceChanged && (
              <p style={{ fontSize: '0.75rem', color: '#d97706' }}>
                ⚡ Dynamic price (base ₹{consultant.amount_inr})
              </p>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><span>⚠️</span> {error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Personal info */}
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

        {/* Intake Questions */}
        {intakeQuestions.length > 0 && (
          <div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20, marginTop: 4 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>📋 A few questions before we book</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                {consultant.full_name} wants to understand your needs better.
              </p>
            </div>
            {intakeQuestions.map(q => (
              <div key={q.id} className="form-group" style={{ marginBottom: 16 }}>
                <label>
                  {q.question}
                  {q.is_required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                </label>
                {q.question_type === 'select' && q.options ? (
                  <select
                    value={intakeAnswers[q.question] || ''}
                    onChange={e => setIntakeAnswers(prev => ({ ...prev, [q.question]: e.target.value }))}
                    required={q.is_required}
                  >
                    <option value="">Select an option</option>
                    {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : q.question_type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={intakeAnswers[q.question] || ''}
                    onChange={e => setIntakeAnswers(prev => ({ ...prev, [q.question]: e.target.value }))}
                    placeholder="Your answer..."
                    required={q.is_required}
                    style={{ resize: 'vertical' }}
                  />
                ) : (
                  <input
                    value={intakeAnswers[q.question] || ''}
                    onChange={e => setIntakeAnswers(prev => ({ ...prev, [q.question]: e.target.value }))}
                    placeholder="Your answer..."
                    required={q.is_required}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="form-group">
          <label>Additional Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Anything else?" style={{ resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button type="button" onClick={onBack} className="btn" style={{ flex: 1 }}>← Back</button>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 2 }}>
            {loading ? <><div className="spinner" /> Booking...</> : `Confirm Booking · ₹${Number(displayPrice).toLocaleString('en-IN')}`}
          </button>
        </div>
      </form>
    </div>
  )
}
