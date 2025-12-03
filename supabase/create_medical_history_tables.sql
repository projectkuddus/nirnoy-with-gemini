-- ==============================================
-- MEDICAL HISTORY SYSTEM
-- ==============================================
-- This creates tables for comprehensive medical history:
-- - consultations: All doctor consultations with SOAP notes, diagnosis
-- - prescriptions: All prescriptions with medicines
-- - test_reports: All lab/test reports uploaded
-- ==============================================

-- ==============================================
-- CONSULTATIONS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- SOAP Notes
  subjective TEXT, -- Patient's description
  objective TEXT,  -- Examination findings
  assessment TEXT, -- Diagnosis/assessment
  plan TEXT,       -- Treatment plan
  
  -- Diagnosis
  diagnosis TEXT,
  diagnosis_bn TEXT,
  
  -- Vitals (if recorded)
  vitals JSONB, -- {bp: "120/80", hr: 72, temp: 98.6, weight: 70, spo2: 98}
  
  -- Advice/Instructions
  advice TEXT[], -- Array of advice strings
  
  -- Consultation metadata
  consultation_date DATE NOT NULL,
  consultation_time TIME NOT NULL,
  duration_minutes INTEGER,
  
  -- AI Summary (for future ML models)
  ai_summary TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- PRESCRIPTIONS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Medicine details
  medicine_name TEXT NOT NULL,
  medicine_name_bn TEXT,
  dosage TEXT NOT NULL, -- e.g., "1+0+1", "SOS", "0+0+1"
  duration TEXT NOT NULL, -- e.g., "7 days", "30 days", "As needed"
  instruction TEXT, -- e.g., "খাবারের পর", "জিহ্বার নিচে"
  
  -- Prescription metadata
  prescription_date DATE NOT NULL,
  follow_up_date DATE, -- Next visit date
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- TEST REPORTS TABLE
-- ==============================================
CREATE TABLE IF NOT EXISTS test_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Report details
  test_name TEXT NOT NULL,
  test_name_bn TEXT,
  test_type TEXT, -- 'lab', 'imaging', 'ecg', 'other'
  test_date DATE NOT NULL,
  
  -- File storage
  file_url TEXT, -- Supabase Storage URL
  file_name TEXT,
  file_type TEXT, -- 'pdf', 'image', etc.
  
  -- Results (structured data for ML)
  results JSONB, -- {key: value pairs for test results}
  findings TEXT,
  recommendations TEXT,
  
  -- Doctor notes
  doctor_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_appointment_id ON consultations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(consultation_date DESC);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id ON prescriptions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(prescription_date DESC);

CREATE INDEX IF NOT EXISTS idx_test_reports_patient_id ON test_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_consultation_id ON test_reports(consultation_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_date ON test_reports(test_date DESC);

-- ==============================================
-- GRANT PERMISSIONS
-- ==============================================
GRANT ALL ON consultations TO authenticated;
GRANT ALL ON consultations TO anon;
GRANT ALL ON consultations TO service_role;

GRANT ALL ON prescriptions TO authenticated;
GRANT ALL ON prescriptions TO anon;
GRANT ALL ON prescriptions TO service_role;

GRANT ALL ON test_reports TO authenticated;
GRANT ALL ON test_reports TO anon;
GRANT ALL ON test_reports TO service_role;

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;

-- Patients can view their own records
CREATE POLICY "Patients can view own consultations" ON consultations
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can view own prescriptions" ON prescriptions
  FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can view own test reports" ON test_reports
  FOR SELECT USING (auth.uid() = patient_id);

-- Doctors can view their patients' records
CREATE POLICY "Doctors can view patient consultations" ON consultations
  FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can view patient prescriptions" ON prescriptions
  FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can view patient test reports" ON test_reports
  FOR SELECT USING (auth.uid() = doctor_id);

-- Doctors can insert consultations for their patients
CREATE POLICY "Doctors can create consultations" ON consultations
  FOR INSERT WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create prescriptions" ON prescriptions
  FOR INSERT WITH CHECK (auth.uid() = doctor_id);

-- Allow service role full access
CREATE POLICY "Service role full access consultations" ON consultations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access prescriptions" ON prescriptions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access test_reports" ON test_reports
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

