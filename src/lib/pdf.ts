// src/lib/pdf.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function uploadInvoiceToStorage(
  supabase: any,
  invoiceHTML: string,
  invoiceNumber: string
): Promise<string | null> {
  try {
    // Use service role client for storage upload to bypass RLS
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const fileName = `${invoiceNumber}.html`
    const htmlBytes = new TextEncoder().encode(invoiceHTML)

    const { error } = await adminClient.storage
      .from('invoices')
      .upload(fileName, htmlBytes, {
        contentType: 'text/html; charset=utf-8',
        upsert: true,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return null
    }

    const { data: urlData } = adminClient.storage
      .from('invoices')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (err) {
    console.error('Upload failed:', err)
    return null
  }
}
