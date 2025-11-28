-- ==============================================
-- NIRNOY HEALTH APP - SUPABASE DATABASE SCHEMA
-- ==============================================
-- Run this in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================
-- USERS & AUTHENTICATION
-- ==============================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(255),
    name_bn VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(5),
    address TEXT,
    city VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- DOCTORS
-- ==============================================

CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    bmdc_number VARCHAR(50) UNIQUE NOT NULL,
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

-- Doctor chambers/clinics
CREATE TABLE IF NOT EXISTS public.chambers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    area VARCHAR(100),
    city VARCHAR(100) DEFAULT 'Dhaka',
    phone VARCHAR(20),
    fee INTEGER NOT NULL,
    follow_up_fee INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    has_parking BOOLEAN DEFAULT FALSE,
    has_ac BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor schedules
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamber_id UUID REFERENCES public.chambers(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 15, -- minutes
    max_patients INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE
);

-- ==============================================
-- PATIENTS
-- ==============================================

CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relation VARCHAR(50),
    allergies TEXT[],
    chronic_conditions TEXT[],
    current_medications TEXT[],
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family members
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
-- APPOINTMENTS
-- ==============================================

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    chamber_id UUID REFERENCES public.chambers(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    serial_number INTEGER NOT NULL,
    visit_type VARCHAR(20) DEFAULT 'new' CHECK (visit_type IN ('new', 'follow_up', 'report')),
    status VARCHAR(20) DEFAULT 'booked' CHECK (status IN ('booked', 'confirmed', 'in_queue', 'in_progress', 'completed', 'cancelled', 'no_show')),
    fee INTEGER NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(20),
    chief_complaint TEXT,
    symptoms TEXT[],
    notes TEXT,
    cancelled_by VARCHAR(20),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- CONSULTATIONS & PRESCRIPTIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    diagnosis TEXT,
    diagnosis_bn TEXT,
    examination_notes TEXT,
    vitals JSONB, -- {bp, hr, temp, weight, spo2}
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    medicines JSONB NOT NULL, -- [{name, dosage, duration, instruction}]
    tests_advised TEXT[],
    advice TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- FEEDBACK & REVIEWS
-- ==============================================

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature', 'general', 'doctor', 'complaint')),
    mood VARCHAR(10) CHECK (mood IN ('happy', 'neutral', 'sad')),
    message TEXT NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    page VARCHAR(255),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    conversation_type VARCHAR(20) DEFAULT 'health' CHECK (conversation_type IN ('health', 'booking', 'clinical', 'free_care')),
    messages JSONB NOT NULL DEFAULT '[]', -- [{role, content, timestamp}]
    context JSONB,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- NOTIFICATIONS
-- ==============================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    sent_via TEXT[] DEFAULT ARRAY['app'], -- ['app', 'sms', 'email']
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_doctors_specialties ON public.doctors USING GIN(specialties);
CREATE INDEX IF NOT EXISTS idx_doctors_verified ON public.doctors(is_verified);
CREATE INDEX IF NOT EXISTS idx_chambers_doctor ON public.chambers(doctor_id);
CREATE INDEX IF NOT EXISTS idx_chambers_area ON public.chambers(area);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Doctors: Public read, own update
CREATE POLICY "Doctors are viewable by everyone" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Doctors can update own profile" ON public.doctors FOR UPDATE USING (auth.uid() = user_id);

-- Chambers: Public read
CREATE POLICY "Chambers are viewable by everyone" ON public.chambers FOR SELECT USING (true);

-- Appointments: Own read/write
CREATE POLICY "Users can view own appointments" ON public.appointments FOR SELECT 
    USING (auth.uid() IN (
        SELECT user_id FROM public.patients WHERE id = patient_id
        UNION
        SELECT user_id FROM public.doctors WHERE id = doctor_id
    ));

-- Feedback: Anyone can insert, admins can read all
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT WITH CHECK (true);

-- Notifications: Own only
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- ==============================================
-- FUNCTIONS & TRIGGERS
-- ==============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, phone, email)
    VALUES (NEW.id, NEW.phone, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- SEED DATA (Optional - for testing)
-- ==============================================

-- Insert sample specialties
-- INSERT INTO ... (run separately if needed)

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth';
COMMENT ON TABLE public.doctors IS 'Doctor professional profiles';
COMMENT ON TABLE public.appointments IS 'Patient appointments with doctors';
COMMENT ON TABLE public.feedback IS 'User feedback and bug reports';



