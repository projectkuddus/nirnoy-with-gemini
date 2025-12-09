// User Roles
export enum UserRole {
  GUEST = 'GUEST',
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  ADMIN = 'ADMIN',
}

// User Types
export interface User {
  id: string;
  name: string;
  nameBn?: string;
  email?: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Patient
export interface Patient {
  id: string;
  userId: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  heightCm?: number;
  weightKg?: number;
  emergencyContact?: string;
  emergencyRelation?: string;
  address?: string;
  city?: string;
  district?: string;
  healthConditions?: string[];
  allergies?: string[];
  medications?: string[];
  familyId?: string;
}

// Doctor
export interface Doctor {
  id: string;
  userId: string;
  name: string;
  nameBn?: string;
  degrees: string;
  specialties: string[];
  experience: number;
  rating: number;
  totalReviews: number;
  totalPatients: number;
  bmdcNumber: string;
  bio?: string;
  bioBn?: string;
  image?: string;
  profilePhoto?: string; // Alias for image
  gender?: 'Male' | 'Female';
  languages?: string[];
  isVerified: boolean;
  isActive: boolean;
  isFeatured?: boolean;
  isDemo?: boolean; // Flag for demo/sample accounts
  chambers: Chamber[];
  nextAvailable?: string;
}

// Chamber
export interface Chamber {
  id: string;
  doctorId: string;
  name: string;
  address: string;
  area: string;
  city: string;
  phone?: string;
  fee: number;
  followUpFee: number;
  schedule: ChamberSchedule[];
  facilities?: string[];
}

export interface ChamberSchedule {
  day: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
}

// Appointment
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  chamberId?: string;
  date: string;
  time: string;
  serialNumber: number;
  status: 'scheduled' | 'confirmed' | 'in_queue' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  visitType: 'new' | 'follow_up' | 'report_review';
  fee: number;
  isPaid: boolean;
  paymentMethod?: string;
  intakeForm?: PatientIntakeForm;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

// Patient Intake Form
export interface PatientIntakeForm {
  chiefComplaint: string;
  symptoms: string[];
  duration: string;
  severity: 'mild' | 'moderate' | 'severe';
  previousReports?: string[];
  additionalNotes?: string;
}

// Health Record
export interface HealthRecord {
  id: string;
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  recordType: 'consultation' | 'diagnosis' | 'prescription' | 'lab_report' | 'imaging' | 'vital_signs' | 'symptom' | 'medication';
  title: string;
  description?: string;
  data: Record<string, any>;
  bodyRegion?: string;
  severity?: 'mild' | 'moderate' | 'severe' | 'critical';
  isEmergency: boolean;
  tags?: string[];
  createdAt: string;
}

// Prescription
export interface Prescription {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  medications: PrescriptionItem[];
  instructions?: string;
  followUpDate?: string;
  notes?: string;
  createdAt: string;
}

export interface PrescriptionItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

// Chat Message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Family
export interface Family {
  id: string;
  name: string;
  createdBy: string;
  members: FamilyMember[];
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  patientId: string;
  relation: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'grandparent' | 'other';
  isAdmin: boolean;
  canViewRecords: boolean;
  canBookAppointments: boolean;
  joinedAt: string;
}

// Queue Entry
export interface QueueEntry {
  id: string;
  appointmentId: string;
  doctorId: string;
  currentSerial: number;
  totalInQueue: number;
  estimatedWaitTime?: number;
  delayMinutes: number;
  doctorMessage?: string;
  status: 'waiting' | 'next' | 'current' | 'completed';
}

// AI Insight
export interface AIInsight {
  id: string;
  patientId?: string;
  doctorId?: string;
  location?: string;
  insightType: 'risk_prediction' | 'health_trend' | 'pattern_detection' | 'recommendation' | 'pandemic_alert';
  title: string;
  description: string;
  data: Record<string, any>;
  confidenceScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActionable: boolean;
  actionItems?: string[];
  createdAt: string;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  type: 'appointment' | 'queue' | 'prescription' | 'health_alert' | 'system' | 'family';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  channels: ('sms' | 'email' | 'push')[];
  createdAt: string;
}
