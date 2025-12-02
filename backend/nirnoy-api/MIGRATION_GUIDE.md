# Step 1: Database Migration Guide

## Overview

This guide walks you through migrating from SQLite to PostgreSQL/Supabase with:
- ✅ Proper indexes for performance (5,000+ concurrent users)
- ✅ Unique constraints to prevent double-booking
- ✅ Connection pooling via pgBouncer
- ✅ New tables for AI conversations and token tracking (replacing localStorage)

---

## Prerequisites

1. **Supabase Account** - Create one at [supabase.com](https://supabase.com)
2. **Node.js 18+** - Verify: `node --version`
3. **pnpm/npm** - Package manager

---

## Step 1: Get Supabase Credentials

### 1.1 Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Project name: `nirnoy-production` (or your choice)
5. Database password: **Save this securely!**
6. Region: Choose closest to Bangladesh (e.g., Singapore)
7. Click "Create new project"

### 1.2 Get Connection Strings

Once your project is ready:

1. Go to **Settings → Database**
2. Scroll down to **Connection string**
3. Select **Connection Pooling (Port 6543)** tab
4. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
   ```
5. Replace `[YOUR-PASSWORD]` with your database password
6. Also copy the **Direct connection** string from the **Session mode** tab:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

---

## Step 2: Update Environment Variables

### 2.1 Update `.env` File

Open `backend/nirnoy-api/.env` and update:

```bash
# ============ DATABASE (Supabase PostgreSQL) ============
# Pooler connection (for app runtime - port 6543)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:6543/postgres?pgbouncer=true&connection_limit=20"

# Direct connection (for migrations only - port 5432)
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"
```

**Important:**
- Use **port 6543** (pgBouncer pooler) for `DATABASE_URL`
- Use **port 5432** (direct) for `DIRECT_URL`
- Add `?pgbouncer=true&connection_limit=20` to DATABASE_URL

### 2.2 Verify Other Variables

Ensure these are also set:

```bash
JWT_SECRET="your-strong-secret-here"
GEMINI_API_KEY="your-gemini-key"
FRONTEND_URL="http://localhost:5173"
```

---

## Step 3: Install Dependencies

```bash
cd backend/nirnoy-api

# Install PostgreSQL driver
npm install pg

# Install all dependencies
npm install
```

---

## Step 4: Run Database Migration

### 4.1 Generate Prisma Client

```bash
npx prisma generate
```

This generates the TypeScript types for your database models.

### 4.2 Create and Apply Migration

```bash
# Create migration (will detect schema changes)
npx prisma migrate dev --name postgres_with_indexes_and_constraints

# This will:
# 1. Create migration files in prisma/migrations/
# 2. Apply migration to Supabase
# 3. Generate Prisma Client
```

**Expected output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres"

Applying migration `20251210000000_postgres_with_indexes_and_constraints`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251210000000_postgres_with_indexes_and_constraints/
    └─ migration.sql

✔ Generated Prisma Client (5.22.0)
```

### 4.3 Verify Migration

```bash
# Open Prisma Studio to view database
npx prisma studio
```

This opens `http://localhost:5555` where you can see all tables.

---

## Step 5: Verify Database Schema

### 5.1 Check Tables Created

Connect to Supabase:

1. Go to **Supabase Dashboard → Table Editor**
2. Verify these tables exist:
   - ✅ User
   - ✅ Doctor
   - ✅ Patient
   - ✅ Appointment
   - ✅ DoctorChamber
   - ✅ Clinic
   - ✅ **Otp** (new - for OTP validation)
   - ✅ **AiConversation** (new - replaces localStorage)
   - ✅ **AiTokenUsage** (new - replaces localStorage)

### 5.2 Verify Critical Constraint

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- Check the unique constraint exists
SELECT
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = '"Appointment"'::regclass
  AND conname = 'unique_appointment_slot';
```

**Expected result:** One row showing the unique constraint.

### 5.3 Verify Indexes

```sql
-- Check all indexes on Appointment table
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'Appointment'
ORDER BY indexname;
```

**Expected indexes:**
- `unique_appointment_slot` (unique constraint index)
- `Appointment_patientId_status_idx`
- `Appointment_doctorId_date_idx`
- `Appointment_chamberId_date_status_idx`
- `Appointment_date_status_idx`
- `Appointment_status_idx`
- `Appointment_bookedAt_idx`

---

## Step 6: Seed Database (Optional)

If you want sample data:

```bash
npm run db:seed
```

This will create:
- Sample doctors
- Sample chambers
- Sample patients

---

## Step 7: Start the Backend

### 7.1 Development Mode

```bash
npm run start:dev
```

**Expected output:**
```
[Nest] 12345  - 12/10/2024, 10:30:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345  - 12/10/2024, 10:30:00 AM     LOG [InstanceLoader] ConfigModule dependencies initialized +50ms
[Nest] 12345  - 12/10/2024, 10:30:00 AM     LOG [InstanceLoader] PrismaModule dependencies initialized +10ms
[Nest] 12345  - 12/10/2024, 10:30:01 AM     LOG [PrismaService] ✅ Database connected with connection pooling enabled
[Nest] 12345  - 12/10/2024, 10:30:01 AM     LOG [PrismaService] 📊 Using pgBouncer pooling mode (session pooling)
[Nest] 12345  - 12/10/2024, 10:30:01 AM     LOG [NestApplication] Nest application successfully started +150ms
```

### 7.2 Test API

```bash
# Test health endpoint
curl http://localhost:4000/health

# Expected response:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-12-10T10:30:00.000Z"
}
```

### 7.3 Test Doctor Search (with indexes)

```bash
# This should be fast (< 100ms) thanks to indexes
curl "http://localhost:4000/api/doctors?specialty=Cardiology" | jq
```

---

## Step 8: Update Frontend to Remove localStorage

The frontend needs to stop using localStorage for appointments and AI conversations.

### 8.1 Update Frontend .env

Update `nirnoy-with-gemini/.env.local`:

```bash
# Backend API URL
VITE_API_URL=http://localhost:4000/api

# Supabase (optional - if using Supabase client directly)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 8.2 Remove localStorage Keys

These localStorage keys are now replaced by database tables:

| Old localStorage Key | New Database Table |
|---------------------|-------------------|
| `nirnoy_appointments_v4` | `Appointment` table |
| `nirnoy_ai_conversations` | `AiConversation` table |
| `nirnoy_ai_tokens_used` | `AiTokenUsage` table |

**Keep only:** `nirnoy_session` (for JWT token - short-lived)

---

## Step 9: Verify Connection Pooling

### 9.1 Check Active Connections

In **Supabase Dashboard → Database → Connection pooler**:

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity
WHERE datname = 'postgres';
```

With pgBouncer, you should see:
- **< 20 connections** even under load
- Without pgBouncer, this would be **100+** connections at scale

### 9.2 Monitor Performance

```sql
-- Check query performance
SELECT
  calls,
  mean_exec_time,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

All queries should be **< 50ms** thanks to indexes.

---

## Troubleshooting

### Issue: "Can't reach database server"

**Solution:**
1. Check your DATABASE_URL is correct
2. Verify Supabase project is running (not paused)
3. Check your IP is allowed (Supabase → Settings → Database → Network restrictions)

### Issue: "SSL connection required"

**Solution:** Add `?sslmode=require` to connection string:
```bash
DATABASE_URL="postgresql://...?pgbouncer=true&sslmode=require"
```

### Issue: "Too many connections"

**Solution:**
1. Verify you're using **port 6543** (pgBouncer), not 5432
2. Add `&connection_limit=20` to DATABASE_URL
3. Check Supabase pooler settings

### Issue: "Migration failed"

**Solution:**
```bash
# Reset and retry
npx prisma migrate reset
npx prisma migrate dev --name postgres_with_indexes_and_constraints
```

### Issue: "Cannot find module '@prisma/client'"

**Solution:**
```bash
npx prisma generate
npm install
```

---

## Performance Verification

### Test 1: Verify Indexes Work

```sql
-- This should use index scan (not sequential scan)
EXPLAIN ANALYZE
SELECT * FROM "Appointment"
WHERE "doctorId" = 1
  AND date = '2025-12-15'
ORDER BY "startTime";
```

**Expected:** `Index Scan using Appointment_doctorId_date_idx`

### Test 2: Verify Unique Constraint

Try to create duplicate appointment:

```bash
# Make request twice with same data
curl -X POST http://localhost:4000/api/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": 1,
    "chamberId": 1,
    "date": "2025-12-20",
    "startTime": "10:00",
    "endTime": "10:15"
  }'
```

**Expected:**
- First request: `201 Created`
- Second request: `400 Bad Request - "Time slot already booked"`

---

## Next Steps

After successful migration:

1. ✅ **Step 1 Complete** - Database migrated with indexes and constraints
2. ⏭️ **Step 2** - Fix double-booking with database transactions
3. ⏭️ **Step 3** - Move Gemini API to backend
4. ⏭️ **Step 4** - Implement OTP validation
5. ⏭️ **Step 5** - Add Redis caching
6. ⏭️ **Step 6** - Setup background job queues
7. ⏭️ **Step 7** - Add logging and monitoring
8. ⏭️ **Step 8** - Run load tests

---

## Files Changed in This Step

### New Files Created:
- `backend/nirnoy-api/.env.example` - Environment template
- `backend/nirnoy-api/MIGRATION_GUIDE.md` - This file
- `backend/nirnoy-api/prisma/migrations/[timestamp]_postgres_with_indexes_and_constraints/migration.sql` - Migration SQL

### Modified Files:
- `backend/nirnoy-api/prisma/schema.prisma` - Updated for PostgreSQL, added indexes, constraints, and new tables
- `backend/nirnoy-api/.env` - Added Supabase configuration
- `backend/nirnoy-api/src/prisma/prisma.service.ts` - Added connection pooling and logging

---

## Support

If you encounter issues:

1. Check Supabase logs: **Dashboard → Logs**
2. Check backend logs: `tail -f logs/combined.log`
3. Verify environment variables: `cat .env | grep DATABASE`
4. Test database connection: `npx prisma db pull`

**Migration successful?** You should now have:
- ✅ PostgreSQL with connection pooling
- ✅ Indexes for 5,000+ user performance
- ✅ Unique constraint preventing double-booking
- ✅ Tables for AI tracking (no more localStorage)
