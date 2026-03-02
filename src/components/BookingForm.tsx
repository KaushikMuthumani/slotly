'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatINR, formatTime, generateTimeSlots, DAY_NAMES, calculateGST, validateGSTIN } from '@/lib/utils'

interface Props {
  profile: any
  availability: any[]
  blockedDates: string[]
  bookedSlots: string[]
}

function getDatesForNext60Days(availability: any[], blockedDates: string[]) {
  const dates: { date: string; dayOfWeek: number }[] = []
  const activeDays = availability.map((a: any) => a.day_of_week)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 1; i <= 60; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dow = d.getDay()
    const dateStr = d.toISOString().split('T')[0]
    if (activeDays.includes(dow) && !blockedDates.includes(dateStr)) {
      dates.push({ date: dateStr, dayOfWeek: dow })
    }
  }
  return dates
}

export default function BookingForm({ profile, availability, blockedDates, bookedSlots }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'date' | 'time' | 'details' | 'confirm'>('date')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [form, setForm] = useState({ clientName: '', clientEmail: '', clientPhone: '', clientNotes: '', clientGstin: '' })
  const [gstinError, setGstinError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const availableDates = getDatesForNext60Days(availability, blockedDates)

  const getSlotsForDate = (date: string) => {
    if (!date) return []
    const dow = new Date(date).getDay()
    const dayAvail = availability.find((a: any) => a.day_of_week === dow)
    if (!dayAvail) return []
    const allSlots = generateTimeSlots(dayAvail.start_time.slice(0, 5), dayAvail.end_time.slice(0, 5), profile.session_duration)
    return allSlots.filter(slot => {
      if (bookedSlots.includes(`${date}_${slot}`)) return false
      return new Date(`${date}T${slot}`) > new Date()
    })
  }

  const availableSlots = getSlotsForDate(selectedDate)
  const gst = calculateGST(profile.fee_inr)

  const formatDisplayDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const validateDetails = () => {
    if (!form.clientName.trim()) { setError('Please enter your name.'); return false }
    if (!form.clientEmail.trim() || !form.clientEmail.includes('@')) { setError('Please enter a valid email.'); return false }
    if (form.clientGstin && !validateGSTIN(form.clientGstin)) { setGstinError('Invalid GSTIN format (e.g. 27AAPFU0939F1ZV)'); return false }
    setError(''); setGstinError('')
    return true
  }

  const handleBooking = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultantId: profile.id,
          clientName: form.clientName.trim(),
          clientEmail: form.clientEmail.trim(),
          clientPhone: form.clientPhone.trim(),
          clientNotes: form.clientNotes.trim(),
          clientGstin: form.clientGstin.trim(),
          slotDate: selectedDate,
          slotTime: selectedTime,
          durationMinutes: profile.session_duration,
          amountInr: profile.fee_inr,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Booking failed. Please try again.')
        setLoading(false)
        return
      }
      const params = new URLSearchParams({
        consultant: profile.full_name,
        date: formatDisplayDate(selectedDate),
        time: formatTime(selectedTime),
      })
      router.push(`/book/confirmed?${params.toString()}`)
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const datesByMonth: Record<string, { date: string; dayOfWeek: number }[]> = {}
  availableDates.forEach(d => {
    const month = d.date.slice(0, 7)
    if (!datesByMonth[month]) datesByMonth[month] = []
    datesByMonth[month].push(d)
  })

  return (
    <div className="card">
      {/* Step indicator */}
      <div style={{ display: 'flex', marginBottom: 28, borderBottom: '2px solid var(--color-border)', paddingBottom: 20 }}>
        {[{ key: 'date', label: '1. Pick Date' }, { key: 'time', label: '2. Pick Time' }, { key: 'details', label: '3. Your Details' }, { key: 'confirm', label: '4. Confirm' }].map((s) => {
          const steps = ['date', 'time', 'details', 'confirm']
          const currentIdx = steps.indexOf(step)
          const thisIdx = steps.indexOf(s.key)
          return (
            <div key={s.key} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: thisIdx <= currentIdx ? 700 : 400, color: thisIdx <= currentIdx ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{s.label}</span>
              {thisIdx <= currentIdx && <div style={{ height: 2, background: 'var(--color-primary)', marginTop: 4, borderRadius: 1 }} />}
            </div>
          )
        })}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><span>⚠️</span> {error}</div>}

      {/* STEP: Pick Date */}
      {step === 'date' && (
        <div>
          <h3 style={{ marginBottom: 6, fontFamily: 'Sora', fontWeight: 600, fontSize: '1.15rem' }}>Select a Date</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: 20 }}>Available in the next 60 days · IST timezone</p>
          {availableDates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
              <p>No available dates. Please check back later.</p>
            </div>
          ) : (
            Object.entries(datesByMonth).map(([month, dates]) => (
              <div key={month} style={{ marginBottom: 24 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {dates.map(({ date, dayOfWeek }) => (
                    <button key={date} onClick={() => { setSelectedDate(date); setSelectedTime(''); setStep('time') }}
                      style={{ padding: '10px 14px', border: `2px solid ${selectedDate === date ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: selectedDate === date ? 'var(--color-primary)' : 'white', color: selectedDate === date ? 'white' : 'var(--color-text-primary)', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontSize: '0.875rem', transition: 'all 0.15s', textAlign: 'center', minWidth: 72 }}>
                      <div style={{ fontWeight: 600 }}>{new Date(date).getDate()}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{DAY_NAMES[dayOfWeek].slice(0, 3)}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* STEP: Pick Time */}
      {step === 'time' && (
        <div>
          <button onClick={() => setStep('date')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 16, padding: 0 }}>
            ← {formatDisplayDate(selectedDate)}
          </button>
          <h3 style={{ marginBottom: 6, fontFamily: 'Sora', fontWeight: 600, fontSize: '1.15rem' }}>Select a Time</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: 20 }}>All times in Indian Standard Time (IST)</p>
          {availableSlots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🕐</div>
              <p>No slots available for this date.</p>
              <button onClick={() => setStep('date')} className="btn btn-outline" style={{ marginTop: 16 }}>← Pick Another Date</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
              {availableSlots.map(slot => (
                <button key={slot} onClick={() => { setSelectedTime(slot); setStep('details') }}
                  style={{ padding: '12px 8px', border: `2px solid ${selectedTime === slot ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: selectedTime === slot ? 'var(--color-primary)' : 'white', color: selectedTime === slot ? 'white' : 'var(--color-text-primary)', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.15s', textAlign: 'center' }}>
                  {formatTime(slot)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP: Details */}
      {step === 'details' && (
        <div>
          <button onClick={() => setStep('time')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 16, padding: 0 }}>
            ← {formatDisplayDate(selectedDate)} at {formatTime(selectedTime)}
          </button>
          <h3 style={{ marginBottom: 6, fontFamily: 'Sora', fontWeight: 600, fontSize: '1.15rem' }}>Your Details</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: 20 }}>We'll send your confirmation and invoice to this email.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" placeholder="Your full name" value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" placeholder="you@example.com" value={form.clientEmail} onChange={e => setForm(p => ({ ...p, clientEmail: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Phone Number <span className="label-optional">(optional)</span></label>
              <input type="tel" placeholder="9876543210" value={form.clientPhone} onChange={e => setForm(p => ({ ...p, clientPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} maxLength={10} />
            </div>
            <div className="form-group">
              <label>What would you like to discuss? <span className="label-optional">(optional)</span></label>
              <textarea placeholder="Brief description of your query..." value={form.clientNotes} onChange={e => setForm(p => ({ ...p, clientNotes: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label>Your GSTIN <span className="label-optional">(optional, for B2B invoice)</span></label>
              <input type="text" placeholder="27AAPFU0939F1ZV" value={form.clientGstin} onChange={e => { setForm(p => ({ ...p, clientGstin: e.target.value.toUpperCase() })); setGstinError('') }} maxLength={15} style={{ textTransform: 'uppercase' }} className={gstinError ? 'error' : ''} />
              {gstinError && <span className="form-error">{gstinError}</span>}
            </div>
            <button onClick={() => { if (validateDetails()) setStep('confirm') }} className="btn btn-primary btn-full btn-lg">
              Review & Confirm →
            </button>
          </div>
        </div>
      )}

      {/* STEP: Confirm */}
      {step === 'confirm' && (
        <div>
          <h3 style={{ marginBottom: 6, fontFamily: 'Sora', fontWeight: 600, fontSize: '1.15rem' }}>Review Your Booking</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: 20 }}>Please review before confirming.</p>

          <div className="card" style={{ background: 'var(--color-bg-muted)', border: 'none', marginBottom: 20 }}>
            {[
              { label: 'Consultant', value: profile.full_name },
              { label: 'Date', value: formatDisplayDate(selectedDate) },
              { label: 'Time', value: formatTime(selectedTime) },
              { label: 'Duration', value: `${profile.session_duration} minutes` },
              { label: 'Your Name', value: form.clientName },
              { label: 'Your Email', value: form.clientEmail },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
                <span style={{ fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 20, border: '2px solid var(--color-border)' }}>
            <h4 style={{ fontFamily: 'Sora', fontWeight: 600, marginBottom: 12 }}>Payment Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9375rem' }}>
                <span>Consultation Fee</span><span>{formatINR(gst.subtotal)}</span>
              </div>
              {profile.gstin && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    <span>CGST (9%)</span><span>{formatINR(gst.cgst)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    <span>SGST (9%)</span><span>{formatINR(gst.sgst)}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                <span>Total</span><span>{formatINR(profile.gstin ? gst.total : gst.subtotal)}</span>
              </div>
            </div>
            {profile.gstin && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 10 }}>🧾 GST invoice will be emailed after payment confirmation.</p>}
          </div>

          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            <span>💳</span>
            <span>UPI payment via Razorpay will be enabled soon. The consultant will contact you to collect payment.</span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setStep('details')} className="btn btn-outline" style={{ flex: 1 }}>← Edit</button>
            <button onClick={handleBooking} className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? <><div className="spinner"></div> Confirming...</> : '✓ Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
