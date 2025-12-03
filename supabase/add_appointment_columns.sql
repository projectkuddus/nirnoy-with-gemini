-- Add new columns for family booking support and better tracking
-- Run this in Supabase SQL Editor

-- Add family booking columns
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_family_booking BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS family_relation TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booked_by_id UUID REFERENCES profiles(id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_booked_by_id ON appointments(booked_by_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);

-- Update RLS policies to allow patients to see their bookings
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Allow patients to view their appointments" ON appointments;
DROP POLICY IF EXISTS "Allow patients to create appointments" ON appointments;
DROP POLICY IF EXISTS "Allow doctors to view their appointments" ON appointments;

-- Create new policies
CREATE POLICY "Allow patients to view their appointments" ON appointments
  FOR SELECT USING (
    auth.uid() = patient_id 
    OR auth.uid() = booked_by_id
    OR auth.uid() = doctor_id
  );

CREATE POLICY "Allow patients to create appointments" ON appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow doctors to view their appointments" ON appointments
  FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Allow doctors to update their appointments" ON appointments
  FOR UPDATE USING (auth.uid() = doctor_id);

-- Grant access
GRANT ALL ON appointments TO authenticated;
GRANT ALL ON appointments TO anon;
GRANT ALL ON appointments TO service_role;

-- Show success message
SELECT 'Appointment columns added successfully!' as status;

