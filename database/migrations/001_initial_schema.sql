-- ============================================
-- NIRNOY HEALTH SYSTEM - INITIAL SCHEMA
-- Production-ready database schema for www.nirnoy.ai
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_bn TEXT,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_last_active ON users(last_active);

-- ============================================
-- PATIENTS
-- ============================================

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT,
  height_cm INTEGER,
  weight_kg DECIMAL(5,2),
  emergency_contact TEXT,
  emergency_relation TEXT,
  address TEXT,
  city TEXT,
  district TEXT,
  nid_number TEXT,
  family_members JSONB DEFAULT '[]'::jsonb,
  health_conditions JSONB DEFAULT '[]'::jsonb,
  allergies JSONB DEFAULT '[]'::jsonb,
  medications JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_city ON patients(city);
CREATE INDEX idx_patients_district ON patients(district);
CREATE INDEX idx_patients_nid ON patients(nid_number) WHERE nid_number IS NOT NULL;

-- ============================================
-- DOCTORS
-- ============================================

CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bmdc_number TEXT NOT NULL UNIQUE,
  nid_number TEXT NOT NULL,
  degrees JSONB NOT NULL DEFAULT '[]'::jsonb,
  specializations JSONB NOT NULL DEFAULT '[]'::jsonb,
  experience_years INTEGER NOT NULL DEFAULT 0,
  bio TEXT,
  bio_bn TEXT,
  profile_image_url TEXT,
  consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_patients INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_bmdc ON doctors(bmdc_number);
CREATE INDEX idx_doctors_specializations ON doctors USING GIN(specializations);
CREATE INDEX idx_doctors_rating ON doctors(rating DESC);
CREATE INDEX idx_doctors_active ON doctors(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_doctors_verified ON doctors(is_verified) WHERE is_verified = TRUE;

-- ============================================
-- CHAMBERS
-- ============================================

CREATE TABLE IF NOT EXISTS chambers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  consultation_fee DECIMAL(10,2) NOT NULL,
  follow_up_fee DECIMAL(10,2) NOT NULL,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  facilities JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chambers_doctor_id ON chambers(doctor_id);
CREATE INDEX idx_chambers_city ON chambers(city);
CREATE INDEX idx_chambers_area ON chambers(area);
CREATE INDEX idx_chambers_active ON chambers(is_active) WHERE is_active = TRUE;

-- ============================================
-- APPOINTMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  chamber_id UUID REFERENCES chambers(id),
  date DATE NOT NULL,
  time TIME NOT NULL,
  serial_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_queue', 'in_progress', 'completed', 'cancelled', 'no_show')),
  visit_type TEXT NOT NULL DEFAULT 'new' CHECK (visit_type IN ('new', 'follow_up', 'report_review')),
  fee DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  payment_method TEXT,
  payment_id TEXT,
  intake_form JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, date, status);

-- ============================================
-- QUEUE MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  current_serial INTEGER NOT NULL DEFAULT 0,
  total_in_queue INTEGER NOT NULL DEFAULT 0,
  estimated_wait_time INTEGER, -- in minutes
  delay_minutes INTEGER DEFAULT 0,
  doctor_message TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'next', 'current', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_queue_doctor_id ON queue_entries(doctor_id);
CREATE INDEX idx_queue_appointment_id ON queue_entries(appointment_id);
CREATE INDEX idx_queue_status ON queue_entries(status);
CREATE INDEX idx_queue_doctor_status ON queue_entries(doctor_id, status, current_serial);

-- ============================================
-- HEALTH RECORDS
-- ============================================

CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id),
  appointment_id UUID REFERENCES appointments(id),
  record_type TEXT NOT NULL CHECK (record_type IN ('consultation', 'diagnosis', 'prescription', 'lab_report', 'imaging', 'vital_signs', 'symptom', 'medication')),
  title TEXT NOT NULL,
  description TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  body_region TEXT,
  severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
  is_emergency BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_records_patient_id ON health_records(patient_id);
CREATE INDEX idx_health_records_doctor_id ON health_records(doctor_id);
CREATE INDEX idx_health_records_type ON health_records(record_type);
CREATE INDEX idx_health_records_body_region ON health_records(body_region) WHERE body_region IS NOT NULL;
CREATE INDEX idx_health_records_severity ON health_records(severity);
CREATE INDEX idx_health_records_created_at ON health_records(created_at DESC);
CREATE INDEX idx_health_records_tags ON health_records USING GIN(tags);

-- ============================================
-- PRESCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions TEXT,
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_appointment_id ON prescriptions(appointment_id);
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_created_at ON prescriptions(created_at DESC);

-- ============================================
-- AI CONVERSATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('patient_health', 'doctor_assistant', 'general')),
  context JSONB,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  insights JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_type ON ai_conversations(conversation_type);
CREATE INDEX idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);

-- ============================================
-- AI INSIGHTS & PREDICTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  location TEXT, -- For location-based insights (city, district, etc.)
  insight_type TEXT NOT NULL CHECK (insight_type IN ('risk_prediction', 'health_trend', 'pattern_detection', 'recommendation', 'pandemic_alert')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_actionable BOOLEAN DEFAULT FALSE,
  action_items JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_insights_patient_id ON ai_insights(patient_id);
CREATE INDEX idx_ai_insights_doctor_id ON ai_insights(doctor_id);
CREATE INDEX idx_ai_insights_location ON ai_insights(location) WHERE location IS NOT NULL;
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX idx_ai_insights_actionable ON ai_insights(is_actionable) WHERE is_actionable = TRUE;

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('appointment', 'queue', 'prescription', 'health_alert', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], -- ['sms', 'email', 'push']
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- HEALTH ANALYTICS (for trends, location-based insights)
-- ============================================

CREATE TABLE IF NOT EXISTS health_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location TEXT NOT NULL, -- city or district
  date DATE NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('symptom', 'diagnosis', 'medication', 'vital_sign')),
  metric_name TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(location, date, metric_type, metric_name)
);

CREATE INDEX idx_health_analytics_location ON health_analytics(location);
CREATE INDEX idx_health_analytics_date ON health_analytics(date DESC);
CREATE INDEX idx_health_analytics_metric ON health_analytics(metric_type, metric_name);
CREATE INDEX idx_health_analytics_location_date ON health_analytics(location, date DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chambers_updated_at BEFORE UPDATE ON chambers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_queue_entries_updated_at BEFORE UPDATE ON queue_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_records_updated_at BEFORE UPDATE ON health_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_analytics ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Patients can read their own data
CREATE POLICY "Patients can read own data" ON patients FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Patients can update own data" ON patients FOR UPDATE USING (user_id = auth.uid());

-- Doctors can read their own data
CREATE POLICY "Doctors can read own data" ON doctors FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Doctors can update own data" ON doctors FOR UPDATE USING (user_id = auth.uid());

-- Public can read active verified doctors
CREATE POLICY "Public can read active doctors" ON doctors FOR SELECT USING (is_active = TRUE AND is_verified = TRUE);

-- Patients can read their own appointments
CREATE POLICY "Patients can read own appointments" ON appointments FOR SELECT USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- Doctors can read their own appointments
CREATE POLICY "Doctors can read own appointments" ON appointments FOR SELECT USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Patients can read their own health records
CREATE POLICY "Patients can read own health records" ON health_records FOR SELECT USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- Doctors can read health records of their patients
CREATE POLICY "Doctors can read patient health records" ON health_records FOR SELECT USING (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) OR
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
);

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE health_analytics IS 'Aggregated health data for location-based insights and pandemic prediction';
COMMENT ON TABLE ai_insights IS 'AI-generated health insights, risk predictions, and pattern detections';
COMMENT ON TABLE ai_conversations IS 'AI conversation history for patient health assistant and doctor copilot';

