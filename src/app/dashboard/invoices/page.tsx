import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('gstin, plan')
    .eq('id', user.id)
    .single()

  const { data: raw } = await supabase
    .from('bookings')
    .select('id, client_name, client_email, slot_date, slot_time, duration_minutes, amount_inr, invoice_number, invoice_pdf_url, created_at')
    .eq('consultant_id', user.id)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  const bookings = (raw || []) as any[]

  const totalRevenue = bookings.reduce((s: number, b: any) => s + (Number(b.amount_inr) || 0), 0)
  const totalStr = '₹' + totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })
  const pdfCount = bookings.filter((b: any) => !!b.invoice_pdf_url).length

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Invoices</h1>
        <p>All paid bookings and their GST invoices.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div className="card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>🧾</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{bookings.length}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Paid Bookings</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>💰</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalStr}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Total Revenue</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 22, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{pdfCount}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>PDFs Generated</div>
        </div>
      </div>

      {bookings.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
          <h3 style={{ marginBottom: 8 }}>No paid bookings yet</h3>
          <p>Mark a booking as paid from the <Link href="/dashboard/bookings">Bookings page</Link>.</p>
        </div>
      )}

      {bookings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bookings.map((b: any) => {
            const d = b.slot_date ? new Date(b.slot_date) : new Date()
            const mon = d.toLocaleDateString('en-IN', { month: 'short' })
            const day = d.getDate()
            const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            const [hh, mm] = (b.slot_time || '00:00').slice(0, 5).split(':').map(Number)
            const timeStr = (hh % 12 || 12) + ':' + String(mm).padStart(2, '0') + ' ' + (hh >= 12 ? 'PM' : 'AM')
            const amtStr = '₹' + Number(b.amount_inr).toLocaleString('en-IN', { minimumFractionDigits: 2 })

            return (
              <div key={b.id} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>

                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-bg-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{mon}</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>{day}</span>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: 2 }}>{b.client_name}</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 2 }}>{b.client_email}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{dateStr} · {timeStr} · {b.duration_minutes} min</p>
                      {b.invoice_number && (
                        <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)', marginTop: 2 }}>{b.invoice_number}</p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '1.1rem', textAlign: 'right' }}>{amtStr}</p>
                      <span className="badge badge-success">✓ Paid</span>
                    </div>
                    {b.invoice_pdf_url
                      ? <a href={b.invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">📄 PDF</a>
                      : <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{profile?.gstin ? 'No PDF' : 'Add GSTIN'}</span>
                    }
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