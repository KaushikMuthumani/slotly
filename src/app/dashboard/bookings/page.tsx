// src/app/dashboard/bookings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatINR, formatDate, formatTime } from '@/lib/utils'
import CancelBookingButton from '@/components/CancelBookingButton'
import MarkPaidButton from '@/components/MarkPaidButton'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: bookings } = await supabase
    .from('bookings').select('*').eq('consultant_id', user.id)
    .order('slot_date', { ascending: false }).order('slot_time', { ascending: false })

  const statusBadge: Record<string, string> = {
    confirmed: 'badge-success', cancelled: 'badge-error',
    completed: 'badge-neutral', no_show: 'badge-warning',
  }
  const payBadge: Record<string, string> = {
    paid: 'badge-success', pending: 'badge-warning',
    failed: 'badge-error', refunded: 'badge-neutral',
  }

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
            <div key={b.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {/* Left — date + client info */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: b.status === 'cancelled' ? '#fef2f2' : 'var(--color-bg-muted)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {new Date(b.slot_date).toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1, color: b.status === 'cancelled' ? '#dc2626' : 'var(--color-primary)' }}>
                      {new Date(b.slot_date).getDate()}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: 2 }}>{b.client_name}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                      {b.client_email}
                      {b.client_phone && <span style={{ color: 'var(--color-text-muted)' }}> · {b.client_phone}</span>}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                      {formatDate(b.slot_date)} · {formatTime(b.slot_time)} · {b.duration_minutes} min
                    </p>
                    {b.client_notes && (
                      <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--color-bg-muted)', borderRadius: 8, borderLeft: '3px solid var(--color-accent)' }}>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                          <strong>Query:</strong> {b.client_notes}
                        </p>
                      </div>
                    )}
                    {b.client_gstin && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
                        GSTIN: {b.client_gstin}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right — amount + actions */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatINR(b.amount_inr)}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span className={`badge ${payBadge[b.payment_status] || 'badge-neutral'}`}>{b.payment_status}</span>
                    <span className={`badge ${statusBadge[b.status] || 'badge-neutral'}`}>{b.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {b.invoice_pdf_url && (
                      <a href={b.invoice_pdf_url} target="_blank" rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.8rem', textDecoration: 'none' }}>
                        📄 Invoice
                      </a>
                    )}
                    {b.status === 'confirmed' && b.payment_status === 'pending' && (
                      <MarkPaidButton bookingId={b.id} />
                    )}
                    {b.status === 'confirmed' && (
                      <CancelBookingButton bookingId={b.id} clientName={b.client_name} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
