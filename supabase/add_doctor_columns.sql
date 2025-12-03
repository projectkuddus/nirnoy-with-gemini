-- Add missing columns to doctors table for profile updates
-- Run this in Supabase SQL Editor

-- Add bio column
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add follow_up_fee column
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS follow_up_fee INTEGER DEFAULT 500;

-- Add qualifications column if not exists
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualifications TEXT[];

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'doctors'
ORDER BY ordinal_position;

