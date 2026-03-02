'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelBookingButton({ bookingId, clientName }: { bookingId: string; clientName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleCancel = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to cancel booking')
      } else {
        router.refresh()
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Cancel booking with {clientName}?</span>
        <button onClick={handleCancel} disabled={loading} className="btn btn-sm" style={{ background: 'var(--color-error)', color: 'white', padding: '6px 12px', fontSize: '0.8rem' }}>
          {loading ? 'Cancelling...' : 'Yes, Cancel'}
        </button>
        <button onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}>Keep</button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)', fontSize: '0.8rem', border: '1px solid var(--color-error)' }}>
      Cancel
    </button>
  )
}
