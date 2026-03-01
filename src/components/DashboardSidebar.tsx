'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '🏠' },
  { href: '/dashboard/bookings', label: 'Bookings', icon: '📅' },
  { href: '/dashboard/availability', label: 'Availability', icon: '🕐' },
  { href: '/dashboard/invoices', label: 'Invoices', icon: '🧾' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
]

export default function DashboardSidebar({ profile }: { profile: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside style={{ width: 260, minHeight: '100vh', background: 'white', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 18 }}>S</span>
          </div>
          <span style={{ fontFamily: 'DM Serif Display', fontSize: 20, color: 'var(--color-primary)' }}>Slotly</span>
        </Link>
      </div>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 18 }}>{profile.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
        </div>
        <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 2 }}>{profile.full_name}</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>{profile.profession}</p>
        <span className={`badge ${profile.plan === 'free' ? 'badge-neutral' : 'badge-warning'}`}>{profile.plan?.toUpperCase()} PLAN</span>
      </div>
      <nav style={{ flex: 1, padding: '12px' }}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 'var(--radius-md)', marginBottom: 4, background: isActive ? 'var(--color-primary)' : 'transparent', color: isActive ? 'white' : 'var(--color-text-secondary)', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: isActive ? 600 : 400, transition: 'all 0.15s' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span>{item.label}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)' }}>
        <a href={`/book/${profile.slug}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-muted)', textDecoration: 'none', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: 8 }}>
          <span>🔗</span> View booking page
        </a>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontWeight: 500, width: '100%', textAlign: 'left' }}>
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  )
}
