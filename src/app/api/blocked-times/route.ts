// src/app/api/blocked-times/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('blocked_times')
    .select('*')
    .eq('user_id', user.id)
    .order('start_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { label, start_time, end_time, applies_to_days } = await request.json()

  if (!label?.trim()) return NextResponse.json({ error: 'Label is required' }, { status: 400 })
  if (!start_time || !end_time) return NextResponse.json({ error: 'Start and end time required' }, { status: 400 })
  if (start_time >= end_time) return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
  if (!applies_to_days?.length) return NextResponse.json({ error: 'Select at least one day' }, { status: 400 })

  const { data, error } = await supabase
    .from('blocked_times')
    .insert({
      user_id: user.id,
      label: label.trim(),
      start_time,
      end_time,
      applies_to_days,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const { error } = await supabase
    .from('blocked_times')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
