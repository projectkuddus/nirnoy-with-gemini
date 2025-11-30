-- =============================================
-- NIRNOY SIMPLE SCHEMA - For 100+ Users
-- =============================================
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.chambers CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.doctors CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. PROFILES TABLE (All users - patients and doctors)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(20) DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  date_of_birth DATE,
  gender VARCHAR(10),
  blood_group VARCHAR(5),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PATIENTS TABLE (Extended patient info)
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  emergency_contact VARCHAR(20),
  chronic_conditions TEXT[],
  allergies TEXT[],
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  subscription_tier VARCHAR(20) DEFAULT 'premium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DOCTORS TABLE (Extended doctor info)
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  bmdc_number VARCHAR(50) UNIQUE NOT NULL,
  nid_number VARCHAR(20),
  specialties TEXT[],
  qualifications TEXT[],
  institution VARCHAR(255),
  experience_years INTEGER DEFAULT 0,
  consultation_fee INTEGER DEFAULT 500,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  rating DECIMAL(3,2) DEFAULT 0,
  total_patients INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CHAMBERS TABLE (Doctor clinic locations)
CREATE TABLE public.chambers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  area VARCHAR(100),
  city VARCHAR(100) DEFAULT 'Dhaka',
  phone VARCHAR(20),
  fee INTEGER DEFAULT 500,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_doctors_status ON public.doctors(status);
CREATE INDEX idx_doctors_bmdc ON public.doctors(bmdc_number);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chambers ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (allow all operations with anon key)
-- In production, you'd want more restrictive policies
CREATE POLICY "Allow all on profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on doctors" ON public.doctors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chambers" ON public.chambers FOR ALL USING (true) WITH CHECK (true);

-- Success message
SELECT 'Schema created successfully! Tables: profiles, patients, doctors, chambers' as result;
