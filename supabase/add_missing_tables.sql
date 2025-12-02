-- ==============================================
-- NIRNOY HEALTH APP - ADD MISSING TABLES
-- ==============================================
-- Safe to run - uses IF NOT EXISTS
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================
-- DOCTORS (if not exists)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    bmdc_number VARCHAR(50) UNIQUE,
    nid_number VARCHAR(20),
    degrees TEXT[],
    specialties TEXT[],
    experience_years INTEGER DEFAULT 0,
    bio TEXT,
    bio_bn TEXT,
    consultation_fee INTEGER DEFAULT 0,
    follow_up_fee INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_patients INTEGER DEFAULT 0,
    languages TEXT[] DEFAULT ARRAY['Bangla', 'English'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- CHAMBERS (Doctor practice locations)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.chambers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    area VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Dhaka',
    phone VARCHAR(20),
    fee INTEGER DEFAULT 0,
    follow_up_fee INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    has_parking BOOLEAN DEFAULT FALSE,
    has_ac BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- SCHEDULES (Doctor availability)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamber_id UUID REFERENCES public.chambers(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 15,
    max_patients INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==============================================
-- FAMILY MEMBERS
-- ==============================================

CREATE TABLE IF NOT EXISTS public.family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relation VARCHAR(50) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    blood_group VARCHAR(5),
    phone VARCHAR(20),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- CONSULTATIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    diagnosis TEXT,
    diagnosis_bn TEXT,
    examination_notes TEXT,
    vitals JSONB,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- PRESCRIPTIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    medicines JSONB NOT NULL DEFAULT '[]',
    tests_advised TEXT[],
    advice TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- REVIEWS (Doctor reviews)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- AI CONVERSATIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    conversation_type VARCHAR(20) DEFAULT 'health',
    messages JSONB NOT NULL DEFAULT '[]',
    context JSONB,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- FEEDBACK (if columns differ, this will be skipped)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'general',
    mood VARCHAR(10) DEFAULT 'neutral',
    message TEXT NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    page VARCHAR(255),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'new',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_doctors_specialties ON public.doctors USING GIN(specialties);
CREATE INDEX IF NOT EXISTS idx_doctors_verified ON public.doctors(is_verified);
CREATE INDEX IF NOT EXISTS idx_chambers_doctor ON public.chambers(doctor_id);
CREATE INDEX IF NOT EXISTS idx_chambers_area ON public.chambers(area);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);

-- ==============================================
-- ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS POLICIES (Public read for doctors)
-- ==============================================

-- Drop existing policies first (to avoid errors)
DROP POLICY IF EXISTS "Doctors are viewable by everyone" ON public.doctors;
DROP POLICY IF EXISTS "Chambers are viewable by everyone" ON public.chambers;
DROP POLICY IF EXISTS "Schedules are viewable by everyone" ON public.schedules;
DROP POLICY IF EXISTS "Allow all for service role" ON public.doctors;
DROP POLICY IF EXISTS "Allow all for service role" ON public.chambers;

-- Create new policies
CREATE POLICY "Doctors are viewable by everyone" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Chambers are viewable by everyone" ON public.chambers FOR SELECT USING (true);
CREATE POLICY "Schedules are viewable by everyone" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);

-- Allow service role to do everything (for backend)
CREATE POLICY "Service role full access to doctors" ON public.doctors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to chambers" ON public.chambers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to schedules" ON public.schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access to ai_conversations" ON public.ai_conversations FOR ALL USING (true) WITH CHECK (true);

-- ==============================================
-- AUTO-UPDATE TIMESTAMPS
-- ==============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (will fail silently if already exists)
DROP TRIGGER IF EXISTS update_doctors_updated_at ON public.doctors;
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Schema update complete! Tables created/updated successfully.';
END
$$;

