'use client'
// src/app/dashboard/bookings/page.tsx
// Updated with: reputation score, no-show marking, AI brief, reschedule
import { useState, useEffect } from 'react'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTime(t: string) {
  const [h, m] = (t || '00:00').slice(0, 5).split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function scoreColor(score: number) {
  if (score >= 80) return '#16a34a'
  if (score >= 50) return '#d97706'
  return '#dc2626'
}
function scoreLabel(score: number) {
  if (score >= 80) return '😊 Reliable'
  if (score >= 50) return '⚠️ Average'
  return '🚨 Risk'
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [briefLoading, setBriefLoading] = useState<string | null>(null)
  const [rescheduleId, setRescheduleId] = useState<string | null>(null)
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [scores, setScores] = useState<Record<string, any>>({})

  useEffect(() => { fetchBookings() }, [filter])

  const fetchBookings = async () => {
    setLoading(true)
    const res = await fetch(`/api/bookings${filter !== 'all' ? `?status=${filter}` : ''}`)
    const data = await res.json()
    setBookings(data.bookings || [])
    setLoading(false)
  }

  const fetchScore = async (email: string) => {
    if (scores[email] !== undefined) return
    const res = await fetch(`/api/client-score?email=${encodeURIComponent(email)}`)
    const data = await res.json()
    setScores(prev => ({ ...prev, [email]: data.score }))
  }

  const markPaid = async (id: string) => {
    await fetch('/api/mark-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: id }) })
    fetchBookings()
  }

  const markNoShow = async (id: string, noShow: boolean) => {
    await fetch('/api/client-score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: id, noShow }) })
    fetchBookings()
  }

  const cancelBooking = async (id: string) => {
    const reason = prompt('Reason for cancellation (optional):')
    if (reason === null) return
    await fetch('/api/cancel-booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: id, reason }) })
    fetchBookings()
  }

  const generateBrief = async (id: string) => {
    setBriefLoading(id)
    const res = await fetch('/api/generate-brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: id }) })
    const data = await res.json()
    if (data.error) alert('Brief generation failed: ' + data.error)
    setBriefLoading(null)
    fetchBookings()
  }

  const requestReschedule = async (id: string) => {
    setRescheduling(true)
    const res = await fetch('/api/reschedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: id, reason: rescheduleReason }),
    })
    const data = await res.json()
    setRescheduling(false)
    setRescheduleId(null)
    setRescheduleReason('')
    if (data.error) alert('Error: ' + data.error)
    else alert('Reschedule request sent to client with ' + data.suggestedSlots?.length + ' options!')
  }

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Bookings</h1>
        <p>Manage your consultations with AI-powered insights.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            style={{ padding: '6px 16px', borderRadius: 20, border: '1.5px solid', borderColor: filter === f.value ? 'var(--color-primary)' : 'var(--color-border)', background: filter === f.value ? 'var(--color-primary)' : 'transparent', color: filter === f.value ? 'white' : 'inherit', cursor: 'pointer', fontWeight: filter === f.value ? 600 : 400 }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>}

      {!loading && bookings.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <h3>No bookings found</h3>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bookings.map((b: any) => {
          const score = scores[b.client_email]
          const isExpanded = expandedId === b.id
          const isPast = new Date(b.slot_date) < new Date()

          // Fetch score when we see the booking
          if (scores[b.client_email] === undefined) fetchScore(b.client_email)

          return (
            <div key={b.id} className="card">
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  {/* Date badge */}
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-bg-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {new Date(b.slot_date).toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>
                      {new Date(b.slot_date).getDate()}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{b.client_name}</p>
                      {/* Reputation score badge */}
                      {score && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: scoreColor(score.reliability_score) + '20', color: scoreColor(score.reliability_score) }}>
                          {score.reliability_score}/100 {scoreLabel(score.reliability_score)}
                        </span>
                      )}
                      {score === null && (
                        <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: 10, background: '#f0f0f0', color: '#888' }}>New client</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 2 }}>{b.client_email}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {fmtDate(b.slot_date)} · {fmtTime(b.slot_time)} · {b.duration_minutes} min
                      {b.notes && <span> · {b.notes}</span>}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700 }}>₹{Number(b.amount_inr).toLocaleString('en-IN')}</p>
                    <span className={`badge ${b.status === 'confirmed' ? 'badge-success' : b.status === 'cancelled' ? '' : 'badge-success'}`}
                      style={{ fontSize: '0.75rem' }}>
                      {b.payment_status === 'paid' ? '✓ Paid' : b.status}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {b.status !== 'cancelled' && b.payment_status !== 'paid' && (
                      <button onClick={() => markPaid(b.id)} className="btn btn-primary btn-sm">Mark Paid</button>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : b.id)} className="btn btn-sm">
                      {isExpanded ? 'Close' : 'Actions ▾'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded actions */}
              {isExpanded && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    {/* AI Brief */}
                    {b.intake_answers && !b.ai_brief && (
                      <button onClick={() => generateBrief(b.id)} disabled={briefLoading === b.id} className="btn btn-sm btn-primary">
                        {briefLoading === b.id ? '⏳ Generating...' : '🤖 Generate AI Brief'}
                      </button>
                    )}
                    {/* Reschedule */}
                    {b.status !== 'cancelled' && (
                      <button onClick={() => setRescheduleId(rescheduleId === b.id ? null : b.id)} className="btn btn-sm">
                        📅 Reschedule
                      </button>
                    )}
                    {/* No-show */}
                    {isPast && b.status !== 'cancelled' && (
                      <button onClick={() => markNoShow(b.id, !b.no_show)} className="btn btn-sm"
                        style={{ color: b.no_show ? '#16a34a' : '#dc2626' }}>
                        {b.no_show ? '✓ Undo No-Show' : '🚫 Mark No-Show'}
                      </button>
                    )}
                    {/* Cancel */}
                    {b.status !== 'cancelled' && (
                      <button onClick={() => cancelBooking(b.id)} className="btn btn-sm" style={{ color: '#dc2626' }}>
                        Cancel Booking
                      </button>
                    )}
                    {/* Invoice */}
                    {b.invoice_pdf_url && (
                      <a href={b.invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                        📄 Invoice PDF
                      </a>
                    )}
                  </div>

                  {/* Reschedule form */}
                  {rescheduleId === b.id && (
                    <div style={{ background: 'var(--color-bg-muted)', padding: 16, borderRadius: 8, marginBottom: 12 }}>
                      <p style={{ fontWeight: 600, marginBottom: 8 }}>Send Reschedule Request</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                        AI will suggest 5 available slots to the client via email.
                      </p>
                      <input
                        value={rescheduleReason}
                        onChange={e => setRescheduleReason(e.target.value)}
                        placeholder="Reason (optional)"
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 8, marginBottom: 10, fontSize: '0.875rem' }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => requestReschedule(b.id)} disabled={rescheduling} className="btn btn-primary btn-sm">
                          {rescheduling ? 'Sending...' : 'Send to Client'}
                        </button>
                        <button onClick={() => setRescheduleId(null)} className="btn btn-sm">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Intake answers */}
                  {b.intake_answers && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.875rem' }}>📋 Client's Intake Answers:</p>
                      <div style={{ background: 'var(--color-bg-muted)', borderRadius: 8, padding: 12 }}>
                        {Object.entries(b.intake_answers as Record<string, string>).map(([q, a]) => (
                          <div key={q} style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>{q}</p>
                            <p style={{ fontSize: '0.875rem' }}>{a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Brief */}
                  {b.ai_brief && (
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.875rem' }}>🤖 AI Meeting Brief:</p>
                      <div style={{ background: '#f0f7ff', border: '1px solid #c7d7f9', borderRadius: 8, padding: 14 }}>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.875rem', margin: 0 }}>{b.ai_brief}</pre>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
                          Generated {new Date(b.brief_generated_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Client score detail */}
                  {score && (
                    <div style={{ marginTop: 12, padding: 12, background: 'var(--color-bg-muted)', borderRadius: 8 }}>
                      <p style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.875rem' }}>Client Reliability</p>
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: scoreColor(score.reliability_score) }}>{score.reliability_score}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Score</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{score.total_bookings}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{score.no_show_count}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No-shows</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{score.cancellation_count}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Cancellations</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
