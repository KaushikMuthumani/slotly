import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_complete) redirect('/onboarding')

  // Navigation items (can be used later inside the sidebar if needed)
  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { href: '/dashboard/bookings', label: 'Bookings', icon: '📅' },
    { href: '/dashboard/invoices', label: 'Invoices', icon: '🧾' },
    { href: '/dashboard/availability', label: 'Availability', icon: '🕐' },
    { href: '/dashboard/briefs', label: 'AI Briefs', icon: '🤖' },
    { href: '/dashboard/pricing', label: 'Dynamic Pricing', icon: '💰' },
    { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--color-bg)',
      }}
    >
      <DashboardSidebar profile={profile} />

      <main
        style={{
          flex: 1,
          padding: '32px',
          overflow: 'auto',
        }}
        className="dashboard-main"
      >
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .dashboard-main {
            padding: 80px 16px 24px !important;
          }
        }
      `}</style>
    </div>
  )
}