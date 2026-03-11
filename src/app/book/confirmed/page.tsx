// src/app/book/confirmed/page.tsx
import Link from 'next/link'

export default async function BookingConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ consultant?: string; date?: string; time?: string }>
}) {
  const params = await searchParams

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Nav */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 16 }}>S</span>
        </div>
        <span style={{ fontFamily: 'DM Serif Display', fontSize: 18, color: 'var(--color-primary)' }}>zlotra</span>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 65px)', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
          <h1 style={{ marginBottom: 12 }}>Booking Confirmed!</h1>
          <p style={{ fontSize: '1.1rem', marginBottom: 32, color: 'var(--color-text-secondary)' }}>
            Your appointment has been booked successfully. Check your email for confirmation details.
          </p>

          {(params.consultant || params.date) && (
            <div className="card" style={{ marginBottom: 24, textAlign: 'left' }}>
              {[
                params.consultant ? { label: 'Consultant', value: params.consultant } : null,
                params.date ? { label: 'Date', value: params.date } : null,
                params.time ? { label: 'Time', value: params.time } : null,
              ].filter(Boolean).map((item: any) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.9375rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
                  <span style={{ fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: '0.9375rem', color: '#16a34a' }}>
              📧 A confirmation email has been sent to your email address.
            </p>
          </div>

          <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 32 }}>
            <p style={{ margin: 0, fontSize: '0.9375rem', color: '#92400e' }}>
              💳 The consultant will contact you shortly to collect payment.
            </p>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Need to make another booking?{' '}
            <Link href="/" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Go back →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
