'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES } from '@/lib/utils'

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt12(t: string) {
  if (!t) return ''
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  const p = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${p}`
}

export default function AvailabilityPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  // Working hours
  const [activeDays, setActiveDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('18:00')
  const [savingHours, setSavingHours] = useState(false)
  const [hoursSuccess, setHoursSuccess] = useState(false)
  const [hoursError, setHoursError] = useState('')

  // Blocked dates
  const [blockedDates, setBlockedDates] = useState<any[]>([])
  const [newDate, setNewDate] = useState('')
  const [newReason, setNewReason] = useState('')
  const [blockFullDay, setBlockFullDay] = useState(true)
  const [newBlockStart, setNewBlockStart] = useState('')
  const [newBlockEnd, setNewBlockEnd] = useState('')
  const [addingDate, setAddingDate] = useState(false)

  // Recurring time blocks
  const [blockedTimes, setBlockedTimes] = useState<any[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newDays, setNewDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [addingTime, setAddingTime] = useState(false)
  const [timeError, setTimeError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: avail }, { data: blocked }, { data: times }] = await Promise.all([
        supabase.from('availability').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('blocked_dates').select('*').eq('user_id', user.id)
          .gte('blocked_date', new Date().toISOString().split('T')[0])
          .order('blocked_date', { ascending: true }),
        supabase.from('blocked_times').select('*').eq('user_id', user.id)
          .order('start_time', { ascending: true }),
      ])

      if (avail?.length) {
        setActiveDays(avail.map((a: any) => a.day_of_week))
        setStartTime(avail[0].start_time.slice(0, 5))
        setEndTime(avail[0].end_time.slice(0, 5))
      }
      setBlockedDates(blocked || [])
      setBlockedTimes(times || [])
      setPageLoading(false)
    }
    load()
  }, [])

  // ─── Working Hours ──────────────────────────────────────────────────────────

  const toggleDay = (d: number) =>
    setActiveDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])

  const saveHours = async () => {
    if (!activeDays.length) { setHoursError('Select at least one working day.'); return }
    if (startTime >= endTime) { setHoursError('End time must be after start time.'); return }
    setHoursError(''); setSavingHours(true)
    await supabase.from('availability').delete().eq('user_id', userId)
    const { error } = await supabase.from('availability').insert(
      activeDays.map(day => ({
        user_id: userId, day_of_week: day,
        start_time: startTime + ':00', end_time: endTime + ':00', is_active: true,
      }))
    )
    setSavingHours(false)
    if (error) { setHoursError(error.message); return }
    setHoursSuccess(true)
    setTimeout(() => setHoursSuccess(false), 3000)
  }

  // ─── Blocked Dates ──────────────────────────────────────────────────────────

  const addBlockedDate = async () => {
    if (!newDate) return
    setAddingDate(true)
    const insertData: any = { user_id: userId, blocked_date: newDate }
    if (newReason) insertData.reason = newReason
    if (!blockFullDay && newBlockStart && newBlockEnd) {
      insertData.block_start_time = newBlockStart + ':00'
      insertData.block_end_time = newBlockEnd + ':00'
      if (!insertData.reason) insertData.reason = `${fmt12(newBlockStart)} – ${fmt12(newBlockEnd)}`
    }
    const { data, error } = await supabase.from('blocked_dates').insert(insertData).select().single()
    setAddingDate(false)
    if (!error && data) {
      setBlockedDates(p => [...p, data].sort((a, b) => a.blocked_date.localeCompare(b.blocked_date)))
      setNewDate(''); setNewReason(''); setNewBlockStart(''); setNewBlockEnd(''); setBlockFullDay(true)
    }
  }

  const removeBlockedDate = async (id: string) => {
    await supabase.from('blocked_dates').delete().eq('id', id)
    setBlockedDates(p => p.filter(b => b.id !== id))
  }

  // ─── Recurring Time Blocks ──────────────────────────────────────────────────

  const toggleNewDay = (d: number) =>
    setNewDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])

  const addBlockedTime = async () => {
    setTimeError('')
    if (!newLabel.trim()) { setTimeError('Please add a label e.g. Lunch Break'); return }
    if (!newStart || !newEnd) { setTimeError('Please set start and end time'); return }
    if (newStart >= newEnd) { setTimeError('End time must be after start time'); return }
    if (!newDays.length) { setTimeError('Select at least one day'); return }

    setAddingTime(true)
    const res = await fetch('/api/blocked-times', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel.trim(), start_time: newStart, end_time: newEnd, applies_to_days: newDays }),
    })
    const result = await res.json()
    setAddingTime(false)
    if (!res.ok) { setTimeError(result.error); return }

    setBlockedTimes(p => [...p, result.data].sort((a, b) => a.start_time.localeCompare(b.start_time)))
    setNewLabel(''); setNewStart(''); setNewEnd(''); setNewDays([0, 1, 2, 3, 4, 5, 6])
  }

  const removeBlockedTime = async (id: string) => {
    const res = await fetch('/api/blocked-times', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setBlockedTimes(p => p.filter(t => t.id !== id))
  }

  const getDayLabel = (days: number[]) => {
    if (days.length === 7) return 'Every day'
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays'
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends'
    return days.map(d => SHORT_DAYS[d]).join(', ')
  }

  if (pageLoading) return (
    <div style={{ textAlign: 'center', paddingTop: 80 }}>
      <div className="spinner spinner-dark" style={{ margin: '0 auto' }}></div>
    </div>
  )

  const dayBtnStyle = (active: boolean) => ({
    padding: '7px 11px',
    border: `2px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    background: active ? 'var(--color-primary)' : 'white',
    color: active ? 'white' : 'var(--color-text-secondary)',
    cursor: 'pointer' as const,
    fontFamily: 'Sora, sans-serif',
    fontWeight: 500,
    fontSize: '0.8125rem',
    transition: 'all 0.15s',
  })

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Availability</h1>
        <p>Control exactly when clients can book you.</p>
      </div>

      {/* Row 1 — Working hours + Block dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

        {/* Working Hours */}
        <div className="card">
          <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: '1rem', marginBottom: 18 }}>🕐 Working Hours</h3>

          {hoursError && <div className="alert alert-error" style={{ marginBottom: 14 }}><span>⚠️</span> {hoursError}</div>}
          {hoursSuccess && <div className="alert alert-success" style={{ marginBottom: 14 }}><span>✓</span> Saved!</div>}

          <div className="form-group" style={{ marginBottom: 18 }}>
            <label>Working Days</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {DAY_NAMES.map((day, i) => (
                <button key={day} type="button" onClick={() => toggleDay(i)} style={dayBtnStyle(activeDays.includes(i))}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>

          <button onClick={saveHours} className="btn btn-primary btn-full" disabled={savingHours}>
            {savingHours ? <><div className="spinner"></div> Saving...</> : 'Save Working Hours'}
          </button>
        </div>

        {/* Block Specific Dates */}
        <div className="card">
          <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: '1rem', marginBottom: 6 }}>📅 Block Specific Dates</h3>
          <p style={{ fontSize: '0.875rem', marginBottom: 14 }}>Holidays, leaves, or specific hours on one date.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setBlockFullDay(true)} style={{ ...dayBtnStyle(blockFullDay), flex: 1 }}>🚫 Full Day</button>
              <button type="button" onClick={() => setBlockFullDay(false)} style={{ ...dayBtnStyle(!blockFullDay), flex: 1 }}>🕐 Specific Hours</button>
            </div>

            {!blockFullDay && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group"><label>From</label><input type="time" value={newBlockStart} onChange={e => setNewBlockStart(e.target.value)} /></div>
                <div className="form-group"><label>To</label><input type="time" value={newBlockEnd} onChange={e => setNewBlockEnd(e.target.value)} /></div>
              </div>
            )}

            <div className="form-group">
              <label>Reason <span className="label-optional">(optional)</span></label>
              <input type="text" placeholder="Holiday, client meeting..." value={newReason} onChange={e => setNewReason(e.target.value)} />
            </div>

            <button onClick={addBlockedDate} className="btn btn-outline btn-full" disabled={!newDate || addingDate}>
              {addingDate ? 'Adding...' : `+ Block This ${blockFullDay ? 'Day' : 'Time Slot'}`}
            </button>
          </div>

          {blockedDates.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '12px 0' }}>No dates blocked.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {blockedDates.map((bd: any) => (
                <div key={bd.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.875rem', margin: 0 }}>
                      {new Date(bd.blocked_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    {bd.reason && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>{bd.reason}</p>}
                  </div>
                  <button onClick={() => removeBlockedDate(bd.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', fontSize: '1.2rem', padding: 4 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2 — Recurring Time Blocks (full width) */}
      <div className="card">
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Sora', fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>🔁 Recurring Time Blocks</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Block specific hours every week — lunch breaks, prayer times, admin hours. These apply automatically every week across all selected days.
          </p>
        </div>

        {/* Add form */}
        <div style={{ background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 24 }}>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 16 }}>Add New Recurring Block</p>

          {timeError && <div className="alert alert-error" style={{ marginBottom: 12 }}><span>⚠️</span> {timeError}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="form-group">
              <label>Label *</label>
              <input
                type="text"
                placeholder="e.g. Lunch Break, Namaz, Admin Hours, Team Standup"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>From *</label>
              <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label>To *</label>
              <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>Applies to days</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {SHORT_DAYS.map((day, i) => (
                <button key={day} type="button" onClick={() => toggleNewDay(i)} style={dayBtnStyle(newDays.includes(i))}>
                  {day}
                </button>
              ))}
              <button type="button" onClick={() => setNewDays([0, 1, 2, 3, 4, 5, 6])}
                style={{ padding: '7px 11px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                All
              </button>
              <button type="button" onClick={() => setNewDays([1, 2, 3, 4, 5])}
                style={{ padding: '7px 11px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                Weekdays
              </button>
              <button type="button" onClick={() => setNewDays([0, 6])}
                style={{ padding: '7px 11px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>
                Weekends
              </button>
            </div>
          </div>

          <button onClick={addBlockedTime} className="btn btn-primary" disabled={addingTime}>
            {addingTime ? 'Adding...' : '+ Add Recurring Block'}
          </button>
        </div>

        {/* Existing blocks list */}
        {blockedTimes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔁</div>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>No recurring blocks yet</p>
            <p style={{ fontSize: '0.875rem' }}>Add your lunch break above and it'll be blocked every week automatically.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {blockedTimes.map((bt: any) => (
              <div key={bt.id} style={{ padding: '14px 16px', background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>{bt.label}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    🕐 {fmt12(bt.start_time)} — {fmt12(bt.end_time)}
                  </p>
                  <span style={{ display: 'inline-block', padding: '2px 8px', background: 'var(--color-primary)', color: 'white', borderRadius: 4, fontSize: '0.75rem', fontWeight: 500 }}>
                    {getDayLabel(bt.applies_to_days || [])}
                  </span>
                </div>
                <button onClick={() => removeBlockedTime(bt.id)}
                  title="Remove"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-error)', fontSize: '1.25rem', padding: 2, flexShrink: 0, lineHeight: 1 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
