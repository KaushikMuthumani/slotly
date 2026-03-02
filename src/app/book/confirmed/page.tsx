export default async function BookingConfirmedPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ name?: string; date?: string; time?: string; consultant?: string }>
}) {
  const params = await searchParams

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--color-border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 16 }}>S</span>
        </div>
        <span style={{ fontFamily: 'DM Serif Display', fontSize: 18, color: 'var(--color-primary)' }}>Slotly</span>
      </div>
      <div className="page-center" style={{ minHeight: 'calc(100vh - 65px)' }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }} className="animate-in">
          <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
          <h1 style={{ fontSize: '2rem', marginBottom: 12 }}>Booking Confirmed!</h1>
          <p style={{ fontSize: '1.1rem', marginBottom: 32 }}>
            Your appointment has been booked successfully. Check your email for confirmation details.
          </p>
          {(params.consultant || params.date) && (
            <div className="card" style={{ marginBottom: 32, textAlign: 'left' }}>
              {[
                params.consultant && { label: 'Consultant', value: params.consultant },
                params.date && { label: 'Date', value: params.date },
                params.time && { label: 'Time', value: params.time },
              ].filter(Boolean).map((item: any) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.9375rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
                  <span style={{ fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
          <div className="card" style={{ background: 'var(--color-bg-muted)', border: 'none', marginBottom: 24 }}>
            <p style={{ fontSize: '0.9375rem', margin: 0 }}>
              📧 A confirmation email has been sent to your email address.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}