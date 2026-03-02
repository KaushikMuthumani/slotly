'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelBookingButton({ bookingId, clientName }: { bookingId: string; clientName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')

  const handleCancel = async () => {
    setLoading(true)
    const res = await fetch('/api/cancel-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, reason }),
    })
    setLoading(false)
    if (res.ok) { router.refresh() }
    else { alert('Failed to cancel. Please try again.') }
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--color-error-bg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(220,38,38,0.2)', minWidth: 260 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-error)', margin: 0 }}>Cancel booking with {clientName}?</p>
        <input
          type="text"
          placeholder="Reason (optional — sent to client)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, fontSize: '0.8125rem', fontFamily: 'Sora, sans-serif', background: 'white' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleCancel} disabled={loading}
            className="btn btn-sm"
            style={{ background: 'var(--color-error)', color: 'white', flex: 1, fontSize: '0.8rem' }}>
            {loading ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
          <button onClick={() => { setConfirming(false); setReason('') }} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}>Keep</button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="btn btn-ghost btn-sm"
      style={{ color: 'var(--color-error)', fontSize: '0.8rem', border: '1px solid var(--color-error)' }}>
      Cancel
    </button>
  )
}