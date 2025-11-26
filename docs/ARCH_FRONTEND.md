# Nirnoy Care – Frontend Architecture (Current)

**Stack:**  
- Vite  
- React + TypeScript  
- Generated initially from `google-gemini/aistudio-repository-template`  
- Deployed locally via `npm run dev`

---

## 1. Folder Structure (High Level)

- `/components` – Reusable React components (UI building blocks).
- `/pages` – Top-level pages / route views.
- `/data` – Static data and mock doctor lists (used during prototype).
- `/services` – Client-side services:
  - Data fetching (currently mocks)
  - AI/Gemini calls
  - Voice/WebSocket logic
- `/types.ts` – Shared TypeScript types and interfaces.
- `App.tsx` – Root app layout and routing.
- `index.tsx` – React entrypoint, renders `<App />`.
- `index.html` – Vite HTML shell.
- `metadata.json` – AI Studio metadata.
- `package.json`, `tsconfig.json`, `vite.config.ts` – project config.

---

## 2. Pages (Conceptual)

> Exact filenames may differ; this describes the intended responsibilities.

- **Landing / Home Page**
  - Hero section with Nirnoy Care positioning.
  - Call-to-action for patient login / doctor login.
  - Possibly sections describing features.

- **Doctor Search Page**
  - Search and filter form (specialty, location, hospital, gender).
  - Doctor cards listing:
    - Name, specialty, experience, fees.
    - “View Profile” / “Book” button.

- **Doctor Profile / Booking Page**
  - Detailed doctor + chamber info.
  - Slot/Calendar selection UI.
  - Multi-step booking modal or side panel.

- **Patient Dashboard Page**
  - Summary cards (upcoming appointments, recent visits).
  - Charts for BP/weight trends.
  - Shortcut to open AI chat.

- **Doctor Dashboard Page (“Copilot”)**
  - Command center layout with:
    - Queue / schedule pane.
    - Clinical notes / SOAP area.
    - Business metrics/charts.
    - Inbox for patient/admin messages.
  - UI logic is implemented but data is mock/local.

- **About / Info Pages**
  - Static content about Nirnoy Care vision and team.

---

## 3. Components (Typical)

Examples (exact names may differ):

- **Layout Components**
  - `Navbar`, `Sidebar`, `Topbar`, `PageLayout`, etc.

- **Shared UI Elements**
  - `Card`, `Button`, `Modal`, `Table`, `Tabs`, `FormField`.

- **Healthcare-Specific Components**
  - `DoctorCard`, `AppointmentCard`, `QueueItem`, `VitalsChart`.

- **AI / Voice Components**
  - `ChatPanel` or `AIChatBox` for text chat.
  - `VoiceAssistant` / `VoiceWidget` for mic button, status, and waveform.

---

## 4. Services (Current Behavior)

> These are all **client-side** today. The goal is to gradually switch them to call a real backend.

- **Doctor Data Service**
  - Reads from `/data` or hard-coded arrays.
  - Provides filtered doctor lists to pages.

- **Booking Service**
  - Stores appointments in `localStorage`.
  - Returns lists of “bookings” from `localStorage` for dashboard views.

- **AI Service**
  - Calls Google Gemini APIs **directly from the browser**.
  - Uses `GEMINI_API_KEY` from `.env.local`.
  - Handles text-based chat for patients/doctors.

- **Voice Service**
  - Handles:
    - Mic capture (`getUserMedia`).
    - Client-side downsampling to 16kHz PCM.
    - WebSocket connection to Gemini Live API.
    - Audio playback through `AudioContext`.
  - This is the source of the current **inconsistent / breaking voice** behavior.

---

## 5. Frontend Responsibilities (Going Forward)

- Remains a **pure client**:
  - No direct model calls (no Gemini/OpenAI key here).
  - No direct DB writes.
- Talks only to:
  - Nirnoy Core Backend API (REST/GraphQL).
  - Nirnoy Voice Relay (WebSocket) for audio.

Any logic related to **business rules, AI prompts, persistence, or security** will gradually move out of the frontend and into backend/voice-relay services.
