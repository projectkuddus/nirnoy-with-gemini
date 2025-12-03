-- Create appointments table for storing bookings
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  serial_number INTEGER,
  visit_type TEXT DEFAULT 'new' CHECK (visit_type IN ('new', 'follow_up', 'report')),
  symptoms TEXT,
  fee INTEGER DEFAULT 500,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  chamber_name TEXT,
  chamber_address TEXT,
  is_guest_booking BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can see their own appointments
CREATE POLICY "Doctors can view their appointments" ON appointments
  FOR SELECT USING (
    auth.uid() = doctor_id OR 
    auth.uid() = patient_id OR
    auth.role() = 'service_role'
  );

-- Policy: Anyone can create appointments (for guest bookings)
CREATE POLICY "Anyone can create appointments" ON appointments
  FOR INSERT WITH CHECK (true);

-- Policy: Only doctors can update their appointments
CREATE POLICY "Doctors can update appointments" ON appointments
  FOR UPDATE USING (auth.uid() = doctor_id OR auth.role() = 'service_role');

-- Grant access
GRANT ALL ON appointments TO authenticated;
GRANT ALL ON appointments TO anon;
GRANT ALL ON appointments TO service_role;

-- Verify table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments'
ORDER BY ordinal_position;

