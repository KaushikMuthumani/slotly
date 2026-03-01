import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatINR, generateTimeSlots } from '@/lib/utils'
import BookingForm from '@/components/BookingForm'

export default async function BookingPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('slug', params.slug).eq('onboarding_complete', true).single()

  if (!profile) notFound()

  const { data: availability } = await supabase
    .from('availability').select('*').eq('user_id', profile.id).eq('is_active', true)

  const { data: blockedDates } = await supabase
    .from('blocked_dates').select('blocked_date').eq('user_id', profile.id)
    .gte('blocked_date', new Date().toISOString().split('T')[0])

  const { data: existingBookings } = await supabase
    .from('bookings').select('slot_date, slot_time').eq('consultant_id', profile.id)
    .in('status', ['confirmed']).gte('slot_date', new Date().toISOString().split('T')[0])

  const blockedDatesList = blockedDates?.map((b: any) => b.blocked_date) || []
  const bookedSlots = existingBookings?.map((b: any) => `${b.slot_date}_${b.slot_time.slice(0, 5)}`) || []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 16 }}>S</span>
        </div>
        <span style={{ fontFamily: 'DM Serif Display', fontSize: 18, color: 'var(--color-primary)' }}>Slotly</span>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 32, alignItems: 'start' }}>
          <div className="card" style={{ position: 'sticky', top: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 28 }}>
              <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{profile.full_name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 4 }}>{profile.full_name}</h2>
            <p style={{ marginBottom: 16 }}>{profile.profession}</p>
            {profile.bio && <p style={{ fontSize: '0.9375rem', marginBottom: 20, lineHeight: 1.7, paddingBottom: 20, borderBottom: '1px solid var(--color-border)' }}>{profile.bio}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9375rem' }}>💰 Consultation Fee</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>{formatINR(profile.fee_inr)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9375rem' }}>⏱ Duration</span>
                <span style={{ fontWeight: 500 }}>{profile.session_duration} minutes</span>
              </div>
              {profile.gstin && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9375rem' }}>🧾 GST Invoice</span>
                  <span className="badge badge-success">Included</span>
                </div>
              )}
            </div>
          </div>

          <BookingForm
            profile={profile}
            availability={availability || []}
            blockedDates={blockedDatesList}
            bookedSlots={bookedSlots}
          />
        </div>
      </div>
    </div>
  )
}
