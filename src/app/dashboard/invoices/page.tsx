import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatINR } from '@/lib/utils'
import Link from 'next/link'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('gstin, plan, full_name').eq('id', user.id).single()

  // Fetch paid bookings that have an invoice URL — this is the source of truth
  const { data: paidBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('consultant_id', user.id)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const formatTime = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number)
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
  }

  const totalRevenue = paidBookings?.reduce((s, b) => s + (b.amount_inr || 0), 0) || 0

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Invoices</h1>
        <p>All paid bookings and their GST invoices.</p>
      </div>

      {!profile?.gstin && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          <span>⚠️</span>
          <span>
            Add your GSTIN in <Link href="/dashboard/settings" style={{ fontWeight: 600 }}>Settings</Link> to generate GST invoices automatically when you mark a booking as paid.
          </span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>🧾</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'DM Serif Display' }}>{paidBookings?.length || 0}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Paid Bookings</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'DM Serif Display' }}>{formatINR(totalRevenue)}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Total Revenue</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'DM Serif Display' }}>
            {paidBookings?.filter(b => b.invoice_pdf_url).length || 0}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>PDFs Generated</div>
        </div>
      </div>

      {/* Invoice list */}
      {!paidBookings || paidBookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
          <h3 style={{ marginBottom: 8 }}>No paid bookings yet</h3>
          <p>Mark a booking as paid from the <Link href="/dashboard/bookings" style={{ fontWeight: 600 }}>Bookings page</Link> to generate an invoice.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {paidBookings.map((b: any) => (
            <div key={b.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {/* Date badge */}
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-bg-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {new Date(b.slot_date).toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>
                    {new Date(b.slot_date).getDate()}
                  </span>
                </div>

                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 2 }}>{b.client_name}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 2 }}>{b.client_email}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    {formatDate(b.slot_date)} · {formatTime(b.slot_time)} · {b.duration_minutes} min
                  </p>
                  {b.invoice_number && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                      {b.invoice_number}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatINR(b.amount_inr)}</p>
                  <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>✓ Paid</span>
                </div>

                {b.invoice_pdf_url ? (
                  <a>
                    href={b.invoice_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}
                  
                    📄 Download Invoice
                  </a>
                ) : profile?.gstin ? (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    No PDF yet
                  </span>
                ) : (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Add GSTIN for PDF
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}