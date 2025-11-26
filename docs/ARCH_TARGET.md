# Nirnoy Care – Target System Architecture

Goal: Transform the current **frontend prototype** into a **military-grade SaaS platform** with clear separation of concerns.

---

## 1. High-Level Overview

The target system has **three main parts**:

1. **Frontend Web App (this repo)**
   - Vite + React + TypeScript.
   - Patient and Doctor dashboards, search, booking, AI/voice UI.

2. **Core Backend API (new)**
   - NestJS + TypeScript.
   - PostgreSQL database.
   - Handles all business logic, persistence, auth, and AI calls.

3. **Voice Relay Service (new)**
   - Node.js TypeScript microservice.
   - WebSocket server between browser and Gemini Live API.
   - Handles all audio resampling and streaming.

---

## 2. Frontend (Web)

- **Stack:** Vite, React, TypeScript.
- **Responsibilities:**
  - Render pages and dashboards (patients, doctors, admin later).
  - Manage local UI state and navigation.
  - Call backend REST APIs for:
    - Auth (login, refresh).
    - Doctor search, booking, appointments.
    - Patient ledger and graphs.
    - Text AI chat (patient/doctor copilots).
  - Open WebSocket connection to **Voice Relay Service** for voice sessions.

- **Must NOT do:**
  - Store API keys (Gemini/OpenAI/bKash/etc.).
  - Talk directly to Gemini or any model providers.
  - Write directly to databases.

---

## 3. Core Backend API

- **Stack:**
  - NestJS + TypeScript.
  - PostgreSQL (via Prisma or TypeORM).
  - JWT-based auth, RBAC.

- **Key Modules (initial):**
  - `AuthModule` – OTP login, JWT issuance, refresh tokens.
  - `UsersModule` – user profile, roles (PATIENT, DOCTOR, ADMIN).
  - `DoctorsModule` – doctor profiles, chambers, schedule templates.
  - `PatientsModule` – patient profiles, basic health data.
  - `AppointmentsModule` – booking, rescheduling, status updates.
  - `LedgerModule` – fees, paid/unpaid status, simple revenue reports.
  - `AiModule` – text-based AI endpoints (patient chat, doctor copilot).
  - `AuditModule` – logs for critical actions.

- **Responsibilities:**
  - Enforce business rules (no double booking, slot conflict checks).
  - Guarantee data integrity via transactions and constraints.
  - Store and retrieve all persistent data (users, appointments, notes).
  - Call external services:
    - SMS gateways (for OTP).
    - Payment gateways (bKash, Nagad, etc.) – later.
    - AI providers (Gemini, OpenAI) for text copilots.
  - Expose REST/GraphQL APIs to the frontend.

---

## 4. Voice Relay Service

- **Stack:**
  - Node.js + TypeScript.
  - WebSocket server.
  - `ffmpeg` or similar library for audio resampling.

- **Responsibilities:**
  - Handle **all** interaction with Gemini Live / other streaming AI.
  - Accept audio from browsers at 44.1/48kHz (or whatever hardware provides).
  - Convert audio to **16kHz, 16-bit, mono PCM** required by Gemini Live.
  - Maintain stable WebSocket connection to Gemini Live:
    - Handle handshake, auth, heartbeat.
    - Stream audio in and out.
    - Recover from transient errors gracefully.
  - Stream output back to frontend:
    - Audio chunks (PCM / encoded).
    - Optional partial transcripts.

- **Security:**
  - Gemini API key lives **only** on this server.
  - No model credentials in frontend.
  - Optional: authenticate voice sessions with a JWT from the core backend.

---

## 5. Data Model (High-Level)

Core tables in PostgreSQL (simplified):

- `users` – base user table (id, phone, role).
- `patients` – FK to users, health-related fields.
- `doctors` – FK to users, specialty, degrees, fees.
- `clinics` – physical locations / chambers.
- `doctor_clinics` – mapping doctor ↔ clinic.
- `doctor_schedules` – weekly templates (day, start_time, end_time, slot_length).
- `appointments` – patient ↔ doctor ↔ clinic ↔ slot info, status.
- `visit_notes` – notes, SOAP, summaries.
- `vitals` – BP, weight, sugar, etc.
- `ai_sessions` – logs of AI chats (metadata, not full text).
- `audit_logs` – security-relevant actions.

The **frontend** should never talk to these tables directly; it uses the NestJS API.

---

## 6. Data & Control Flows (Examples)

### 6.1 Booking Flow (Patient)

1. Patient selects doctor and slot on frontend.
2. Frontend calls backend: `POST /appointments`.
3. Backend:
   - Validates JWT (patient).
   - Checks slot availability in DB.
   - Creates appointment in a transaction.
   - Returns confirmation.
4. Frontend updates UI and optionally calls backend to trigger SMS.

### 6.2 Patient Text Chat with AI

1. Patient opens chat UI and sends text.
2. Frontend calls `POST /ai/patient-chat` with:
   - `patientId`, message, context flags.
3. Backend:
   - Fetches recent visits/vitals.
   - Constructs prompt (Bangla + English hybrid).
   - Calls Gemini/OpenAI.
   - Stores minimal metadata in `ai_sessions`.
   - Returns the reply.
4. Frontend displays reply.

### 6.3 Voice Booking Session

1. Patient clicks mic button in frontend.
2. Frontend:
   - Authenticates (JWT).
   - Opens WebSocket to Voice Relay: `wss://voice.nirnoy.com/voice?token=...`.
   - Streams raw audio chunks from mic to relay.
3. Voice Relay:
   - Resamples audio to 16kHz PCM.
   - Streams to Gemini Live with proper context (Bangla prompts + doctor list).
   - Receives audio + text from Gemini.
4. Relay sends audio chunks back to frontend.
5. When Gemini decides a booking should be made, Relay:
   - Calls Core Backend API (`POST /appointments`) on behalf of the user (with auth).
6. Frontend plays responses, updates UI with confirmation.

---

## 7. Non-Functional Targets

- **Security**
  - JWT + RBAC on all APIs.
  - Encrypted connections (HTTPS, WSS).
  - No secrets in frontend.

- **Reliability**
  - Voice relay auto-reconnect logic and proper error codes.
  - Backend uses proper DB migrations and backup strategy.

- **Observability**
  - Centralized logging for backend and voice relay.
  - Basic metrics: request count, latency, error rate, voice session success rate.

This architecture is the reference for all future development and for Cursor-based refactors.
