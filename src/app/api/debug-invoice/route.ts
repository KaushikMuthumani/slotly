// src/app/api/debug-invoice/route.ts
// TEMPORARY DEBUG ENDPOINT — DELETE AFTER FIXING
// Visit: https://slotly-two.vercel.app/api/debug-invoice
// This will tell you EXACTLY what is broken

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, any> = {}

  // 1. Check env vars
  results.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    SERVICE_ROLE_KEY_LENGTH: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
  }

  // 2. Check user auth
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    results.auth = {
      loggedIn: !!user,
      userId: user?.id || null,
      error: error?.message || null,
    }
  } catch (e: any) {
    results.auth = { error: e.message }
  }

  // 3. Check if service role client works
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      results.serviceRoleClient = { error: 'Missing env vars' }
    } else {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      )
      // Try a simple query to verify the key works
      const { data, error } = await admin.from('profiles').select('id').limit(1)
      results.serviceRoleClient = {
        works: !error,
        error: error?.message || null,
      }
    }
  } catch (e: any) {
    results.serviceRoleClient = { error: e.message }
  }

  // 4. Check storage buckets exist
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: buckets, error } = await admin.storage.listBuckets()
    results.storage = {
      error: error?.message || null,
      buckets: buckets?.map(b => ({ name: b.name, public: b.public })) || [],
      invoicesBucketExists: buckets?.some(b => b.name === 'invoices') || false,
      invoicesBucketIsPublic: buckets?.find(b => b.name === 'invoices')?.public || false,
    }
  } catch (e: any) {
    results.storage = { error: e.message }
  }

  // 5. Try uploading a test file to invoices bucket
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const testContent = Buffer.from('test-upload-' + Date.now())
    const { data: uploadData, error: uploadError } = await admin.storage
      .from('invoices')
      .upload('_debug_test.txt', testContent, {
        contentType: 'text/plain',
        upsert: true,
      })

    if (uploadError) {
      results.testUpload = { success: false, error: uploadError.message, details: uploadError }
    } else {
      const { data: urlData } = admin.storage.from('invoices').getPublicUrl('_debug_test.txt')
      results.testUpload = {
        success: true,
        path: uploadData?.path,
        publicUrl: urlData?.publicUrl,
      }
      // Clean up
      await admin.storage.from('invoices').remove(['_debug_test.txt'])
    }
  } catch (e: any) {
    results.testUpload = { error: e.message }
  }

  // 6. Check if @react-pdf/renderer is installed
  try {
    const pdfModule = await import('@react-pdf/renderer')
    results.reactPdf = {
      installed: true,
      hasPdf: typeof pdfModule.pdf === 'function',
      hasDocument: !!pdfModule.Document,
    }
  } catch (e: any) {
    results.reactPdf = {
      installed: false,
      error: e.message,
    }
  }

  // 7. Try generating a minimal PDF
  try {
    const { pdf, Document, Page, Text, View } = await import('@react-pdf/renderer')
    const React = await import('react')

    const TestDoc = () =>
      React.createElement(Document, null,
        React.createElement(Page, { size: 'A4' },
          React.createElement(View, null,
            React.createElement(Text, null, 'Test Invoice')
          )
        )
      )

    const buffer = await pdf(React.createElement(TestDoc)).toBuffer()
    results.pdfGeneration = {
      success: true,
      bufferSize: buffer.length,
      isBuffer: Buffer.isBuffer(buffer),
    }
  } catch (e: any) {
    results.pdfGeneration = {
      success: false,
      error: e.message,
    }
  }

  // 8. Check Resend API key validity
  try {
    if (!process.env.RESEND_API_KEY) {
      results.resend = { error: 'RESEND_API_KEY not set' }
    } else {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
      })
      results.resend = {
        status: res.status,
        keyWorks: res.status === 200,
        error: res.status !== 200 ? `HTTP ${res.status}` : null,
      }
    }
  } catch (e: any) {
    results.resend = { error: e.message }
  }

  // 9. Check any booking exists for this consultant
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('gstin, plan, full_name').eq('id', user.id).single()
      const { data: bookings } = await supabase.from('bookings').select('id, payment_status, invoice_pdf_url, invoice_number').eq('consultant_id', user.id).limit(3)
      results.yourData = {
        profile: { hasGstin: !!profile?.gstin, plan: profile?.plan, name: profile?.full_name },
        recentBookings: bookings?.map(b => ({
          id: b.id.slice(0, 8),
          payment_status: b.payment_status,
          has_invoice_url: !!b.invoice_pdf_url,
          invoice_number: b.invoice_number,
        })),
      }
    }
  } catch (e: any) {
    results.yourData = { error: e.message }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
    summary: {
      envVarsOk: results.env?.SUPABASE_SERVICE_ROLE_KEY && results.env?.RESEND_API_KEY,
      storageOk: results.testUpload?.success === true,
      pdfOk: results.pdfGeneration?.success === true,
      resendOk: results.resend?.keyWorks === true,
      serviceRoleOk: results.serviceRoleClient?.works === true,
    }
  }, { status: 200 })
}
