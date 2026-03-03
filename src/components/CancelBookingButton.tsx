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
    try {
      const res = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, reason }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Failed to cancel.'); return }
      router.refresh()
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
      setConfirming(false)
      setReason('')
    }
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', minWidth: 240 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#dc2626', margin: 0 }}>
          Cancel booking with {clientName}?
        </p>
        <input
          type="text"
          placeholder="Reason (optional, sent to client)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={{ padding: '7px 10px', border: '1px solid #fecaca', borderRadius: 6, fontSize: '0.8125rem', fontFamily: 'inherit', background: 'white' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleCancel} disabled={loading}
            className="btn btn-sm"
            style={{ background: '#dc2626', color: 'white', flex: 1, fontSize: '0.8rem' }}>
            {loading ? 'Cancelling...' : 'Yes, Cancel'}
          </button>
          <button onClick={() => { setConfirming(false); setReason('') }}
            className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}>
            Keep
          </button>
        </div>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="btn btn-ghost btn-sm"
      style={{ color: '#dc2626', fontSize: '0.8rem', border: '1px solid #dc2626' }}>
      Cancel
    </button>
  )
}
