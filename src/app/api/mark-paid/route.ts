// src/app/api/mark-paid/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Mark as paid
    const { error } = await supabase
      .from('bookings')
      .update({ payment_status: 'paid' })
      .eq('id', bookingId)
      .eq('consultant_id', user.id)

    if (error) throw error

    // Get consultant profile to check if they have GSTIN (invoice eligible)
    const { data: profile } = await supabase
      .from('profiles')
      .select('gstin, plan')
      .eq('id', user.id)
      .single()

    // Trigger invoice generation if consultant has GSTIN and is Pro
    if (profile?.gstin && profile?.plan !== 'free') {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://slotly-two.vercel.app'
      fetch(`${appUrl}/api/generate-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
        // Pass auth cookie
      }).catch(err => console.error('Invoice generation trigger failed:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}