import { createClient } from '@/lib/supabase/server'
import { formatINR, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('plan, gstin').eq('id', user!.id).single()
  const { data: invoices } = await supabase.from('invoices').select('*').eq('consultant_id', user!.id).order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Invoices</h1>
        <p>Auto-generated GST invoices for all paid bookings.</p>
      </div>
      {profile?.plan === 'free' ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px', background: 'linear-gradient(135deg, var(--color-primary) 0%, #2d2d5e 100%)', border: 'none' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
          <h3 style={{ color: 'white', marginBottom: 12 }}>GST Invoices — Pro Feature</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Upgrade to Pro to automatically generate GST invoices for every paid booking. Clients get a professional PDF with CGST/SGST breakup instantly.
          </p>
          <button className="btn btn-accent btn-lg">Upgrade to Pro — ₹499/month →</button>
        </div>
      ) : (
        <>
          {!profile?.gstin && (
            <div className="alert alert-warning" style={{ marginBottom: 24 }}>
              <span>⚠️</span> You haven't added your GSTIN yet. Go to <Link href="/dashboard/settings" style={{ fontWeight: 600 }}>Settings</Link> to add it.
            </div>
          )}
          {!invoices || invoices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <h3 style={{ marginBottom: 8 }}>No invoices yet</h3>
              <p>Invoices appear automatically when clients make paid bookings.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-muted)' }}>
                      {['Invoice No.', 'Client', 'Date', 'Amount', 'GST', 'Total', ''].map(h => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv: any, i: number) => (
                      <tr key={inv.id} style={{ borderBottom: i < invoices.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <td style={{ padding: 16, fontWeight: 600, fontFamily: 'monospace', fontSize: '0.875rem' }}>{inv.invoice_number}</td>
                        <td style={{ padding: 16 }}>
                          <p style={{ fontWeight: 500 }}>{inv.client_name}</p>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{inv.client_email}</p>
                        </td>
                        <td style={{ padding: 16, color: 'var(--color-text-secondary)' }}>{formatDate(inv.invoice_date)}</td>
                        <td style={{ padding: 16 }}>{formatINR(inv.subtotal_inr)}</td>
                        <td style={{ padding: 16, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                          {inv.igst_amount > 0 ? `IGST: ${formatINR(inv.igst_amount)}` : `CGST+SGST: ${formatINR(inv.cgst_amount + inv.sgst_amount)}`}
                        </td>
                        <td style={{ padding: 16, fontWeight: 700 }}>{formatINR(inv.total_inr)}</td>
                        <td style={{ padding: 16 }}>
                          {inv.pdf_url ? <a href={inv.pdf_url} target="_blank" className="btn btn-outline btn-sm">📄 Download</a> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>Generating...</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
