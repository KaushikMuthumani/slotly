// src/app/dashboard/bookings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { formatINR, formatDate, formatTime } from '@/lib/utils'
import CancelBookingButton from '@/components/CancelBookingButton'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: bookings } = await supabase
    .from('bookings').select('*').eq('consultant_id', user!.id)
    .order('slot_date', { ascending: false }).order('slot_time', { ascending: false })

  const statusStyle: Record<string, string> = { confirmed: 'badge-success', cancelled: 'badge-error', completed: 'badge-neutral', no_show: 'badge-warning' }
  const paymentStyle: Record<string, string> = { paid: 'badge-success', pending: 'badge-warning', failed: 'badge-error', refunded: 'badge-neutral' }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Bookings</h1>
        <p>All your appointments in one place.</p>
      </div>
      {!bookings || bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3 style={{ marginBottom: 8 }}>No bookings yet</h3>
          <p>Share your booking link to start receiving appointments.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map((b: any) => (
            <div key={b.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: b.status === 'cancelled' ? 'var(--color-error-bg)' : 'var(--color-bg-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {new Date(b.slot_date).toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: b.status === 'cancelled' ? 'var(--color-error)' : 'var(--color-primary)', lineHeight: 1 }}>
                    {new Date(b.slot_date).getDate()}
                  </span>
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{b.client_name}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 2 }}>{b.client_email}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {formatDate(b.slot_date)} · {formatTime(b.slot_time)} · {b.duration_minutes} min
                  </p>
                  {b.client_notes && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>"{b.client_notes}"</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{formatINR(b.amount_inr)}</span>
                <span className={`badge ${paymentStyle[b.payment_status] || 'badge-neutral'}`}>{b.payment_status}</span>
                <span className={`badge ${statusStyle[b.status] || 'badge-neutral'}`}>{b.status}</span>
                {b.invoice_pdf_url && (
                  <a href={b.invoice_pdf_url} target="_blank" className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}>📄 Invoice</a>
                )}
                {b.status === 'confirmed' && (
                  <CancelBookingButton bookingId={b.id} clientName={b.client_name} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
