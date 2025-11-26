# Nirnoy Care – Product Requirements Document (PRD)
**Version:** 3.0 (Voice-Enabled Prototype → SaaS Product)  
**Owner:** Asif Salman (Co-founder)  
**Last Updated:** 2025-XX-XX

---

## 1. Product Overview

Nirnoy Care is a **Bangla-first healthcare OS** for Bangladesh.  
Initial release = web app (mobile-friendly) for:

- Patients to find doctors, book visits, and keep a health ledger.
- Doctors to manage clinic workflow, clinical notes, and business metrics.
- Future: extensions for hospitals and telemedicine.

---

## 2. Goals & Success Metrics

### 2.1 Goals

1. Reduce waiting time and confusion in Dhaka healthcare.
2. Give doctors a **single cockpit** for clinical + business decisions.
3. Make the system accessible for everyone via **Bangla UI + Voice**.

### 2.2 Success Metrics (MVP+)

- **Booking Reliability:** < 0.1% double-bookings or failed writes.
- **Voice Success Rate:** ≥ 95% of voice sessions complete without technical error.
- **Patient Retention:** ≥ 40% of users who book once return within 3 months.
- **Doctor Adoption:** ≥ 50% of active doctors use dashboard weekly.

---

## 3. User Personas

### 3.1 Patient – “Rafiq, 32”

- Middle-class, lives in Dhaka.
- Uses smartphone daily (Facebook, YouTube, bKash).
- Wants:
  - Easy doctor search in Bangla.
  - Clear fees and locations.
  - Simple follow-up system and reminders.

### 3.2 Doctor – “Dr. Ayesha, 38”

- Specialist in a private chamber.
- Manages 20–40 patients per session day.
- Wants:
  - Clear queue.
  - No double-booking.
  - Quick access to previous visit notes.
  - A simple view of revenue and no-show rates.

### 3.3 Admin – “Chamber Manager”

- Manages multiple doctors and staff.
- Needs:
  - View of all upcoming sessions.
  - Control over slot templates and fees.
  - Basic reports.

---

## 4. Core Features (v3.0 Scope)

### 4.1 Patient Web App

- **Sign-up / Login**
  - Phone + OTP-based login (Bangladesh numbers).
  - JWT-based session.

- **Doctor Search**
  - Filter by:
    - Specialty
    - Location/Area
    - Hospital/Chamber
    - Gender
  - Sort by:
    - Earliest available slot
    - Fee
  - View profile:
    - Name, degrees, specialty, experience.
    - Chambers and timing.
    - Fee per visit.

- **Booking Flow**
  - Step 1: Choose doctor.
  - Step 2: Choose chamber & date.
  - Step 3: Choose time slot.
  - Step 4: Confirm details (name, phone, reason).
  - Step 5: Confirmation screen + SMS/WhatsApp message.

- **My Appointments**
  - List upcoming and past visits.
  - Basic status: Confirmed, Completed, Cancelled, No-Show.
  - Option to rebook or cancel in advance.

- **Health Ledger (Basic)**
  - Timeline view:
    - Past visits
    - BP, weight, sugar readings
  - Simple graphs for trends.

---

### 4.2 Doctor Dashboard (Web)

- **Auth & Profile**
  - Secure login (OTP/email for now, later SSO).
  - Profile management (bio, fees, schedule).

- **Today’s Queue**
  - See all patients for the current session.
  - Status per patient: Waiting, In-Consultation, Completed, No-Show.
  - Manual override controls.

- **Slot Management**
  - Define weekly templates:
    - Day → start time, end time, slot length, capacity.
  - Override for specific days (cancel session, add extra slots).

- **Clinical Copilot (MVP)**
  - Text area for:
    - Chief complaint
    - History, exam findings, plan.
  - AI summarization into SOAP note (server-side).

- **Business Copilot (MVP)**
  - Basic charts:
    - Patients per day/week.
    - Estimated revenue per period.
    - No-show percentage.

---

### 4.3 Voice & AI

- **Voice Assistant**
  - Bangla-first voice interface for:
    - Finding a doctor (“Medicine doctor Gulshan-e kobe free asen?”).
    - Booking a slot.
    - Basic guidance (“ei report niye ki korte hobe?” – answer must always suggest consulting a doctor).

- **Text AI Chat**
  - Separate chat for:
    - Patient Q&A (general health guidance, not diagnosis).
    - Doctor copilot (note drafting, message drafting, patient explanation).

**Critical Rules:**

- AI never gives final diagnosis or prescription.
- AI always encourages seeing a doctor for anything serious.

---

### 4.4 Admin Panel (Future v3.x, not v3.0 hard requirement)

- Super admin to:
  - Onboard new doctors.
  - Manage clinics.
  - Monitor basic system metrics.

---

## 5. Non-Functional Requirements

- **Language:** Bangla-first UI and AI, with English as secondary.
- **Security:** JWT, RBAC (Patient, Doctor, Admin), audit logs for critical actions.
- **Performance:** P95 booking API < 500ms under load.
- **Availability:** Target 99.5% uptime for core APIs.
- **Compliance:** Follow good practices for health data privacy (encryption at rest and in transit, minimal exposure).

---

## 6. Out of Scope (for now)

- Full hospital EMR.
- Insurance integrations.
- Complex lab integrations.
- Full prescription generation with drug databases.
