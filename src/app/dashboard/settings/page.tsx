'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateGSTIN } from '@/lib/utils'

const PROFESSIONS = [
  { value: 'CA', label: 'Chartered Accountant' },
  { value: 'Lawyer', label: 'Lawyer / Advocate' },
  { value: 'Designer', label: 'Freelance Designer' },
  { value: 'Consultant', label: 'Business Consultant' },
  { value: 'Other', label: 'Other Professional' },
]

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ full_name: '', profession: '', phone: '', bio: '', gstin: '', fee_inr: '500', session_duration: '60', cancellation_hours: '24' })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profile) setForm({ full_name: profile.full_name || '', profession: profile.profession || '', phone: profile.phone || '', bio: profile.bio || '', gstin: profile.gstin || '', fee_inr: profile.fee_inr?.toString() || '500', session_duration: profile.session_duration?.toString() || '60', cancellation_hours: profile.cancellation_hours?.toString() || '24' })
      setLoading(false)
    }
    load()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError(''); setSuccess('')
  }

  const handleSave = async () => {
    if (!form.full_name.trim()) return setError('Full name is required.')
    if (form.gstin && !validateGSTIN(form.gstin)) return setError('Invalid GSTIN format.')
    setError(''); setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: updateError } = await supabase.from('profiles').update({ full_name: form.full_name.trim(), profession: form.profession, phone: form.phone.trim(), bio: form.bio.trim(), gstin: form.gstin.toUpperCase() || null, fee_inr: parseInt(form.fee_inr), session_duration: parseInt(form.session_duration), cancellation_hours: parseInt(form.cancellation_hours) }).eq('id', user.id)
    setSaving(false)
    if (updateError) setError(updateError.message)
    else { setSuccess('Settings saved!'); setTimeout(() => setSuccess(''), 3000) }
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 80 }}><div className="spinner spinner-dark" style={{ margin: '0 auto' }}></div></div>

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Settings</h1>
        <p>Manage your profile and consultation settings.</p>
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}><span>⚠️</span> {error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: 20 }}><span>✓</span> {success}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: '1.1rem', marginBottom: 20 }}>Personal Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group"><label>Full Name</label><input name="full_name" type="text" value={form.full_name} onChange={handleChange} /></div>
            <div className="form-group"><label>Profession</label>
              <select name="profession" value={form.profession} onChange={handleChange}>
                {PROFESSIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Phone</label><input name="phone" type="tel" value={form.phone} onChange={handleChange} maxLength={10} /></div>
            <div className="form-group"><label>Bio <span className="label-optional">(shown on booking page)</span></label><textarea name="bio" value={form.bio} onChange={handleChange} rows={3} style={{ resize: 'vertical' }} /></div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: '1.1rem', marginBottom: 20 }}>Service & Billing</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group"><label>Consultation Fee (₹)</label><input name="fee_inr" type="number" value={form.fee_inr} onChange={handleChange} min="1" /></div>
              <div className="form-group"><label>Session Duration (minutes)</label>
                <select name="session_duration" value={form.session_duration} onChange={handleChange}>
                  {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} minutes</option>)}
                </select>
              </div>
              <div className="form-group"><label>Cancellation Window</label>
                <select name="cancellation_hours" value={form.cancellation_hours} onChange={handleChange}>
                  <option value="1">1 hour before</option>
                  <option value="6">6 hours before</option>
                  <option value="12">12 hours before</option>
                  <option value="24">24 hours before</option>
                  <option value="48">48 hours before</option>
                </select>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>GST Details</h3>
            <p style={{ fontSize: '0.875rem', marginBottom: 16 }}>Required for generating GST invoices with your registration number.</p>
            <div className="form-group">
              <label>GSTIN <span className="label-optional">(optional)</span></label>
              <input name="gstin" type="text" placeholder="27AAPFU0939F1ZV" value={form.gstin} onChange={handleChange} maxLength={15} style={{ textTransform: 'uppercase' }} />
              <span className="form-hint">15-character GST Identification Number</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} className="btn btn-primary btn-lg" disabled={saving}>
          {saving ? <><div className="spinner"></div> Saving...</> : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
