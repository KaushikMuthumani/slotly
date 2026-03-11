// src/app/api/pricing-rules/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('user_id', user.id)
    .order('priority', { ascending: false })

  return NextResponse.json({ rules: data || [] })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('pricing_rules')
      .insert({ ...body, user_id: user.id })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ rule: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('pricing_rules').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ success: true })
}

// Utility: calculate price for a given slot datetime
export function calculateSlotPrice(
  basePrice: number,
  slotDate: string,
  slotTime: string,
  rules: any[]
): number {
  if (!rules || rules.length === 0) return basePrice

  const slotDt = new Date(`${slotDate}T${slotTime}`)
  const hour = slotDt.getHours()
  const dayOfWeek = slotDt.getDay()
  const now = new Date()
  const hoursUntilSlot = (slotDt.getTime() - now.getTime()) / (1000 * 60 * 60)

  let price = basePrice
  const activeRules = rules
    .filter(r => r.is_active)
    .sort((a, b) => b.priority - a.priority)

  for (const rule of activeRules) {
    let applies = false

    if (rule.rule_type === 'time_based' && rule.start_hour != null && rule.end_hour != null) {
      applies = hour >= rule.start_hour && hour < rule.end_hour
    } else if (rule.rule_type === 'day_based' && rule.applies_to_days) {
      applies = rule.applies_to_days.includes(dayOfWeek)
    } else if (rule.rule_type === 'last_minute' && rule.last_minute_hours) {
      applies = hoursUntilSlot <= rule.last_minute_hours && hoursUntilSlot > 0
    } else if (rule.rule_type === 'base') {
      applies = true
    }

    if (applies) {
      if (rule.price_type === 'fixed') price = rule.price_value
      else if (rule.price_type === 'multiplier') price = price * rule.price_value
      else if (rule.price_type === 'add') price = price + rule.price_value
    }
  }

  return Math.round(price)
}
