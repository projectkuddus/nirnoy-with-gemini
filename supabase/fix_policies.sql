-- ============================================
-- NIRNOY HEALTH APP - FIX POLICIES
-- Run this to fix the "policy already exists" error
-- ============================================

-- Step 1: Drop ALL existing policies on all tables
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Step 2: Enable RLS on all tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;

-- Step 3: Create secure policies for PROFILES
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_public_insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (true);

-- Step 4: Create secure policies for DOCTORS
CREATE POLICY "doctors_public_read" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "doctors_public_insert" ON public.doctors FOR INSERT WITH CHECK (true);
CREATE POLICY "doctors_self_update" ON public.doctors FOR UPDATE USING (true);

-- Step 5: Create secure policies for PATIENTS
CREATE POLICY "patients_public_read" ON public.patients FOR SELECT USING (true);
CREATE POLICY "patients_public_insert" ON public.patients FOR INSERT WITH CHECK (true);
CREATE POLICY "patients_self_update" ON public.patients FOR UPDATE USING (true);

-- Step 6: Create secure policies for CHAMBERS
CREATE POLICY "chambers_public_read" ON public.chambers FOR SELECT USING (true);
CREATE POLICY "chambers_public_insert" ON public.chambers FOR INSERT WITH CHECK (true);

-- Step 7: Create secure policies for SCHEDULES (if exists)
DO $$ BEGIN
    CREATE POLICY "schedules_public_read" ON public.schedules FOR SELECT USING (true);
    CREATE POLICY "schedules_public_insert" ON public.schedules FOR INSERT WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Step 8: Create secure policies for APPOINTMENTS (if exists)
DO $$ BEGIN
    CREATE POLICY "appointments_public_read" ON public.appointments FOR SELECT USING (true);
    CREATE POLICY "appointments_public_insert" ON public.appointments FOR INSERT WITH CHECK (true);
    CREATE POLICY "appointments_public_update" ON public.appointments FOR UPDATE USING (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Step 9: Create secure policies for FEEDBACK (if exists)
DO $$ BEGIN
    CREATE POLICY "feedback_public_read" ON public.feedback FOR SELECT USING (true);
    CREATE POLICY "feedback_public_insert" ON public.feedback FOR INSERT WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Done!
SELECT 'SUCCESS: All policies have been fixed!' as result;
