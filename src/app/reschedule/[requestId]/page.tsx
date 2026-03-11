'use client'
// src/app/reschedule/[requestId]/page.tsx
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

export default function ReschedulePage() {
  const { requestId } = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [preselected, setPreselected] = useState<any>(null)

  useEffect(() => {
    const slotParam = searchParams.get('slot')
    if (slotParam) {
      try { setPreselected(JSON.parse(decodeURIComponent(slotParam))) } catch {}
    }
    setLoading(false)
  }, [searchParams])

  const acceptSlot = async (slot: { date: string; time: string; label: string }) => {
    setAccepting(true)
    setError('')
    try {
      const res = await fetch('/api/reschedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, acceptedSlot: slot }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setDone(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAccepting(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ marginBottom: 8 }}>Rescheduled!</h2>
        <p>Your meeting has been rescheduled. You'll receive a confirmation email shortly.</p>
      </div>
    </div>
  )

  if (preselected) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📅</div>
          <h2>Confirm Reschedule</h2>
          <p>You're accepting the following new time:</p>
        </div>
        <div className="card" style={{ marginBottom: 24, textAlign: 'center' }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{preselected.label}</p>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
        <button
          onClick={() => acceptSlot(preselected)}
          disabled={accepting}
          className="btn btn-primary btn-full btn-lg"
        >
          {accepting ? <><div className="spinner" /> Confirming...</> : '✅ Confirm this time'}
        </button>
        <button
          onClick={() => setPreselected(null)}
          className="btn btn-full"
          style={{ marginTop: 12 }}
        >
          See other options
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
        <h2 style={{ marginBottom: 8 }}>Reschedule Request</h2>
        <p style={{ marginBottom: 24 }}>Click a slot in the email to accept a new meeting time.</p>
        {error && <div className="alert alert-error">{error}</div>}
      </div>
    </div>
  )
}
