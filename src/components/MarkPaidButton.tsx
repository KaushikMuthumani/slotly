'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkPaidButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleMarkPaid = async () => {
    setLoading(true)
    const res = await fetch('/api/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    })
    setLoading(false)
    if (res.ok) { router.refresh() }
    else { alert('Failed to update. Please try again.') }
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button onClick={handleMarkPaid} disabled={loading}
          className="btn btn-sm"
          style={{ background: 'var(--color-success)', color: 'white', padding: '6px 10px', fontSize: '0.8rem' }}>
          {loading ? '...' : '✓ Confirm'}
        </button>
        <button onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}>Cancel</button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)}
      className="btn btn-ghost btn-sm"
      style={{ color: 'var(--color-success)', fontSize: '0.8rem', border: '1px solid var(--color-success)' }}>
      Mark Paid
    </button>
  )
}