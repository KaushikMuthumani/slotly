import { createClient } from '@/lib/supabase/server'
import { formatINR, formatDate, formatTime } from '@/lib/utils'

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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-muted)' }}>
                  {['Client', 'Date & Time', 'Duration', 'Amount', 'Payment', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any, i: number) => (
                  <tr key={b.id} style={{ borderBottom: i < bookings.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={{ padding: 16 }}>
                      <p style={{ fontWeight: 600, marginBottom: 2 }}>{b.client_name}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{b.client_email}</p>
                    </td>
                    <td style={{ padding: 16 }}>
                      <p style={{ fontWeight: 500 }}>{formatDate(b.slot_date)}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{formatTime(b.slot_time)}</p>
                    </td>
                    <td style={{ padding: 16, color: 'var(--color-text-secondary)' }}>{b.duration_minutes} min</td>
                    <td style={{ padding: 16, fontWeight: 600 }}>{formatINR(b.amount_inr)}</td>
                    <td style={{ padding: 16 }}><span className={`badge ${paymentStyle[b.payment_status] || 'badge-neutral'}`}>{b.payment_status}</span></td>
                    <td style={{ padding: 16 }}><span className={`badge ${statusStyle[b.status] || 'badge-neutral'}`}>{b.status}</span></td>
                    <td style={{ padding: 16 }}>
                      {b.invoice_pdf_url && <a href={b.invoice_pdf_url} target="_blank" className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem' }}>📄 Invoice</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
