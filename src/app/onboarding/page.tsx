'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateSlug, validateGSTIN, DAY_NAMES } from '@/lib/utils'
import type { Profession } from '@/lib/types'

type Step = 1 | 2 | 3 | 4

const PROFESSIONS: { value: Profession; label: string; icon: string }[] = [
  { value: 'CA', label: 'Chartered Accountant', icon: '📊' },
  { value: 'Lawyer', label: 'Lawyer / Advocate', icon: '⚖️' },
  { value: 'Designer', label: 'Freelance Designer', icon: '🎨' },
  { value: 'Consultant', label: 'Business Consultant', icon: '💼' },
  { value: 'Other', label: 'Other Professional', icon: '🌟' },
]

const DURATIONS = [30, 45, 60, 90, 120]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')

  const [fullName, setFullName] = useState('')
  const [profession, setProfession] = useState<Profession | ''>('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [slug, setSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [feeInr, setFeeInr] = useState('500')
  const [sessionDuration, setSessionDuration] = useState(60)
  const [gstin, setGstin] = useState('')
  const [gstinError, setGstinError] = useState('')
  const [activeDays, setActiveDays] = useState([1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('18:00')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      const name = user.user_metadata?.full_name || ''
      setFullName(name)
      if (name) setSlug(generateSlug(name))
    }
    getUser()
  }, [])

  const checkSlug = async (value: string) => {
    if (value.length < 3) { setSlugAvailable(null); return }
    const { data } = await supabase.from('profiles').select('id').eq('slug', value).single()
    setSlugAvailable(!data)
  }

  const handleSlugChange = (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
    setSlug(clean)
    setSlugAvailable(null)
    if (clean.length >= 3) setTimeout(() => checkSlug(clean), 600)
  }

  const toggleDay = (day: number) =>
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const next = (validate: () => boolean) => { if (validate()) { setError(''); setStep(s => (s + 1) as Step) } }

  const step1Valid = () => {
    if (!fullName.trim()) { setError('Please enter your full name.'); return false }
    if (!profession) { setError('Please select your profession.'); return false }
    if (!phone.trim() || phone.length < 10) { setError('Please enter a valid 10-digit phone number.'); return false }
    return true
  }

  const step2Valid = () => {
    if (!slug || slug.length < 3) { setError('Booking URL must be at least 3 characters.'); return false }
    if (slugAvailable === false) { setError('This URL is already taken.'); return false }
    if (!feeInr || parseInt(feeInr) < 1) { setError('Please enter a valid consultation fee.'); return false }
    if (gstin && !validateGSTIN(gstin)) { setGstinError('Invalid GSTIN format'); return false }
    return true
  }

  const step3Valid = () => {
    if (activeDays.length === 0) { setError('Please select at least one working day.'); return false }
    if (startTime >= endTime) { setError('End time must be after start time.'); return false }
    return true
  }

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      const { error: profileError } = await supabase.from('profiles').update({
        full_name: fullName.trim(), profession, phone: phone.trim(), bio: bio.trim(),
        slug, fee_inr: parseInt(feeInr), session_duration: sessionDuration,
        gstin: gstin.toUpperCase() || null, onboarding_complete: true,
      }).eq('id', userId)
      if (profileError) throw profileError

      await supabase.from('availability').delete().eq('user_id', userId)
      const { error: availError } = await supabase.from('availability').insert(
        activeDays.map(day => ({ user_id: userId, day_of_week: day, start_time: startTime + ':00', end_time: endTime + ':00', is_active: true }))
      )
      if (availError) throw availError
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const steps = [{ num: 1, label: 'Profile' }, { num: 2, label: 'Service' }, { num: 3, label: 'Schedule' }, { num: 4, label: 'Done!' }]

  return (
    <div className="page-center" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div style={{ width: '100%', maxWidth: 600 }} className="animate-in">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 20 }}>S</span>
            </div>
            <span style={{ fontFamily: 'DM Serif Display', fontSize: 24, color: 'var(--color-primary)' }}>Slotly</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 32, alignItems: 'center', justifyContent: 'center' }}>
          {steps.map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: step >= s.num ? 'var(--color-primary)' : 'var(--color-bg-muted)', color: step >= s.num ? 'white' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.3s' }}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span style={{ fontSize: '0.75rem', color: step >= s.num ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: step === s.num ? 600 : 400 }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div style={{ width: 40, height: 2, marginBottom: 18, background: step > s.num ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 0.3s' }} />}
            </div>
          ))}
        </div>

        <div className="card">
          {error && <div className="alert alert-error" style={{ marginBottom: 24 }}><span>⚠️</span> {error}</div>}

          {step === 1 && (
            <div>
              <h2 style={{ marginBottom: 6 }}>Tell us about yourself</h2>
              <p style={{ marginBottom: 28 }}>This info appears on your public booking page.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="Rahul Sharma" value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>What do you do?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {PROFESSIONS.map(p => (
                      <button key={p.value} type="button" onClick={() => setProfession(p.value)} style={{ padding: '14px 16px', border: `2px solid ${profession === p.value ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: profession === p.value ? 'var(--color-primary)' : 'white', color: profession === p.value ? 'white' : 'var(--color-text-primary)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', fontSize: '0.9rem', fontFamily: 'Sora, sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{p.icon}</span><span style={{ fontWeight: 500 }}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} />
                  <span className="form-hint">Not shown publicly. Used for your account only.</span>
                </div>
                <div className="form-group">
                  <label>Short Bio <span className="label-optional">(optional)</span></label>
                  <textarea placeholder="CA with 8 years of experience in tax planning..." value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
                </div>
                <button onClick={() => next(step1Valid)} className="btn btn-primary btn-full btn-lg">Continue →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ marginBottom: 6 }}>Set up your service</h2>
              <p style={{ marginBottom: 28 }}>Configure your booking link and fees.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label>Your Booking URL</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '0.875rem', pointerEvents: 'none' }}>slotly.in/</div>
                    <input type="text" placeholder="rahul-ca" value={slug} onChange={e => handleSlugChange(e.target.value)} style={{ paddingLeft: 80 }} />
                  </div>
                  {slugAvailable === true && <span style={{ color: 'var(--color-success)', fontSize: '0.8125rem' }}>✓ Available!</span>}
                  {slugAvailable === false && <span className="form-error">✗ Already taken. Try another.</span>}
                </div>
                <div className="form-group">
                  <label>Consultation Fee (₹)</label>
                  <input type="number" placeholder="500" value={feeInr} onChange={e => setFeeInr(e.target.value)} min="1" />
                  <span className="form-hint">Amount clients pay when booking. Excluding GST.</span>
                </div>
                <div className="form-group">
                  <label>Session Duration</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {DURATIONS.map(d => (
                      <button key={d} type="button" onClick={() => setSessionDuration(d)} style={{ padding: '10px 18px', border: `2px solid ${sessionDuration === d ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: sessionDuration === d ? 'var(--color-primary)' : 'white', color: sessionDuration === d ? 'white' : 'var(--color-text-primary)', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 500, fontSize: '0.9rem', transition: 'all 0.2s' }}>
                        {d < 60 ? `${d} min` : `${d/60}${d%60 ? `.${d%60}` : ''} hr`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>GSTIN <span className="label-optional">(optional but recommended)</span></label>
                  <input type="text" placeholder="27AAPFU0939F1ZV" value={gstin} onChange={e => { setGstin(e.target.value.toUpperCase()); setGstinError('') }} maxLength={15} className={gstinError ? 'error' : ''} />
                  {gstinError && <span className="form-error">{gstinError}</span>}
                  <span className="form-hint">Required for GST invoices. You can add this later in Settings.</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setStep(1); setError('') }} className="btn btn-outline" style={{ flex: 1 }}>← Back</button>
                  <button onClick={() => next(step2Valid)} className="btn btn-primary" style={{ flex: 2 }}>Continue →</button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ marginBottom: 6 }}>Set your availability</h2>
              <p style={{ marginBottom: 28 }}>When can clients book appointments with you?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="form-group">
                  <label>Working Days</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {DAY_NAMES.map((day, index) => (
                      <button key={day} type="button" onClick={() => toggleDay(index)} style={{ padding: '10px 14px', border: `2px solid ${activeDays.includes(index) ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: activeDays.includes(index) ? 'var(--color-primary)' : 'white', color: activeDays.includes(index) ? 'white' : 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 500, fontSize: '0.875rem', transition: 'all 0.2s' }}>
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group"><label>Start Time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
                  <div className="form-group"><label>End Time</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
                </div>
                <div className="card" style={{ background: 'var(--color-bg-muted)', border: 'none', padding: 16 }}>
                  <p style={{ fontSize: '0.875rem', margin: 0 }}>💡 You can add lunch breaks, block specific dates, and change your schedule anytime from your dashboard.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => { setStep(2); setError('') }} className="btn btn-outline" style={{ flex: 1 }}>← Back</button>
                  <button onClick={() => next(step3Valid)} className="btn btn-primary" style={{ flex: 2 }}>Continue →</button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h2 style={{ marginBottom: 12 }}>You're all set!</h2>
              <p style={{ marginBottom: 28 }}>Review your profile before we take you to your dashboard.</p>
              <div className="card" style={{ background: 'var(--color-bg-muted)', border: 'none', marginBottom: 24, textAlign: 'left' }}>
                {[
                  { label: 'Name', value: fullName },
                  { label: 'Profession', value: PROFESSIONS.find(p => p.value === profession)?.label },
                  { label: 'Booking URL', value: `slotly.in/${slug}` },
                  { label: 'Fee', value: `₹${parseInt(feeInr).toLocaleString('en-IN')}` },
                  { label: 'Session', value: `${sessionDuration} minutes` },
                  { label: 'Hours', value: `${startTime} – ${endTime}` },
                  { label: 'GSTIN', value: gstin || 'Not provided (add in Settings)' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.9375rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
                    <span style={{ fontWeight: 500 }}>{item.value}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleFinish} className="btn btn-accent btn-full btn-lg" disabled={loading}>
                {loading ? <><div className="spinner spinner-dark"></div> Setting up...</> : '🚀 Go to Dashboard'}
              </button>
              <button onClick={() => { setStep(3); setError('') }} className="btn btn-ghost btn-full" style={{ marginTop: 10 }}>← Make changes</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
