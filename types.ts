
export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN',
  GUEST = 'GUEST'
}

export enum AppointmentStatus {
  BOOKED = 'BOOKED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED'
}

export interface Chamber {
  id: string;
  name: string;
  address: string;
  area?: string;
  startTime: string;
  endTime: string;
  slotDuration: number; // minutes
  fee: number;
}

export interface PrescriptionItem {
  medicine: string;
  dosage: string;
  duration: string;
  instruction: string;
}

export interface VisitRecord {
  id: string;
  date: string;
  diagnosis: string;
  prescription: PrescriptionItem[];
  notes: string;
  doctorName: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  bloodGroup: string;
  history: VisitRecord[];
  intakeFormAnswers?: Record<string, string>;
}

export interface PatientSummary {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit: string;
  totalVisits: number;
  condition: string;
  phone: string;
  riskLevel?: 'High' | 'Medium' | 'Low';
}

export interface Doctor {
  id: string;
  name: string;
  specialties: string[];
  degrees: string;
  chambers: Chamber[];
  image: string;
  experience: number;
  rating: number;
  patientCount: number;
  bio: string;
  nextAvailable?: string;
  gender?: string;
  aiSettings?: {
    autoDraftRx: boolean;
    languagePreference: 'Bangla' | 'English';
  }
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  doctorId: string;
  doctorName?: string;
  chamberId: string; // Links to specific location
  date: string;
  time: string;
  status: AppointmentStatus;
  type: 'Chamber' | 'Online';
  visitCategory?: 'New Consultation' | 'Follow-up' | 'Report Analysis' | 'Online Consult';
  symptomSummary?: string;
  prescription?: PrescriptionItem[];
  diagnosis?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// --- Copilot Types ---

export interface InboxMessage {
  id: string;
  sender: string;
  preview: string;
  fullText: string;
  category: 'Emergency' | 'Clarification' | 'Admin';
  timestamp: string;
  isRead: boolean;
}

export interface LearningResource {
  id: string;
  title: string;
  type: 'Guideline' | 'Article' | 'Case';
  summary: string;
  source: string;
}

export interface AnalyticMetric {
  label: string;
  value: string | number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  description?: string;
}

export interface ClinicalNote {
  chiefComplaint: string;
  history: string;
  examination: string; // Vitals, observations
  diagnosis: string;
  plan: string;
}

export interface PatientCohort {
  id: string;
  name: string;
  count: number;
  description: string;
  action: string;
}
