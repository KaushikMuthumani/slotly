// src/app/book/[slug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatINR } from '@/lib/utils'
import BookingForm from '@/components/BookingForm'

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('slug', slug).eq('onboarding_complete', true).single()

  if (!profile) notFound()

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: availability },
    { data: blockedDatesRaw },
    { data: existingBookings },
    { data: blockedTimes },
  ] = await Promise.all([
    supabase.from('availability').select('*').eq('user_id', profile.id).eq('is_active', true),
    supabase.from('blocked_dates')
      .select('blocked_date, block_start_time, block_end_time')
      .eq('user_id', profile.id)
      .gte('blocked_date', today),
    supabase.from('bookings')
      .select('slot_date, slot_time')
      .eq('consultant_id', profile.id)
      .eq('status', 'confirmed')
      .gte('slot_date', today),
    supabase.from('blocked_times')
      .select('*')
      .eq('user_id', profile.id),
  ])

  // Full-day blocked dates (no start/end time)
  const fullyBlockedDates = blockedDatesRaw
    ?.filter((b: any) => !b.block_start_time)
    .map((b: any) => b.blocked_date) || []

  // Partial blocks (specific hours on a specific date)
  const partialBlocks = blockedDatesRaw
    ?.filter((b: any) => b.block_start_time && b.block_end_time)
    .map((b: any) => ({
      date: b.blocked_date,
      start: b.block_start_time.slice(0, 5),
      end: b.block_end_time.slice(0, 5),
    })) || []

  // Already booked slot strings: "YYYY-MM-DD_HH:MM"
  const bookedSlots = existingBookings
    ?.map((b: any) => `${b.slot_date}_${b.slot_time.slice(0, 5)}`) || []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Nav */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 16 }}>S</span>
        </div>
        <span style={{ fontFamily: 'DM Serif Display', fontSize: 18, color: 'var(--color-primary)' }}>Slotly</span>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 28, alignItems: 'start' }}>

          {/* Profile card */}
          <div className="card" style={{ position: 'sticky', top: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 26 }}>{profile.full_name?.charAt(0)?.toUpperCase()}</span>
              }
            </div>
            <h2 style={{ fontSize: '1.375rem', marginBottom: 4 }}>{profile.full_name}</h2>
            <p style={{ marginBottom: 16, color: 'var(--color-text-secondary)' }}>{profile.profession}</p>

            {profile.bio && (
              <p style={{ fontSize: '0.9rem', marginBottom: 18, lineHeight: 1.7, paddingBottom: 18, borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                {profile.bio}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem' }}>💰 Fee</span>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-primary)' }}>{formatINR(profile.fee_inr)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem' }}>⏱ Duration</span>
                <span style={{ fontWeight: 500 }}>{profile.session_duration} min</span>
              </div>
              {profile.gstin && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem' }}>🧾 GST Invoice</span>
                  <span className="badge badge-success">Included</span>
                </div>
              )}
            </div>
          </div>

          {/* Booking form */}
          <BookingForm
            profile={profile}
            availability={availability || []}
            blockedDates={fullyBlockedDates}
            partialBlocks={partialBlocks}
            bookedSlots={bookedSlots}
            blockedTimes={blockedTimes || []}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 280px"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="position: sticky"] {
            position: static !important;
          }
        }
      `}</style>
    </div>
  )
}
