// src/app/api/upload-photo/route.ts
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('photo') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Validate file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 2MB' }, { status: 400 })
    }

    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await adminClient.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) throw new Error('Upload failed: ' + uploadError.message)

    const { data: urlData } = adminClient.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Add cache buster so new photo shows immediately
    const photoUrl = urlData.publicUrl + '?t=' + Date.now()

    await supabase.from('profiles').update({ avatar_url: photoUrl }).eq('id', user.id)

    return NextResponse.json({ success: true, photoUrl })
  } catch (error: any) {
    console.error('upload-photo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
