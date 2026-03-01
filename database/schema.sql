-- =============================================
-- SLOTLY - Complete Database Schema
-- Run this ONCE in Supabase SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  profession TEXT CHECK (profession IN ('CA', 'Lawyer', 'Designer', 'Consultant', 'Other')),
  phone TEXT,
  gstin TEXT,
  slug TEXT UNIQUE,
  fee_inr INTEGER DEFAULT 500,
  session_duration INTEGER DEFAULT 60,
  cancellation_hours INTEGER DEFAULT 24,
  bio TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  google_calendar_connected BOOLEAN DEFAULT FALSE,
  google_refresh_token TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'growth')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BLOCKED DATES TABLE
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  consultant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_gstin TEXT,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  amount_inr INTEGER NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_id TEXT,
  payment_order_id TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  invoice_number TEXT UNIQUE,
  invoice_pdf_url TEXT,
  client_notes TEXT,
  consultant_notes TEXT,
  meeting_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  consultant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  consultant_name TEXT NOT NULL,
  consultant_gstin TEXT,
  consultant_address TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_gstin TEXT,
  subtotal_inr INTEGER NOT NULL,
  cgst_rate DECIMAL(5,2) DEFAULT 9.00,
  sgst_rate DECIMAL(5,2) DEFAULT 9.00,
  igst_rate DECIMAL(5,2) DEFAULT 0.00,
  cgst_amount INTEGER DEFAULT 0,
  sgst_amount INTEGER DEFAULT 0,
  igst_amount INTEGER DEFAULT 0,
  total_inr INTEGER NOT NULL,
  service_description TEXT DEFAULT 'Professional Consultation Services',
  sac_code TEXT DEFAULT '9983',
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Anyone can view public profiles" ON public.profiles FOR SELECT USING (onboarding_complete = TRUE);

-- AVAILABILITY POLICIES
CREATE POLICY "Consultants manage own availability" ON public.availability FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view availability" ON public.availability FOR SELECT USING (is_active = TRUE);

-- BLOCKED DATES POLICIES
CREATE POLICY "Consultants manage own blocked dates" ON public.blocked_dates FOR ALL USING (auth.uid() = user_id);

-- BOOKINGS POLICIES
CREATE POLICY "Consultants view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = consultant_id);
CREATE POLICY "Consultants update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = consultant_id);
CREATE POLICY "Anyone can create booking" ON public.bookings FOR INSERT WITH CHECK (TRUE);

-- INVOICES POLICIES
CREATE POLICY "Consultants view own invoices" ON public.invoices FOR SELECT USING (auth.uid() = consultant_id);
CREATE POLICY "System can insert invoices" ON public.invoices FOR INSERT WITH CHECK (TRUE);

-- AUTO CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AUTO UPDATE updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- INVOICE NUMBER SEQUENCE
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SLY-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

SELECT 'Slotly database ready!' AS status;
