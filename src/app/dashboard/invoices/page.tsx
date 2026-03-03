import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('gstin, plan, full_name')
    .eq('id', user.id)
    .single()

  const { data: paidBookings } = await supabase
    .from('bookings')
    .select('id, client_name, client_email, slot_date, slot_time, duration_minutes, amount_inr, invoice_number, invoice_pdf_url, created_at')
    .eq('consultant_id', user.id)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  const bookings = paidBookings || []
  const totalRevenue = bookings.reduce((s: number, b: any) => s + (Number(b.amount_inr) || 0), 0)
  const pdfCount = bookings.filter((b: any) => b.invoice_pdf_url).length

  function formatINR(n: number) {
    return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  }
  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  function fmtTime(t: string) {
    const [h, m] = (t || '00:00').slice(0, 5).split(':').map(Number)
    return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM')
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Invoices</h1>
        <p>All paid bookings and their GST invoices.</p>
      </div>

      {!profile?.gstin && (
        <div className="alert alert-warning" style={{ marginBottom: 24 }}>
          <span>⚠️</span>
          <span>Add your GSTIN in <Link href="/dashboard/settings" style={{ fontWeight: 600 }}>Settings</Link> to auto-generate GST invoices.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>🧾</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'DM Serif Display' }}>{bookings.length}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Paid Bookings</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'DM Serif Display' }}>{formatINR(totalRevenue)}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Total Revenue</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'DM Serif Display' }}>{pdfCount}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>PDFs Generated</div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
          <h3 style={{ marginBottom: 8 }}>No paid bookings yet</h3>
          <p>Mark a booking as paid from the <Link href="/dashboard/bookings" style={{ fontWeight: 600 }}>Bookings page</Link>.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map((b: any) => {
            const slotDate = b.slot_date || ''
            const slotTime = b.slot_time || ''
            const monthStr = slotDate ? new Date(slotDate).toLocaleDateString('en-IN', { month: 'short' }) : ''
            const dayNum = slotDate ? new Date(slotDate).getDate() : ''
            return (
              <div key={b.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-bg-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{monthStr}</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{dayNum}</span>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 2 }}>{b.client_name}</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 2 }}>{b.client_email}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                        {fmtDate(slotDate)} · {fmtTime(slotTime)} · {b.duration_minutes} min
                      </p>
                      {b.invoice_number ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>{b.invoice_number}</p>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatINR(b.amount_inr)}</p>
                      <span className="badge badge-success">✓ Paid</span>
                    </div>
                    {b.invoice_pdf_url ? (
                      <a>
                        href={b.invoice_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}
                      
                        📄 Download PDF
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        {profile?.gstin ? 'No PDF' : 'Add GSTIN'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}