'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES } from '@/lib/utils'

export default function AvailabilityPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [activeDays, setActiveDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('18:00')
  const [blockedDates, setBlockedDates] = useState<any[]>([])
  const [newDate, setNewDate] = useState('')
  const [newReason, setNewReason] = useState('')
  const [newBlockStart, setNewBlockStart] = useState('')
  const [newBlockEnd, setNewBlockEnd] = useState('')
  const [blockFullDay, setBlockFullDay] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: avail } = await supabase.from('availability').select('*').eq('user_id', user.id).eq('is_active', true)
      if (avail && avail.length > 0) {
        setActiveDays(avail.map((a: any) => a.day_of_week))
        setStartTime(avail[0].start_time.slice(0, 5))
        setEndTime(avail[0].end_time.slice(0, 5))
      }
      const { data: blocked } = await supabase.from('blocked_dates').select('*').eq('user_id', user.id)
        .gte('blocked_date', new Date().toISOString().split('T')[0])
        .order('blocked_date', { ascending: true })
      setBlockedDates(blocked || [])
      setLoading(false)
    }
    load()
  }, [])

  const toggleDay = (day: number) =>
    setActiveDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])

  const handleSave = async () => {
    if (activeDays.length === 0) return setError('Select at least one working day.')
    if (startTime >= endTime) return setError('End time must be after start time.')
    setError(''); setSaving(true)
    await supabase.from('availability').delete().eq('user_id', userId)
    const { error: insertError } = await supabase.from('availability').insert(
      activeDays.map(day => ({ user_id: userId, day_of_week: day, start_time: startTime + ':00', end_time: endTime + ':00', is_active: true }))
    )
    setSaving(false)
    if (insertError) setError(insertError.message)
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
  }

  const addBlocked = async () => {
    if (!newDate) return
    if (!blockFullDay && newBlockStart && newBlockEnd && newBlockStart >= newBlockEnd) {
      return setError('Block end time must be after start time.')
    }
    const reason = newReason || null
    const blockStart = !blockFullDay && newBlockStart ? newBlockStart : null
    const blockEnd = !blockFullDay && newBlockEnd ? newBlockEnd : null

    const insertData: any = {
      user_id: userId,
      blocked_date: newDate,
      reason: blockFullDay ? reason : `${reason ? reason + ' ' : ''}${newBlockStart}–${newBlockEnd}`,
    }

    const { data, error: e } = await supabase.from('blocked_dates').insert(insertData).select().single()
    if (!e && data) {
      setBlockedDates(prev => [...prev, data].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)))
      setNewDate(''); setNewReason(''); setNewBlockStart(''); setNewBlockEnd('')
      setBlockFullDay(true); setError('')
    }
  }

  const removeBlocked = async (id: string) => {
    await supabase.from('blocked_dates').delete().eq('id', id)
    setBlockedDates(prev => prev.filter(b => b.id !== id))
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 80 }}><div className="spinner spinner-dark" style={{ margin: '0 auto' }}></div></div>

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Availability</h1>
        <p>Set when clients can book appointments with you.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Working Hours */}
        <div className="card">
          <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: '1.1rem', marginBottom: 20 }}>Working Hours</h3>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><span>⚠️</span> {error}</div>}
          {success && <div className="alert alert-success" style={{ marginBottom: 16 }}><span>✓</span> Availability saved!</div>}
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>Working Days</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {DAY_NAMES.map((day, index) => (
                <button key={day} type="button" onClick={() => toggleDay(index)}
                  style={{ padding: '8px 12px', border: `2px solid ${activeDays.includes(index) ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: activeDays.includes(index) ? 'var(--color-primary)' : 'white', color: activeDays.includes(index) ? 'white' : 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 500, fontSize: '0.875rem', transition: 'all 0.2s' }}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="form-group"><label>Start Time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
            <div className="form-group"><label>End Time</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
          </div>
          <button onClick={handleSave} className="btn btn-primary btn-full" disabled={saving}>
            {saving ? <><div className="spinner"></div> Saving...</> : 'Save Availability'}
          </button>
        </div>

        {/* Block Off Dates */}
        <div className="card">
          <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: '1.1rem', marginBottom: 8 }}>Block Off Dates</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: 16 }}>Block a full day or specific hours on a date.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            <div className="form-group">
              <label>Date to Block</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>

            {/* Full day vs time range toggle */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setBlockFullDay(true)}
                style={{ flex: 1, padding: '10px', border: `2px solid ${blockFullDay ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: blockFullDay ? 'var(--color-primary)' : 'white', color: blockFullDay ? 'white' : 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 500, fontSize: '0.875rem', transition: 'all 0.2s' }}>
                🚫 Full Day
              </button>
              <button type="button" onClick={() => setBlockFullDay(false)}
                style={{ flex: 1, padding: '10px', border: `2px solid ${!blockFullDay ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: !blockFullDay ? 'var(--color-primary)' : 'white', color: !blockFullDay ? 'white' : 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 500, fontSize: '0.875rem', transition: 'all 0.2s' }}>
                🕐 Specific Hours
              </button>
            </div>

            {!blockFullDay && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group"><label>From</label><input type="time" value={newBlockStart} onChange={e => setNewBlockStart(e.target.value)} /></div>
                <div className="form-group"><label>To</label><input type="time" value={newBlockEnd} onChange={e => setNewBlockEnd(e.target.value)} /></div>
              </div>
            )}

            <div className="form-group">
              <label>Reason <span className="label-optional">(optional)</span></label>
              <input type="text" placeholder="Holiday, lunch, client meeting..." value={newReason} onChange={e => setNewReason(e.target.value)} />
            </div>
            <button onClick={addBlocked} className="btn btn-outline btn-full" disabled={!newDate}>
              + Block This {blockFullDay ? 'Day' : 'Time Slot'}
            </button>
          </div>

          {blockedDates.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '20px 0' }}>No dates blocked yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blockedDates.map((bd: any) => (
                <div key={bd.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.9375rem' }}>
                      {new Date(bd.blocked_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    {bd.reason && <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{bd.reason}</p>}
                  </div>
                  <button onClick={() => removeBlocked(bd.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', fontSize: '1.2rem', padding: 4 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}