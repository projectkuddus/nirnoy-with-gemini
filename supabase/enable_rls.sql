-- ==============================================
-- NIRNOY HEALTH APP - ENABLE ROW LEVEL SECURITY
-- ==============================================
-- Run this in your Supabase SQL Editor to enable RLS
-- This will secure your tables from unauthorized access

-- ============================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: CREATE SECURITY POLICIES
-- ============================================

-- ---- PROFILES ----
CREATE POLICY IF NOT EXISTS "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can update own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ---- DOCTORS ----
CREATE POLICY IF NOT EXISTS "Doctors are viewable by everyone" 
ON public.doctors FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Doctors can update own profile" 
ON public.doctors FOR UPDATE USING (auth.uid() = user_id);

-- ---- CHAMBERS ----
CREATE POLICY IF NOT EXISTS "Chambers are viewable by everyone" 
ON public.chambers FOR SELECT USING (true);

-- ---- SCHEDULES ----
CREATE POLICY IF NOT EXISTS "Schedules are viewable by everyone" 
ON public.schedules FOR SELECT USING (true);

-- ---- PATIENTS ----
CREATE POLICY IF NOT EXISTS "Patients can view own data" 
ON public.patients FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Patients can update own data" 
ON public.patients FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Patients can insert own data" 
ON public.patients FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---- FAMILY MEMBERS ----
CREATE POLICY IF NOT EXISTS "Family members viewable by owner" 
ON public.family_members FOR SELECT 
USING (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()));

-- ---- APPOINTMENTS ----
CREATE POLICY IF NOT EXISTS "Users can view own appointments" 
ON public.appointments FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM public.patients WHERE id = patient_id
  UNION SELECT user_id FROM public.doctors WHERE id = doctor_id
));

CREATE POLICY IF NOT EXISTS "Users can create appointments" 
ON public.appointments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---- FEEDBACK ----
CREATE POLICY IF NOT EXISTS "Anyone can submit feedback" 
ON public.feedback FOR INSERT WITH CHECK (true);

-- ---- REVIEWS ----
CREATE POLICY IF NOT EXISTS "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT USING (true);

-- ---- AI CONVERSATIONS ----
CREATE POLICY IF NOT EXISTS "AI conversations viewable by owner" 
ON public.ai_conversations FOR SELECT 
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY IF NOT EXISTS "Anyone can create AI conversations" 
ON public.ai_conversations FOR INSERT WITH CHECK (true);

-- ---- NOTIFICATIONS ----
CREATE POLICY IF NOT EXISTS "Users can view own notifications" 
ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- ---- CONSULTATIONS ----
CREATE POLICY IF NOT EXISTS "Consultations viewable by participants" 
ON public.consultations FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM public.patients WHERE id = patient_id
  UNION SELECT user_id FROM public.doctors WHERE id = doctor_id
));

-- ---- PRESCRIPTIONS ----
CREATE POLICY IF NOT EXISTS "Prescriptions viewable by participants" 
ON public.prescriptions FOR SELECT 
USING (consultation_id IN (
  SELECT id FROM public.consultations 
  WHERE auth.uid() IN (
    SELECT user_id FROM public.patients WHERE id = patient_id
    UNION SELECT user_id FROM public.doctors WHERE id = doctor_id
  )
));

-- ============================================
-- VERIFICATION - Run this to check RLS status
-- ============================================
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
