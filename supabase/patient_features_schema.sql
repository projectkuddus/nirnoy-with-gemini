-- ============================================================
-- NIRNOY PATIENT FEATURES - ADDITIONAL TABLES
-- For Phase 2: Comprehensive Patient Dashboard
-- ============================================================

-- 1. VITAL_SIGNS - Patient vital sign recordings
CREATE TABLE IF NOT EXISTS public.vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  vital_type VARCHAR(50) NOT NULL CHECK (vital_type IN (
    'blood_pressure', 'heart_rate', 'temperature', 'blood_sugar', 
    'weight', 'spo2', 'respiratory_rate', 'height'
  )),
  value DECIMAL(10,2) NOT NULL,
  secondary_value DECIMAL(10,2), -- For BP diastolic, etc.
  unit VARCHAR(20) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'device', 'lab', 'doctor')),
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  appointment_id UUID REFERENCES public.appointments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON public.vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_type ON public.vital_signs(vital_type);
CREATE INDEX IF NOT EXISTS idx_vital_signs_measured ON public.vital_signs(measured_at DESC);

-- 2. HEALTH_GOALS - Patient health goals and tracking
CREATE TABLE IF NOT EXISTS public.health_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN (
    'weight', 'steps', 'water', 'sleep', 'exercise', 'medication', 'custom'
  )),
  title VARCHAR(255) NOT NULL,
  title_bn VARCHAR(255),
  description TEXT,
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0,
  unit VARCHAR(50) NOT NULL,
  frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  streak_count INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_goals_patient ON public.health_goals(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_goals_active ON public.health_goals(patient_id, is_active);

-- 3. GOAL_PROGRESS - Daily/weekly goal progress tracking
CREATE TABLE IF NOT EXISTS public.goal_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.health_goals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, progress_date)
);

CREATE INDEX IF NOT EXISTS idx_goal_progress_goal ON public.goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_progress_date ON public.goal_progress(progress_date DESC);

-- 4. HEALTH_INSIGHTS - AI-generated health insights
CREATE TABLE IF NOT EXISTS public.health_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  insight_type VARCHAR(20) NOT NULL CHECK (insight_type IN ('info', 'warning', 'success', 'alert')),
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'general', 'vitals', 'medication', 'lifestyle', 'appointment', 'diet', 'exercise'
  )),
  title VARCHAR(255) NOT NULL,
  title_bn VARCHAR(255),
  description TEXT NOT NULL,
  description_bn TEXT,
  action_label VARCHAR(100),
  action_label_bn VARCHAR(100),
  action_url TEXT,
  priority INTEGER DEFAULT 0,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_insights_patient ON public.health_insights(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_unread ON public.health_insights(patient_id, is_read, is_dismissed);

-- 5. HEALTH_RISKS - Patient health risk assessments
CREATE TABLE IF NOT EXISTS public.health_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  condition VARCHAR(255) NOT NULL,
  condition_bn VARCHAR(255),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high')),
  risk_score DECIMAL(5,2),
  factors JSONB DEFAULT '[]', -- Array of risk factors
  recommendations JSONB DEFAULT '[]', -- Array of recommendations
  source VARCHAR(50) DEFAULT 'ai' CHECK (source IN ('ai', 'doctor', 'system')),
  assessed_by UUID REFERENCES public.profiles(id),
  last_assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_risks_patient ON public.health_risks(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_risks_level ON public.health_risks(risk_level);

-- 6. PATIENT_DOCTOR_CONNECTIONS - Doctor-patient relationships
CREATE TABLE IF NOT EXISTS public.patient_doctor_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  is_primary BOOLEAN DEFAULT false,
  first_visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_visit_date DATE,
  total_visits INTEGER DEFAULT 1,
  doctor_notes TEXT, -- Notes from doctor visible to patient
  doctor_notes_date TIMESTAMPTZ,
  can_message BOOLEAN DEFAULT false,
  shared_records BOOLEAN DEFAULT true, -- Patient shares records with this doctor
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_pdc_patient ON public.patient_doctor_connections(patient_id);
CREATE INDEX IF NOT EXISTS idx_pdc_doctor ON public.patient_doctor_connections(doctor_id);
CREATE INDEX IF NOT EXISTS idx_pdc_primary ON public.patient_doctor_connections(patient_id, is_primary);

-- 7. PATIENT_MESSAGES - Secure messaging between patients and doctors
CREATE TABLE IF NOT EXISTS public.patient_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES public.patient_doctor_connections(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('patient', 'doctor')),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'prescription')),
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_connection ON public.patient_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.patient_messages(connection_id, is_read);

-- 8. PATIENT_DOCUMENTS - Enhanced health record documents
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
    'prescription', 'lab_report', 'imaging', 'discharge_summary', 
    'certificate', 'insurance', 'other'
  )),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  doctor_name VARCHAR(255),
  doctor_id UUID REFERENCES public.doctors(id),
  hospital_name VARCHAR(255),
  appointment_id UUID REFERENCES public.appointments(id),
  tags TEXT[] DEFAULT '{}',
  ocr_text TEXT, -- Extracted text from document
  is_shared_with_doctors BOOLEAN DEFAULT true,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_patient ON public.patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.patient_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_date ON public.patient_documents(document_date DESC);

-- 9. PRESCRIPTIONS - Detailed prescription tracking
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id),
  diagnosis TEXT,
  diagnosis_bn TEXT,
  medicines JSONB NOT NULL DEFAULT '[]', -- Array of prescribed medicines
  advice JSONB DEFAULT '[]', -- Array of advice strings
  follow_up_date DATE,
  duration_days INTEGER,
  pdf_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_active ON public.prescriptions(patient_id, is_active);

-- 10. MEDICATION_LOGS - Track medication intake
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  scheduled_time TIME NOT NULL,
  taken_at TIMESTAMPTZ,
  taken BOOLEAN DEFAULT false,
  skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(medication_id, log_date, scheduled_time)
);

CREATE INDEX IF NOT EXISTS idx_med_logs_medication ON public.medication_logs(medication_id);
CREATE INDEX IF NOT EXISTS idx_med_logs_patient_date ON public.medication_logs(patient_id, log_date);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_doctor_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Vital Signs Policies
CREATE POLICY "Patients can view own vitals" ON public.vital_signs
  FOR SELECT USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Patients can insert own vitals" ON public.vital_signs
  FOR INSERT WITH CHECK (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Doctors can view connected patient vitals" ON public.vital_signs
  FOR SELECT USING (patient_id IN (
    SELECT pdc.patient_id FROM public.patient_doctor_connections pdc
    JOIN public.doctors d ON d.id = pdc.doctor_id
    WHERE d.profile_id = auth.uid() AND pdc.shared_records = true
  ));

-- Health Goals Policies
CREATE POLICY "Patients can manage own goals" ON public.health_goals
  FOR ALL USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

-- Goal Progress Policies
CREATE POLICY "Patients can manage own progress" ON public.goal_progress
  FOR ALL USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

-- Health Insights Policies
CREATE POLICY "Patients can view own insights" ON public.health_insights
  FOR SELECT USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Patients can update own insights" ON public.health_insights
  FOR UPDATE USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

-- Health Risks Policies
CREATE POLICY "Patients can view own risks" ON public.health_risks
  FOR SELECT USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

-- Patient Doctor Connections Policies
CREATE POLICY "Patients can view own connections" ON public.patient_doctor_connections
  FOR SELECT USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Patients can manage own connections" ON public.patient_doctor_connections
  FOR ALL USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Doctors can view their connections" ON public.patient_doctor_connections
  FOR SELECT USING (doctor_id IN (
    SELECT id FROM public.doctors WHERE profile_id = auth.uid()
  ));

-- Patient Messages Policies
CREATE POLICY "Users can view own messages" ON public.patient_messages
  FOR SELECT USING (sender_id = auth.uid() OR connection_id IN (
    SELECT id FROM public.patient_doctor_connections WHERE 
      patient_id IN (SELECT id FROM public.patients WHERE profile_id = auth.uid()) OR
      doctor_id IN (SELECT id FROM public.doctors WHERE profile_id = auth.uid())
  ));

CREATE POLICY "Users can send messages" ON public.patient_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Patient Documents Policies
CREATE POLICY "Patients can manage own documents" ON public.patient_documents
  FOR ALL USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Doctors can view shared documents" ON public.patient_documents
  FOR SELECT USING (
    is_shared_with_doctors = true AND
    patient_id IN (
      SELECT pdc.patient_id FROM public.patient_doctor_connections pdc
      JOIN public.doctors d ON d.id = pdc.doctor_id
      WHERE d.profile_id = auth.uid()
    )
  );

-- Prescriptions Policies
CREATE POLICY "Patients can view own prescriptions" ON public.prescriptions
  FOR SELECT USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

CREATE POLICY "Doctors can manage prescriptions" ON public.prescriptions
  FOR ALL USING (doctor_id IN (
    SELECT id FROM public.doctors WHERE profile_id = auth.uid()
  ));

-- Medication Logs Policies
CREATE POLICY "Patients can manage own med logs" ON public.medication_logs
  FOR ALL USING (patient_id IN (
    SELECT id FROM public.patients WHERE profile_id = auth.uid()
  ));

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update connection on new appointment
CREATE OR REPLACE FUNCTION update_patient_doctor_connection()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.patient_doctor_connections (patient_id, doctor_id, first_visit_date, last_visit_date, total_visits)
  VALUES (NEW.patient_id, NEW.doctor_id, NEW.scheduled_date, NEW.scheduled_date, 1)
  ON CONFLICT (patient_id, doctor_id) 
  DO UPDATE SET 
    last_visit_date = NEW.scheduled_date,
    total_visits = patient_doctor_connections.total_visits + 1,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_appointment_create
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_doctor_connection();

-- Update health score based on vitals and goals
CREATE OR REPLACE FUNCTION calculate_health_score()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id UUID;
  v_score INTEGER := 70;
  v_vitals_count INTEGER;
  v_goal_completion DECIMAL;
  v_risk_count INTEGER;
BEGIN
  v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
  
  -- Count recent vitals (bonus points for tracking)
  SELECT COUNT(*) INTO v_vitals_count 
  FROM public.vital_signs 
  WHERE patient_id = v_patient_id 
  AND measured_at > NOW() - INTERVAL '7 days';
  
  v_score := v_score + LEAST(v_vitals_count * 2, 10);
  
  -- Calculate goal completion
  SELECT COALESCE(AVG(
    CASE WHEN target_value > 0 
    THEN LEAST(current_value / target_value * 100, 100) 
    ELSE 0 END
  ), 0) INTO v_goal_completion
  FROM public.health_goals
  WHERE patient_id = v_patient_id AND is_active = true;
  
  v_score := v_score + ROUND(v_goal_completion * 0.1);
  
  -- Deduct for high risks
  SELECT COUNT(*) INTO v_risk_count
  FROM public.health_risks
  WHERE patient_id = v_patient_id AND risk_level = 'high';
  
  v_score := v_score - (v_risk_count * 10);
  
  -- Clamp score
  v_score := GREATEST(0, LEAST(100, v_score));
  
  -- Update patient health score
  UPDATE public.patients SET health_score = v_score WHERE id = v_patient_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_vital_change
  AFTER INSERT OR UPDATE ON public.vital_signs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_health_score();

CREATE TRIGGER on_goal_change
  AFTER INSERT OR UPDATE ON public.health_goals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_health_score();

