# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nirnoy.ai** is a production-grade Bangla-first healthcare platform for Bangladesh serving patients, doctors, and families. The platform enables patients to find doctors, book appointments, and manage health records, while doctors get a comprehensive dashboard ("Digital Cockpit") for managing clinical workflow, notes, and business metrics.

### Scale Requirements

This system must reliably handle:
- **5,000+ concurrent paid users**
- **1,000+ active doctors**
- **500+ families**
- **10,000+ active appointments** simultaneously

**No glitches. Fast responses. Production-quality code.**

### Current Status
- Frontend: React/TypeScript UI with Supabase integration (migrating from localStorage)
- Backend: Node.js/Express or Next.js API routes with Supabase Postgres
- Voice AI: Google Gemini Live API integration (unstable, needs server-side relay)
- Future: Multi-AI support (Gemini, Claude, others)

## Coding Principles

When working on this codebase, always follow these rules:

1. **Production Quality:** Write clean, explicit, production-grade code. No shortcuts or hacks.

2. **Design for Scale:**
   - Use proper Postgres schema with indexes and constraints
   - Wrap critical operations in database transactions
   - Implement queues for asynchronous operations (emails, notifications)
   - Consider connection pooling and query optimization

3. **Efficient AI Usage:**
   - Keep prompts small and focused
   - Set sensible max_tokens limits
   - Cache responses when appropriate
   - Never make unnecessary AI calls
   - Plan for multi-AI provider support (Gemini, Claude, others)

4. **Security & Configuration:**
   - Never invent secrets or API keys
   - Always use environment variables for configuration
   - Keep sensitive data out of version control
   - Validate all user inputs

5. **Clear Communication:**
   - When changing code, explain what and why
   - If something is ambiguous, choose the simplest sane solution and move forward
   - Document non-obvious design decisions

## Tech Stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js/Express or Next.js API routes
- **Database:** Supabase Postgres (with Row Level Security)
- **Real-time:** Supabase Realtime subscriptions
- **Auth:** Supabase Auth (JWT-based)
- **AI:** Google Gemini (primary), Claude & others (future)
- **Voice:** Gemini Live API (needs server-side relay)

## Development Commands

### Frontend (Root: `nirnoy-with-gemini/`)

```bash
# Install dependencies
npm install

# Run development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend API (`backend/nirnoy-api/`)

**Note:** Current backend uses NestJS structure, but may migrate to Next.js API routes or Express.

```bash
# Navigate to backend
cd backend/nirnoy-api

# Install dependencies
npm install

# Start development server with hot-reload
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov

# Database operations (Prisma/Supabase)
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema changes to database
npm run db:seed        # Seed database with initial data
npm run db:reset       # Reset database and reseed

# Linting and formatting
npm run lint           # Lint and auto-fix TypeScript files
npm run format         # Format code with Prettier
```

### Supabase Local Development

```bash
# Start Supabase locally (if using Supabase CLI)
npx supabase start

# Stop Supabase
npx supabase stop

# Reset database
npx supabase db reset

# Generate TypeScript types from database
npx supabase gen types typescript --local > types/supabase.ts
```

## Architecture

### Three-Tier System

1. **Frontend (Vite + React + TypeScript)**
   - Patient/Doctor/Family dashboards, search, booking UI
   - Voice AI interface (needs server-side relay for production)
   - Supabase client for real-time subscriptions and auth
   - **Must NOT** store API keys or make direct AI calls in production

2. **Backend API (Node.js/Express or Next.js API Routes)**
   - Location: `backend/nirnoy-api/` (current) or Next.js `/api` routes (future)
   - **Database:** Supabase Postgres with Row Level Security (RLS)
   - **Auth:** Supabase Auth with JWT tokens
   - **Modules:** Auth, Users, Doctors, Patients, Appointments, Families, Notifications, Queue
   - Handles all business logic, data validation, and external service calls
   - **Scale Considerations:**
     - Connection pooling for 10,000+ concurrent operations
     - Database indexes on frequently queried fields (doctor_id, patient_id, appointment_time)
     - Transactions for booking conflicts (prevent double-booking)
     - Rate limiting and caching for public APIs
     - Queue system for async operations (emails, SMS, notifications)

3. **Voice Relay Service (In Progress)**
   - Node.js WebSocket service for production voice features
   - Audio resampling (44.1/48kHz → 16kHz PCM) via ffmpeg
   - Gemini Live API integration (server-side only)
   - JWT authentication for voice sessions
   - Auto-reconnect and error recovery

### Frontend Structure

- `/components` - Reusable React components (DoctorCard, AppointmentCard, VoiceWidget, etc.)
- `/pages` - Top-level route views (Landing, DoctorSearch, PatientDashboard, DoctorDashboard)
- `/services` - Client-side services (API calls, Gemini integration, Supabase client)
- `/contexts` - React contexts (AuthContext, LanguageContext)
- `/hooks` - Custom React hooks (useQueueSocket, useSupabaseRealtime)
- `/data` - Mock data (will be removed when backend is fully integrated)
- `/types.ts` - Shared TypeScript interfaces

### Backend Structure

Current structure (`backend/nirnoy-api/src/`):
- `/auth` - Authentication (OTP login, JWT, Supabase Auth integration)
- `/doctors` - Doctor profiles, chambers, schedules, availability
- `/patients` - Patient profiles, health records, vitals
- `/families` - Family account management, shared access
- `/appointments` - Booking logic, slot management, status tracking, conflict prevention
- `/queue` - Real-time queue management via Supabase Realtime
- `/notifications` - SMS/email/push notifications (queued)
- `/admin` - Admin operations and analytics
- `/prisma` or `/supabase` - Database client and migrations

Future consideration: Migrate to Next.js API routes for serverless scalability.

## Critical Technical Details

### Voice AI (Current Blocker)

**Problem:** Gemini Live API requires strict 16kHz PCM audio. Browser audio capture is 44.1/48kHz. Current client-side downsampling is unreliable, causing connection failures.

**Solution:** Move audio processing to server-side relay service with proper resampling (ffmpeg/similar).

**Agents:**
- Yunus (Male) - Authoritative, helpful (support/booking)
- Arisha (Female) - Empathetic, welcoming (general inquiry)

### Data Flow Examples

**Booking Flow (Production):**
1. Frontend calls `POST /api/appointments` with JWT
2. Backend:
   - Validates JWT and user permissions
   - Begins database transaction
   - Checks slot availability with `SELECT FOR UPDATE` (row-level lock)
   - Validates no conflicts (no double-booking)
   - Creates appointment record
   - Commits transaction
   - Queues SMS notification (async)
   - Returns confirmation
3. Frontend updates UI immediately
4. Real-time notification sent to doctor via Supabase Realtime

**Voice Booking Session (Production):**
1. Frontend opens WebSocket to Voice Relay (`wss://voice.nirnoy.ai`) with JWT
2. Voice Relay:
   - Validates JWT with backend
   - Resamples audio stream to 16kHz PCM
   - Forwards to Gemini Live with Bangla system prompts + available doctors context
   - Streams AI responses back to frontend
3. When user confirms booking verbally:
   - Relay calls Backend API `POST /api/appointments` with user's JWT
   - Backend processes as normal booking flow
   - Confirmation spoken back to user

**Real-time Queue Updates:**
1. Doctor checks in patient via dashboard
2. Backend updates appointment status in Supabase
3. Supabase broadcasts change via Realtime subscription
4. All connected clients (patient app, doctor dashboard) receive instant update
5. No polling required - event-driven architecture

### Bangla Language Requirement

- UI must be Bengali-first (Standard Bangladeshi Bangla, not West Bengal dialect)
- All AI prompts and voice personas must use local Bangla
- System must build trust through native language support

## Environment Variables

**Never commit secrets to version control. Use `.env.local` and environment variable managers.**

### Frontend (`.env.local`)
```bash
# Supabase (from Supabase dashboard)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# AI Services (backend should handle in production, but needed for prototyping)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Backend API
VITE_API_URL=http://localhost:3001
VITE_VOICE_RELAY_URL=ws://localhost:3002
```

### Backend (`.env`)
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# JWT (if not using Supabase Auth exclusively)
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# AI Providers
GEMINI_API_KEY=your_gemini_api_key_here
ANTHROPIC_API_KEY=your_claude_api_key_here  # Future

# SMS Gateway (GreenWeb BD or Twilio)
SMS_PROVIDER=greenwebbd
SMS_API_KEY=your_sms_api_key
SMS_API_SECRET=your_sms_api_secret

# Email Service
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key

# Payment (bKash, Nagad - future)
BKASH_APP_KEY=your_bkash_key
NAGAD_MERCHANT_ID=your_nagad_merchant_id

# Production settings
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

See `.env.example` for full template.

## Database Schema (Supabase Postgres)

### Core Tables

**users** - Base user accounts
- `id` (uuid, PK)
- `phone` (varchar, unique, indexed)
- `email` (varchar, unique, indexed, nullable)
- `role` (enum: PATIENT, DOCTOR, ADMIN)
- `created_at`, `updated_at`
- **RLS:** Users can only read/update their own data

**patients** - Patient profiles (extends users)
- `user_id` (uuid, FK → users, PK)
- `full_name`, `date_of_birth`, `gender`, `blood_group`
- `family_id` (uuid, FK → families, nullable)
- `emergency_contact`
- **Index:** `family_id`, `created_at`

**families** - Family account management
- `id` (uuid, PK)
- `primary_user_id` (uuid, FK → users)
- `family_name`, `subscription_tier`
- `max_members`
- **Enables:** Shared appointments, family health history

**doctors** - Doctor profiles (extends users)
- `user_id` (uuid, FK → users, PK)
- `full_name`, `specialty`, `degrees`, `experience_years`
- `consultation_fee`, `follow_up_fee`
- `license_number` (unique, indexed)
- `rating` (numeric), `total_patients` (integer)
- **Index:** `specialty`, `rating`, `consultation_fee`

**clinics** - Physical chambers/locations
- `id` (uuid, PK)
- `name`, `address`, `city`, `area`, `coordinates` (geography)
- `phone`, `facilities` (jsonb)
- **Index:** `city`, `area`, geography index on `coordinates`

**doctor_clinics** - Many-to-many mapping
- `doctor_id` (uuid, FK → doctors)
- `clinic_id` (uuid, FK → clinics)
- `consultation_fee_override` (nullable)
- **Composite PK:** (doctor_id, clinic_id)

**doctor_schedules** - Weekly availability templates
- `id` (uuid, PK)
- `doctor_id` (uuid, FK → doctors, indexed)
- `clinic_id` (uuid, FK → clinics, indexed)
- `day_of_week` (0-6)
- `start_time`, `end_time`, `slot_duration_minutes`
- `max_patients_per_slot`
- **Index:** (doctor_id, clinic_id, day_of_week)
- **Unique:** Prevent overlapping schedules

**appointments** - Booking records
- `id` (uuid, PK)
- `patient_id` (uuid, FK → patients, indexed)
- `doctor_id` (uuid, FK → doctors, indexed)
- `clinic_id` (uuid, FK → clinics, indexed)
- `appointment_time` (timestamptz, indexed)
- `status` (enum: PENDING, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
- `serial_number` (integer) - queue position
- `booking_fee_paid` (boolean), `consultation_fee_paid` (boolean)
- `created_at`, `updated_at`
- **Critical Indexes:**
  - (doctor_id, appointment_time) - prevent double-booking
  - (patient_id, appointment_time) - patient history
  - (clinic_id, appointment_time, status) - clinic queue
- **Constraint:** UNIQUE (doctor_id, appointment_time) - enforce no double-booking
- **RLS:** Patients see their own, doctors see their patients

**visit_notes** - Clinical documentation
- `id` (uuid, PK)
- `appointment_id` (uuid, FK → appointments, unique)
- `soap_note` (jsonb) - {subjective, objective, assessment, plan}
- `prescription` (jsonb)
- `created_at`, `updated_at`
- **Index:** appointment_id
- **RLS:** Only assigned doctor can write, patient can read

**vitals** - Patient health metrics
- `id` (uuid, PK)
- `patient_id` (uuid, FK → patients, indexed)
- `recorded_at` (timestamptz, indexed)
- `blood_pressure_systolic`, `blood_pressure_diastolic`
- `weight_kg`, `height_cm`, `temperature_celsius`
- `blood_sugar_mg_dl`, `heart_rate_bpm`
- **Index:** (patient_id, recorded_at DESC) - for trend queries

### Production Scale Considerations

1. **Transaction Isolation:** Use `SELECT FOR UPDATE` when checking appointment slots
2. **Partitioning:** Consider partitioning `appointments` by date for tables > 10M rows
3. **Archiving:** Move completed appointments > 6 months to archive table
4. **Connection Pooling:** Use pgBouncer or Supabase pooling for 5000+ concurrent users
5. **Real-time Subscriptions:** Use Supabase Realtime for queue updates, not polling

**Frontend must NEVER access database directly - always through backend API or Supabase RLS-protected endpoints.**

## Production Quality Standards

1. **Reliability - "Military Grade"**
   - Zero tolerance for data loss
   - Target 99.9% uptime
   - No double-booking race conditions (use transactions + row locks)
   - Graceful error handling and recovery
   - Database backups and point-in-time recovery

2. **Performance at Scale**
   - Support 5,000+ concurrent users without degradation
   - API response times: p95 < 500ms, p99 < 1000ms
   - Database queries optimized with proper indexes
   - Connection pooling configured for peak load
   - CDN for static assets

3. **Security**
   - No API keys or secrets in frontend code
   - JWT-based authentication via Supabase Auth
   - Row Level Security (RLS) on all database tables
   - Input validation and sanitization on all endpoints
   - Rate limiting to prevent abuse
   - HTTPS/WSS only in production

4. **Code Quality**
   - TypeScript strict mode enabled
   - Clear, explicit code - no clever tricks
   - Production-grade error handling
   - Comprehensive logging (structured JSON logs)
   - Unit tests for critical business logic

5. **Bangla-First Experience**
   - All user-facing text in Standard Bangladeshi Bangla
   - AI prompts and voice personas use local Bangla dialect
   - English as secondary language
   - System builds trust through native language support

6. **Separation of Concerns**
   - Frontend = UI and user interactions only
   - Backend = business logic, validation, data persistence
   - Voice Relay = audio processing and AI integration
   - No business logic in frontend components

## Critical Issues & Migration Status

### High Priority

1. **Voice AI Relay Service** (Blocker for production voice features)
   - **Current:** Client-side audio processing is unstable (sample rate mismatch)
   - **Needed:** Server-side WebSocket relay service with ffmpeg resampling
   - **Impact:** Voice booking is unreliable without this

2. **Backend API Migration** (In Progress)
   - **Current:** Frontend uses localStorage + mock data
   - **Needed:** Complete backend API with Supabase integration
   - **Modules:** Appointments, Doctors, Patients, Families, Notifications

3. **Database Schema Implementation**
   - **Current:** Partial schema in `backend/nirnoy-api/prisma/`
   - **Needed:** Full Supabase schema with RLS policies and indexes
   - **Critical:** Double-booking prevention via transaction locks

### Medium Priority

4. **SMS Gateway Integration**
   - OTP for authentication
   - Appointment confirmations and reminders
   - Queue status updates

5. **Production Deployment**
   - Frontend: Vercel or Cloudflare Pages
   - Backend: Vercel Serverless, Railway, or Render
   - Voice Relay: Dedicated server or fly.io
   - Database: Supabase production tier

## Roadmap

### Phase 1: Production Foundation (Current)
- ✅ Frontend UI and components
- 🔄 Complete backend API with Supabase
- 🔄 Implement server-side voice relay
- 🔄 SMS/OTP authentication
- 🔄 Double-booking prevention (transactions)
- ⬜ Load testing for 5,000+ concurrent users
- ⬜ Production deployment and monitoring

### Phase 2: Payments & Advanced Features
- ⬜ bKash/Nagad payment integration
- ⬜ Family account management
- ⬜ WebRTC telemedicine (video consultations)
- ⬜ Pharmacy e-prescription integration
- ⬜ Multi-AI provider support (add Claude AI)
- ⬜ Advanced analytics for doctors

### Phase 3: Scale & Expansion
- ⬜ Hospital enterprise OS (multi-doctor management)
- ⬜ Mobile apps (React Native)
- ⬜ International expansion (West Bengal, Middle East)
- ⬜ Insurance integrations
- ⬜ Lab integration for test results

## AI Integration Guidelines

### Current: Google Gemini
- Use for text chat (patient Q&A, doctor copilot)
- Use Gemini Live for voice (via relay service)
- Keep prompts concise (< 1000 tokens)
- Set max_tokens appropriately (e.g., 500 for simple responses)

### Future: Multi-AI Support
- **Claude (Anthropic):** More nuanced medical reasoning, safer outputs
- **Gemini:** Fast responses, multimodal (voice + vision)
- **Strategy:** Route requests based on task complexity and cost
  - Simple Q&A → Gemini (fast, cheap)
  - Clinical reasoning → Claude (accurate, safe)
  - Voice → Gemini Live (real-time optimized)

### Safety Rules for Medical AI
1. Never give definitive diagnoses - always suggest seeing a doctor
2. Include disclaimers on all AI-generated medical content
3. Log all AI interactions for audit and quality improvement
4. Implement content filtering for inappropriate medical advice
5. Human (doctor) review for prescription suggestions

## Important Development Notes

- **Working directory:** `nirnoy-with-gemini/` (not the parent `nirnoy3/`)
- **Frontend commands:** Run from repo root
- **Backend commands:** Run from `backend/nirnoy-api/`
- **Documentation:** See `/docs/` for detailed specs (MASTER_HANDOVER.md, PRD.md, ARCH_FRONTEND.md, ARCH_TARGET.md)
- **Current focus:** Backend migration and production-grade reliability
- **Scale target:** 5,000 concurrent users, 10,000 active appointments, zero data loss
