'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateGSTIN } from '@/lib/utils'
import ProfilePhotoUpload from '@/components/ProfilePhotoUpload'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({
    full_name: '', profession: '', phone: '', bio: '',
    fee_inr: '', session_duration: '30', gstin: '',
    cancellation_window_hours: '24',
  })
  const [gstinError, setGstinError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (p) {
        setProfile(p)
        setForm({
          full_name: p.full_name || '',
          profession: p.profession || '',
          phone: p.phone || '',
          bio: p.bio || '',
          fee_inr: p.fee_inr?.toString() || '',
          session_duration: p.session_duration?.toString() || '30',
          gstin: p.gstin || '',
          cancellation_window_hours: p.cancellation_window_hours?.toString() || '24',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setError(''); setGstinError('')
    if (!form.full_name.trim()) { setError('Full name is required.'); return }
    if (!form.fee_inr || isNaN(Number(form.fee_inr)) || Number(form.fee_inr) < 0) {
      setError('Please enter a valid fee.'); return
    }
    if (form.gstin && !validateGSTIN(form.gstin)) {
      setGstinError('Invalid GSTIN format (e.g. 27AAPFU0939F1ZV)'); return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in'); setSaving(false); return }

    const { error: updateError } = await supabase.from('profiles').update({
      full_name: form.full_name.trim(),
      profession: form.profession.trim(),
      phone: form.phone.trim(),
      bio: form.bio.trim(),
      fee_inr: Number(form.fee_inr),
      session_duration: Number(form.session_duration),
      gstin: form.gstin.trim().toUpperCase() || null,
      cancellation_window_hours: Number(form.cancellation_window_hours),
    }).eq('id', user.id)

    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', paddingTop: 80 }}>
      <div className="spinner spinner-dark" style={{ margin: '0 auto' }}></div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Settings</h1>
        <p>Update your profile and service details.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>
        {/* Photo card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'Sora', fontWeight: 600, marginBottom: 20, fontSize: '1rem' }}>Profile Photo</h3>
          <ProfilePhotoUpload currentUrl={profile?.avatar_url} name={form.full_name} />
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 12 }}>
            JPG, PNG or WebP · Max 2MB
          </p>
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Your booking link</p>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              /book/{profile?.slug}
            </p>
          </div>
        </div>

        {/* Main form */}
        <div className="card">
          <h3 style={{ fontFamily: 'Sora', fontWeight: 600, marginBottom: 20, fontSize: '1rem' }}>Profile Details</h3>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><span>⚠️</span> {error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}><span>✓</span> Settings saved successfully!</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Profession</label>
                <input type="text" placeholder="CA, Lawyer, Designer..." value={form.profession} onChange={e => setForm(p => ({ ...p, profession: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} maxLength={10} />
            </div>

            <div className="form-group">
              <label>Bio <span className="label-optional">(shown on booking page)</span></label>
              <textarea rows={3} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell clients about your expertise..." style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Consultation Fee (₹) *</label>
                <input type="number" min="0" value={form.fee_inr} onChange={e => setForm(p => ({ ...p, fee_inr: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Session Duration (minutes)</label>
                <select value={form.session_duration} onChange={e => setForm(p => ({ ...p, session_duration: e.target.value }))}>
                  {[15, 20, 30, 45, 60, 90, 120].map(m => (
                    <option key={m} value={m}>{m} minutes</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>GSTIN <span className="label-optional">(required for GST invoices)</span></label>
              <input
                type="text"
                placeholder="27AAPFU0939F1ZV"
                value={form.gstin}
                onChange={e => { setForm(p => ({ ...p, gstin: e.target.value.toUpperCase() })); setGstinError('') }}
                maxLength={15}
                style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                className={gstinError ? 'error' : ''}
              />
              {gstinError ? (
                <span className="form-error">{gstinError}</span>
              ) : (
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Add your GSTIN to auto-generate GST invoices for every paid booking.
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Cancellation Window</label>
              <select value={form.cancellation_window_hours} onChange={e => setForm(p => ({ ...p, cancellation_window_hours: e.target.value }))}>
                <option value="1">1 hour before</option>
                <option value="2">2 hours before</option>
                <option value="6">6 hours before</option>
                <option value="12">12 hours before</option>
                <option value="24">24 hours before</option>
                <option value="48">48 hours before</option>
              </select>
            </div>

            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="spinner"></div> Saving...</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
