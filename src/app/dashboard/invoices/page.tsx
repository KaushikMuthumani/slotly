// src/app/dashboard/invoices/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatINR } from '@/lib/utils'
import Link from 'next/link'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('plan, gstin').eq('id', user.id).single()

  const { data: invoices } = await supabase
    .from('invoices').select('*').eq('consultant_id', user.id)
    .order('created_at', { ascending: false })

  // Free plan gate
  if (profile?.plan === 'free') {
    return (
      <div>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Invoices</h1>
          <p>Auto-generated GST invoices for all paid bookings.</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--color-primary)', border: 'none' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧾</div>
          <h3 style={{ color: 'white', fontFamily: 'Sora', marginBottom: 8 }}>GST Invoices — Pro Feature</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            Upgrade to Pro to automatically generate GST invoices for every paid booking. Clients get a professional PDF with CGST/SGST breakup instantly.
          </p>
          <button className="btn btn-accent btn-lg">Upgrade to Pro — ₹499/month →</button>
        </div>
      </div>
    )
  }

  // No GSTIN set
  if (!profile?.gstin) {
    return (
      <div>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Invoices</h1>
          <p>Auto-generated GST invoices for all paid bookings.</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ marginBottom: 8 }}>GSTIN Not Set</h3>
          <p style={{ marginBottom: 20, color: 'var(--color-text-secondary)' }}>
            Add your GSTIN in Settings to start generating GST invoices automatically.
          </p>
          <Link href="/dashboard/settings" className="btn btn-primary">Go to Settings →</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Invoices</h1>
        <p>All GST invoices generated for paid bookings.</p>
      </div>

      {!invoices || invoices.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <h3 style={{ marginBottom: 8 }}>No invoices yet</h3>
          <p>Invoices are generated automatically when you mark a booking as paid.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {invoices.map((inv: any) => (
            <div key={inv.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4, fontFamily: 'monospace', fontSize: '1rem' }}>
                  {inv.invoice_number}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                  {inv.client_name} · {inv.client_email}
                </p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  {new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatINR(inv.total_inr)}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Base: {formatINR(inv.subtotal_inr)} + GST: {formatINR(inv.cgst_amount + inv.sgst_amount)}
                  </p>
                </div>
                {inv.pdf_url && (
                  <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    📄 View Invoice
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
