📁 Nirnoy Care: Master Handover Document
Date: October 26, 2023
Status: Prototype Complete / Pre-Production
From: Technical Co-Founder
To: Engineering Team
1. The High-Level Vision: 'Military Grade' Healthcare
The Goal: To build the "Operating System for Healthcare" in Bangladesh—not just a booking app, but a comprehensive digital infrastructure.
"Military Grade" Definition: This refers to the reliability and precision of the system. In a medical context, data loss is unacceptable, and uptime must be near 100%. The system must handle thousands of concurrent bookings without race conditions (double booking).
The Problem: Dhaka healthcare is chaotic. Patients wait 4 hours for 5 minutes of consultation. Doctors rely on paper ledgers, losing patient history and revenue data.
Target Audience:
Primary (B2C): Middle-class urban residents (Dhaka initially). They are tech-literate but value the human touch (hence the Voice AI).
Secondary (B2B): Specialists and private chambers. They need a "Digital Cockpit" to manage workflow, not just a calendar.
The Bangla Imperative: The platform must be natively Bengali-first. The AI agents and UI must support "Standard Bangladeshi Bangla" (avoiding West Bengal dialects) to build trust with the local population.
2. Feature Status Matrix
Current State: The frontend is highly polished with complex React state management. The backend is currently simulated via localStorage and mocked services.
Fully Working (Frontend Logic):
Doctor Search: Advanced filtering by Specialty, Location, Hospital, and Gender using dynamic data extraction.
Doctor Dashboard (The "Copilot"): A complex "Command Center" layout featuring:
Clinical Copilot: SOAP note generation, Rx drafting.
Workflow Copilot: Smart queue visualization and slot optimization.
Business Copilot: Revenue charts and fee optimization logic.
Inbox: AI-triaged messaging (Emergency vs. Admin).
Patient Dashboard: Health trend visualization (BP/Weight graphs), medical history ledger, and personal AI chat.
Booking Flow: Multi-step modal for booking slots (Logic is complete, data persistence is local).
UI/UX: Ultra-modern glassmorphism design, fully responsive, with dedicated landing and about pages.
Half-Built / Mocked (Needs Backend Implementation):
Authentication: Currently simulates Login/OTP. Needs integration with a real SMS Gateway (e.g., GreenWeb/Twilio) and JWT implementation.
Data Persistence: Currently uses localStorage. Needs migration to PostgreSQL with a Node.js/NestJS backend.
Voice AI Agent: UI is complete and connection logic is written, but stability is inconsistent (see "Current Bugs").
3. The Voice AI Architecture
Objective: Allow any user (literate or illiterate) to book an appointment by talking naturally in Bangla.
Technology: Google Gemini Live API (Multimodal Live Service).
The Agents:
Yunus (Male): Tone is authoritative but helpful (Support/Booking).
Arisha (Female): Tone is empathetic and welcoming (General Inquiry).
The Data Pipeline:
Input: User speaks into the browser microphone.
Processing (Client-Side): Browser captures audio (typically 44.1kHz/48kHz). A custom downsampler converts this raw stream to 16kHz PCM (16-bit Little Endian).
Transport: Data is sent via a persistent WebSocket connection to the Gemini Live endpoint.
Processing (Server-Side): Gemini processes the audio + Context (Doctor List JSON) + System Instruction (Bangla persona).
Output: Gemini streams back raw PCM audio chunks.
Playback: Client AudioContext decodes and plays these chunks sequentially to simulate a conversation.
4. Current Critical Bug: 'Breaking Voice'
Severity: High (Blocker for Voice Feature release)
Behavior: The Voice Agent connects, but often drops the call immediately or fails to transmit audio, resulting in a "Network Error" or silence.
The Technical Conflict:
Sample Rate Mismatch: The Gemini Live API is extremely strict about receiving 16,000Hz audio. Browsers often force 44,100Hz or 48,000Hz depending on the hardware.
The Flaw: Our manual downsampling logic (math-based decimation) is sometimes imperfect, causing artifacts that the API rejects as "malformed data," closing the socket instantly.
Browser Autoplay Policy: Modern browsers block AudioContext from starting without a direct user gesture. While we added resume() logic, race conditions still occur where the context isn't ready when the socket opens.
Connection Handshake: If the initial WebSocket handshake takes too long, or if the API key has specific quota limits, the promise rejects silently in some edge cases.
5. Future Roadmap
Phase 1 (Production Engineering - Next 4 Weeks):
Backend Migration: Move all mockData to a PostgreSQL database.
Stable Voice Service: Move the audio processing logic to a server-side relay (using Node.js or Python) to handle resampling reliably, removing the burden from the client browser.
Phase 2 (Growth Features):
Payments: Integration with bKash and Nagad for booking fees (reducing no-shows).
Telemedicine: Integrating WebRTC for video consultations within the "Consult" tab.
Pharmacy Integration: Auto-forwarding AI-generated e-prescriptions to partner pharmacies for delivery.
Phase 3 (Scale):
Hospital Enterprise OS: A version of the dashboard for hospital admins to manage 50+ doctors.
International Expansion: Localization for other markets (e.g., West Bengal, Middle East) using the same AI architecture but different language prompts.