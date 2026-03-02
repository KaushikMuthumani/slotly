import Link from 'next/link'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://slotly-two.vercel.app'

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--color-border)', background: 'white', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 18 }}>S</span>
          </div>
          <span style={{ fontFamily: 'DM Serif Display', fontSize: 22, color: 'var(--color-primary)' }}>Slotly</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/auth/login" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link href="/auth/signup" className="btn btn-accent btn-sm">Get Started Free</Link>
        </div>
      </nav>

      <section style={{ textAlign: 'center', padding: '100px 24px 80px', maxWidth: 760, margin: '0 auto' }}>
        <div className="badge badge-warning" style={{ marginBottom: 20, display: 'inline-flex' }}>🇮🇳 Built for Indian Professionals</div>
        <h1 style={{ marginBottom: 24 }}>Bookings. Payments. GST Invoices. <em>Automatically.</em></h1>
        <p style={{ fontSize: '1.2rem', marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
          Share one link. Clients book a slot, pay via UPI, and get a GST invoice instantly. Built for CAs, Lawyers, and Designers across India.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/signup" className="btn btn-primary btn-lg">Start for Free →</Link>
          <Link href="/auth/login" className="btn btn-outline btn-lg">Sign In</Link>
        </div>
        <p style={{ marginTop: 16, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Free plan available · No credit card required · Setup in 5 minutes</p>
      </section>

      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {[
            { icon: '📅', title: 'One Booking Link', desc: 'Share your personal link everywhere. Clients pick a slot from your real availability. Zero back-and-forth on WhatsApp.' },
            { icon: '💸', title: 'UPI Payment at Booking', desc: 'Clients pay before confirming. Integrated with Razorpay — UPI, cards, net banking. Money directly in your bank.' },
            { icon: '🧾', title: 'Auto GST Invoice', desc: 'Every paid booking generates a proper GST invoice PDF with GSTIN, CGST/SGST breakup, SAC code — sent instantly.' },
            { icon: '📧', title: 'Automated Reminders', desc: 'Booking confirmation, 24-hour reminder, and 1-hour reminder sent automatically. No manual follow-up needed.' },
            { icon: '📆', title: 'Google Calendar Sync', desc: 'Connect your Google Calendar. Existing events block your slots automatically. No double bookings ever.' },
            { icon: '⚡', title: 'INR & GST Ready', desc: 'Everything in rupees. GST invoice as per Indian standards. Designed for Indian professionals from the ground up.' },
          ].map((f, i) => (
            <div key={i} className="card card-hover" style={{ padding: 28 }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <h4 style={{ marginBottom: 8, fontFamily: 'Sora', fontWeight: 600 }}>{f.title}</h4>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 24px', background: 'white', textAlign: 'center' }}>
        <h2 style={{ marginBottom: 12 }}>Simple, Honest Pricing</h2>
        <p style={{ marginBottom: 48 }}>In rupees. With GST invoice. Obviously.</p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 760, margin: '0 auto' }}>
          <div className="card" style={{ flex: 1, minWidth: 280, maxWidth: 340, textAlign: 'left' }}>
            <div className="badge badge-neutral" style={{ marginBottom: 16 }}>Free</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'DM Serif Display', marginBottom: 4 }}>₹0</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 24 }}>Forever free</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {['10 bookings/month', '1 service type', 'Email confirmations', 'Basic booking page'].map(f => (
                <li key={f} style={{ fontSize: '0.9375rem', display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--color-success)' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup" className="btn btn-outline btn-full">Get Started</Link>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 280, maxWidth: 340, textAlign: 'left', border: '2px solid var(--color-primary)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -13, left: 20, background: 'var(--color-accent)', color: 'var(--color-primary)', padding: '4px 14px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 700 }}>MOST POPULAR</div>
            <div className="badge badge-warning" style={{ marginBottom: 16 }}>Pro</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'DM Serif Display', marginBottom: 4 }}>₹499</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 24 }}>per month + GST</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {['Unlimited bookings', 'Auto GST invoice PDF', 'UPI + Card payments', 'Google Calendar sync', 'Remove Slotly branding', 'Cancellation management', 'Priority email support'].map(f => (
                <li key={f} style={{ fontSize: '0.9375rem', display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--color-success)' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup" className="btn btn-primary btn-full">Start Free Trial</Link>
          </div>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--color-text-muted)', fontSize: '0.875rem', borderTop: '1px solid var(--color-border)' }}>
        <p>© 2025 Slotly. Made with ❤️ in India.</p>
      </footer>
    </div>
  )
}
