#!/usr/bin/env node
/**
 * Nirnoy Health - Database Setup Script
 * Run this to create all tables in Supabase
 * 
 * Usage: node scripts/setup-database.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cmbgrjkigxfzlcaqzgkk.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    MANUAL SETUP REQUIRED                       ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Please run the SQL schema manually in Supabase:               ║
║                                                                ║
║  1. Go to: https://supabase.com/dashboard/project/             ║
║            cmbgrjkigxfzlcaqzgkk/sql/new                        ║
║                                                                ║
║  2. Copy the contents of: supabase/schema.sql                  ║
║                                                                ║
║  3. Paste in the SQL editor and click "Run"                    ║
║                                                                ║
║  OR use the service role key:                                  ║
║  SUPABASE_SERVICE_KEY=xxx node scripts/setup-database.mjs      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const schema = `
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(255),
    name_bn VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    blood_group VARCHAR(5),
    address TEXT,
    city VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- More tables would be added here...
`;

async function runMigration() {
  console.log('🚀 Running database migration...');
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: schema });
    
    if (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();

