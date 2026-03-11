import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatINR, formatTime, getGreeting } from '@/lib/utils'
import CopyLinkButton from '@/components/CopyLinkButton'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const today = new Date().toISOString().split('T')[0]
  const { data: upcomingBookings } = await supabase
    .from('bookings').select('*').eq('consultant_id', user.id)
    .eq('status', 'confirmed').gte('slot_date', today)
    .order('slot_date', { ascending: true }).limit(5)

  const startOfMonth = new Date(); startOfMonth.setDate(1)
  const { data: monthBookings } = await supabase
    .from('bookings').select('amount_inr, payment_status')
    .eq('consultant_id', user.id).gte('created_at', startOfMonth.toISOString())

  const earned = monthBookings?.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.amount_inr, 0) || 0
  const totalBookings = monthBookings?.length || 0

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zlotra.vercel.app'
  const bookingUrl = `${appUrl}/book/${profile?.slug}`

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Good {getGreeting()}, {profile?.full_name?.split(' ')[0]} 👋</h1>
        <p>Here's what's happening with your bookings today.</p>
      </div>

      <div className="card" style={{ marginBottom: 28, background: 'var(--color-primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: 4 }}>Your booking link</p>
          <p style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '1rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {bookingUrl}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <CopyLinkButton url={bookingUrl} />
          <a href={`/book/${profile?.slug}`} target="_blank" rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}>
            Preview →
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Bookings This Month', value: totalBookings, icon: '📅', note: 'confirmed appointments' },
          { label: 'Earned This Month', value: formatINR(earned), icon: '💰', note: 'from paid bookings' },
          { label: 'Consultation Fee', value: formatINR(profile?.fee_inr || 0), icon: '💼', note: 'per session' },
          { label: 'Plan', value: profile?.plan?.toUpperCase() || 'FREE', icon: '⭐', note: profile?.plan === 'free' ? 'Upgrade for GST invoices' : 'All features active' },
        ].map(stat => (
          <div key={stat.label} className="card">
            <div style={{ fontSize: 24, marginBottom: 10 }}>{stat.icon}</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'DM Serif Display', marginBottom: 4 }}>{stat.value}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{stat.label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{stat.note}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Upcoming Bookings</h3>
          <Link href="/dashboard/bookings" style={{ fontSize: '0.875rem', fontWeight: 600 }}>View all →</Link>
        </div>
        {!upcomingBookings || upcomingBookings.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <h4 style={{ marginBottom: 8, fontFamily: 'Sora', fontWeight: 600 }}>No upcoming bookings yet</h4>
            <p style={{ marginBottom: 20 }}>Share your booking link to start receiving appointments.</p>
            <CopyLinkButton url={bookingUrl} label="Copy Booking Link" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingBookings.map((booking: any) => (
              <div key={booking.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--color-bg-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {new Date(booking.slot_date).toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>
                      {new Date(booking.slot_date).getDate()}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{booking.client_name}</p>
                    <p style={{ fontSize: '0.875rem' }}>{formatTime(booking.slot_time)} · {booking.duration_minutes} min</p>
                    {booking.client_notes && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>"{booking.client_notes}"</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`badge ${booking.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                    {booking.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
                  </span>
                  <span style={{ fontWeight: 600 }}>{formatINR(booking.amount_inr)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {profile?.plan === 'free' && (
        <div className="card" style={{ marginTop: 32, background: 'linear-gradient(135deg, var(--color-primary) 0%, #2d2d5e 100%)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h4 style={{ color: 'white', fontFamily: 'Sora', fontWeight: 600, marginBottom: 4 }}>Upgrade to Pro</h4>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>Get GST invoices, unlimited bookings, and Google Calendar sync for ₹499/month.</p>
          </div>
          <button className="btn btn-accent">Upgrade Now →</button>
        </div>
      )}
    </div>
  )
}
