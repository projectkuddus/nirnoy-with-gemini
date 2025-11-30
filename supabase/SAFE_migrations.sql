-- ============================================================
-- NIRNOY SAFE MIGRATIONS
-- This file ONLY ADDS - NEVER DELETES user data
-- Run this anytime to ensure all tables/columns exist
-- ============================================================

-- SAFE: Create tables only if they don't exist
-- This will NOT affect existing data

-- 1. PROFILES (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(20) DEFAULT 'patient',
  date_of_birth DATE,
  gender VARCHAR(10),
  blood_group VARCHAR(5),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  language_preference VARCHAR(5) DEFAULT 'bn',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PATIENTS (if not exists)
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  chronic_conditions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  past_surgeries JSONB DEFAULT '[]',
  vaccinations JSONB DEFAULT '[]',
  family_history JSONB DEFAULT '{}',
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  subscription_tier VARCHAR(20) DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  health_score INTEGER DEFAULT 0,
  quiz_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DOCTORS (if not exists)
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  bmdc_number VARCHAR(50) UNIQUE NOT NULL,
  nid_number VARCHAR(20),
  specialties TEXT[] DEFAULT '{}',
  qualifications TEXT[] DEFAULT '{}',
  institution VARCHAR(255),
  experience_years INTEGER DEFAULT 0,
  consultation_fee INTEGER DEFAULT 500,
  online_fee INTEGER DEFAULT 300,
  status VARCHAR(20) DEFAULT 'pending',
  rating DECIMAL(3,2) DEFAULT 0,
  total_patients INTEGER DEFAULT 0,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CHAMBERS (if not exists)
CREATE TABLE IF NOT EXISTS public.chambers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  area VARCHAR(100),
  city VARCHAR(100) DEFAULT 'Dhaka',
  phone VARCHAR(20),
  fee INTEGER DEFAULT 500,
  is_primary BOOLEAN DEFAULT false,
  schedule JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MEDICATIONS (if not exists)
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  times_per_day INTEGER DEFAULT 1,
  time_slots TIME[] DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE,
  prescribed_by VARCHAR(255),
  doctor_id UUID REFERENCES public.doctors(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  reminder_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. HEALTH_RECORDS (if not exists)
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  record_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}',
  attachments TEXT[] DEFAULT '{}',
  recorded_by VARCHAR(255),
  doctor_id UUID REFERENCES public.doctors(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AI_CONVERSATIONS (if not exists)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID DEFAULT gen_random_uuid(),
  messages JSONB DEFAULT '[]',
  summary TEXT,
  detected_symptoms TEXT[] DEFAULT '{}',
  suggested_specialties TEXT[] DEFAULT '{}',
  emergency_flag BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FOOD_SCANS (if not exists)
CREATE TABLE IF NOT EXISTS public.food_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  image_url TEXT,
  food_items JSONB DEFAULT '[]',
  analysis_result TEXT,
  health_warnings TEXT[] DEFAULT '{}',
  calories_estimate INTEGER,
  is_safe BOOLEAN,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. QUIZZES (if not exists)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  title_bn VARCHAR(255),
  description TEXT,
  description_bn TEXT,
  category VARCHAR(50) NOT NULL,
  icon VARCHAR(10),
  duration_minutes INTEGER DEFAULT 5,
  frequency VARCHAR(20) DEFAULT 'weekly',
  points_reward INTEGER DEFAULT 10,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. QUIZ_QUESTIONS (if not exists)
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_text_bn TEXT,
  question_type VARCHAR(20) DEFAULT 'single',
  options JSONB DEFAULT '[]',
  correct_answer JSONB,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. QUIZ_RESPONSES (if not exists)
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '[]',
  score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  percentage DECIMAL(5,2),
  insights TEXT,
  insights_bn TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. APPOINTMENTS (if not exists)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  chamber_id UUID REFERENCES public.chambers(id),
  appointment_type VARCHAR(20) DEFAULT 'in_person',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  status VARCHAR(20) DEFAULT 'pending',
  symptoms TEXT,
  notes TEXT,
  prescription JSONB,
  fee_paid INTEGER,
  payment_status VARCHAR(20) DEFAULT 'pending',
  rating INTEGER,
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. FEEDBACKS (if not exists)
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  category VARCHAR(50) DEFAULT 'general',
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. SUBSCRIPTIONS (if not exists)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL,
  price_bdt INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SAFE: Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_patients_profile ON public.patients(profile_id);
CREATE INDEX IF NOT EXISTS idx_doctors_status ON public.doctors(status);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON public.medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_records_patient ON public.health_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);

-- SAFE: Enable RLS (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- SAFE: Create policies only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_profiles') THEN
    CREATE POLICY "allow_all_profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_patients') THEN
    CREATE POLICY "allow_all_patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_doctors') THEN
    CREATE POLICY "allow_all_doctors" ON public.doctors FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_chambers') THEN
    CREATE POLICY "allow_all_chambers" ON public.chambers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_medications') THEN
    CREATE POLICY "allow_all_medications" ON public.medications FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_health_records') THEN
    CREATE POLICY "allow_all_health_records" ON public.health_records FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_ai_conversations') THEN
    CREATE POLICY "allow_all_ai_conversations" ON public.ai_conversations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_food_scans') THEN
    CREATE POLICY "allow_all_food_scans" ON public.food_scans FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_quizzes') THEN
    CREATE POLICY "allow_all_quizzes" ON public.quizzes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_quiz_questions') THEN
    CREATE POLICY "allow_all_quiz_questions" ON public.quiz_questions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_quiz_responses') THEN
    CREATE POLICY "allow_all_quiz_responses" ON public.quiz_responses FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_appointments') THEN
    CREATE POLICY "allow_all_appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_feedbacks') THEN
    CREATE POLICY "allow_all_feedbacks" ON public.feedbacks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_subscriptions') THEN
    CREATE POLICY "allow_all_subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- SAFE: Insert default quizzes only if they don't exist
INSERT INTO public.quizzes (slug, title, title_bn, category, icon, duration_minutes, frequency, points_reward, is_premium)
SELECT * FROM (VALUES
  ('mood-daily', 'Daily Mood Check', 'দৈনিক মেজাজ পরীক্ষা', 'mental_health', '😊', 3, 'daily', 5, false),
  ('anxiety-weekly', 'Anxiety Assessment', 'উদ্বেগ মূল্যায়ন', 'mental_health', '😰', 5, 'weekly', 10, false),
  ('sleep-quality', 'Sleep Quality', 'ঘুমের মান', 'wellness', '😴', 4, 'weekly', 10, false),
  ('stress-level', 'Stress Level', 'চাপের মাত্রা', 'wellness', '😓', 5, 'weekly', 10, false),
  ('personality-type', 'Personality Type', 'ব্যক্তিত্বের ধরন', 'personality', '🎭', 15, 'yearly', 50, true),
  ('emotional-iq', 'Emotional Intelligence', 'আবেগীয় বুদ্ধিমত্তা', 'personality', '🧠', 10, 'monthly', 30, true),
  ('depression-phq9', 'Depression Check', 'বিষণ্নতা পরীক্ষা', 'mental_health', '😔', 5, 'monthly', 20, true),
  ('nutrition-habits', 'Nutrition Habits', 'পুষ্টি অভ্যাস', 'nutrition', '🥗', 8, 'monthly', 15, false),
  ('love-language', 'Love Language', 'ভালোবাসার ভাষা', 'personality', '❤️', 10, 'once', 30, true)
) AS v(slug, title, title_bn, category, icon, duration_minutes, frequency, points_reward, is_premium)
WHERE NOT EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.slug = v.slug);

SELECT 'SAFE MIGRATION COMPLETE! All tables ready, NO data deleted!' as result;
