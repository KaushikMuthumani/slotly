export type Profession = 'CA' | 'Lawyer' | 'Designer' | 'Consultant' | 'Other'
export type Plan = 'free' | 'pro' | 'growth'
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  profession: Profession | null
  phone: string | null
  gstin: string | null
  slug: string | null
  fee_inr: number
  session_duration: number
  cancellation_hours: number
  bio: string | null
  onboarding_complete: boolean
  google_calendar_connected: boolean
  plan: Plan
  created_at: string
  updated_at: string
}

export interface Availability {
  id: string
  user_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

export interface BlockedDate {
  id: string
  user_id: string
  blocked_date: string
  reason: string | null
}

export interface Booking {
  id: string
  consultant_id: string
  client_name: string
  client_email: string
  client_phone: string | null
  client_gstin: string | null
  slot_date: string
  slot_time: string
  duration_minutes: number
  amount_inr: number
  payment_status: PaymentStatus
  payment_id: string | null
  payment_order_id: string | null
  status: BookingStatus
  invoice_number: string | null
  invoice_pdf_url: string | null
  client_notes: string | null
  consultant_notes: string | null
  meeting_link: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  booking_id: string
  consultant_id: string
  invoice_number: string
  invoice_date: string
  consultant_name: string
  consultant_gstin: string | null
  client_name: string
  client_email: string
  client_gstin: string | null
  subtotal_inr: number
  cgst_rate: number
  sgst_rate: number
  igst_rate: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_inr: number
  service_description: string
  sac_code: string
  pdf_url: string | null
  created_at: string
}
