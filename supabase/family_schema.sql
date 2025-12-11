-- ============================================================
-- NIRNOY FAMILY MANAGEMENT SCHEMA
-- For Phase 3: Family Health Management
-- ============================================================

-- 1. FAMILIES - Family groups
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255),
  created_by UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  primary_contact_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'family', 'premium')),
  max_members INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_families_created_by ON public.families(created_by);

-- 2. FAMILY_MEMBERS - Members of family groups
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL, -- Linked patient account
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  name_bn VARCHAR(255),
  relation VARCHAR(20) NOT NULL CHECK (relation IN ('self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'other')),
  relation_label VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(10) CHECK (gender IN ('Male', 'Female')),
  blood_group VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  avatar_url TEXT,
  
  -- Health Info (for unlinked members)
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  chronic_conditions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  current_medications TEXT[] DEFAULT '{}',
  
  -- Permissions
  can_book BOOLEAN DEFAULT true,
  can_view_records BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,
  
  -- Invitation
  invitation_status VARCHAR(20) DEFAULT 'accepted' CHECK (invitation_status IN ('pending', 'accepted', 'declined')),
  invitation_phone VARCHAR(20),
  invitation_code VARCHAR(10),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(family_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_family ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_patient ON public.family_members(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_members_invitation ON public.family_members(invitation_code) WHERE invitation_status = 'pending';

-- 3. FAMILY_HEALTH_ALERTS - Shared health alerts for family
CREATE TABLE IF NOT EXISTS public.family_health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('medication', 'appointment', 'vitals', 'emergency', 'checkup')),
  title VARCHAR(255) NOT NULL,
  title_bn VARCHAR(255),
  description TEXT,
  description_bn TEXT,
  priority INTEGER DEFAULT 50,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  read_by UUID[] DEFAULT '{}', -- Array of member IDs who have read
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_family_alerts_family ON public.family_health_alerts(family_id);
CREATE INDEX IF NOT EXISTS idx_family_alerts_unread ON public.family_health_alerts(family_id, is_dismissed) WHERE is_dismissed = false;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_health_alerts ENABLE ROW LEVEL SECURITY;

-- Families Policies
CREATE POLICY "Users can view their families" ON public.families
  FOR SELECT USING (
    id IN (
      SELECT family_id FROM public.family_members 
      WHERE patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Family admins can update their family" ON public.families
  FOR UPDATE USING (
    id IN (
      SELECT family_id FROM public.family_members 
      WHERE patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Users can create families" ON public.families
  FOR INSERT WITH CHECK (
    created_by IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
  );

-- Family Members Policies
CREATE POLICY "Users can view family members" ON public.family_members
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM public.family_members 
      WHERE patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Family admins can manage members" ON public.family_members
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM public.family_members 
      WHERE patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
      AND is_admin = true
    )
  );

CREATE POLICY "Users can update their own member record" ON public.family_members
  FOR UPDATE USING (
    patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
  );

-- Family Health Alerts Policies
CREATE POLICY "Family members can view alerts" ON public.family_health_alerts
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM public.family_members 
      WHERE patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
    )
  );

CREATE POLICY "Family admins can manage alerts" ON public.family_health_alerts
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM public.family_members 
      WHERE patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid())
      AND is_admin = true
    )
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update family when member changes
CREATE OR REPLACE FUNCTION update_family_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.families SET updated_at = NOW() WHERE id = NEW.family_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_family_member_change
  AFTER INSERT OR UPDATE ON public.family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_family_timestamp();

-- Auto-create family alert when family member misses medication
CREATE OR REPLACE FUNCTION create_missed_medication_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_family_id UUID;
  v_member_id UUID;
BEGIN
  -- Only if medication was skipped
  IF NEW.skipped = true AND OLD.skipped = false THEN
    -- Get family member info
    SELECT fm.family_id, fm.id INTO v_family_id, v_member_id
    FROM public.family_members fm
    WHERE fm.patient_id = NEW.patient_id
    LIMIT 1;
    
    IF v_family_id IS NOT NULL THEN
      INSERT INTO public.family_health_alerts (
        family_id, member_id, alert_type, title, title_bn, description, priority
      ) VALUES (
        v_family_id, v_member_id, 'medication',
        'Missed Medication', 'ওষুধ মিস হয়েছে',
        'A family member missed their scheduled medication.',
        70
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create if medication_logs table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medication_logs') THEN
    DROP TRIGGER IF EXISTS on_medication_skip ON public.medication_logs;
    CREATE TRIGGER on_medication_skip
      AFTER UPDATE ON public.medication_logs
      FOR EACH ROW
      EXECUTE FUNCTION create_missed_medication_alert();
  END IF;
END $$;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get family health summary
CREATE OR REPLACE FUNCTION get_family_health_summary(p_family_id UUID)
RETURNS TABLE (
  total_members INTEGER,
  members_with_conditions INTEGER,
  upcoming_appointments INTEGER,
  active_medications INTEGER,
  recent_alerts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM public.family_members WHERE family_id = p_family_id),
    (SELECT COUNT(*)::INTEGER FROM public.family_members WHERE family_id = p_family_id AND array_length(chronic_conditions, 1) > 0),
    (SELECT COUNT(*)::INTEGER FROM public.appointments a
      JOIN public.family_members fm ON fm.patient_id = a.patient_id
      WHERE fm.family_id = p_family_id 
      AND a.scheduled_date >= CURRENT_DATE 
      AND a.status NOT IN ('cancelled', 'completed')),
    (SELECT COUNT(*)::INTEGER FROM public.prescriptions p
      JOIN public.family_members fm ON fm.patient_id = p.patient_id
      WHERE fm.family_id = p_family_id AND p.is_active = true),
    (SELECT COUNT(*)::INTEGER FROM public.family_health_alerts 
      WHERE family_id = p_family_id 
      AND is_dismissed = false 
      AND created_at > NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

