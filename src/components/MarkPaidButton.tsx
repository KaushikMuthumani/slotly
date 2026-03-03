'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MarkPaidButton({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null)

  const handleMarkPaid = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to mark as paid. Please try again.')
        return
      }
      if (data.invoiceUrl) {
        setInvoiceUrl(data.invoiceUrl)
      }
      router.refresh()
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (invoiceUrl) {
    return (
      <a href={invoiceUrl} target="_blank" rel="noopener noreferrer"
        className="btn btn-sm"
        style={{ background: 'var(--color-success)', color: 'white', fontSize: '0.8rem', textDecoration: 'none' }}>
        📄 View Invoice
      </a>
    )
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button onClick={handleMarkPaid} disabled={loading}
          className="btn btn-sm"
          style={{ background: 'var(--color-success)', color: 'white', padding: '6px 10px', fontSize: '0.8rem' }}>
          {loading ? 'Processing...' : '✓ Confirm Paid'}
        </button>
        <button onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}>
          Cancel
        </button>
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
