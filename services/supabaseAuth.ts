/**
 * NIRNOY AUTH SERVICE - SIMPLIFIED
 * Uses localStorage as primary storage
 * Supabase as backup/sync
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Config
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Storage keys
const KEYS = {
  SESSION: 'nirnoy_session_v5',
  PATIENTS: 'nirnoy_patients_v5',
  DOCTORS: 'nirnoy_doctors_v5',
  ADMIN: 'nirnoy_admin_v5',
};

// Types
export interface PatientProfile {
  id: string;
  phone: string;
  name: string;
  email?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  emergencyContact?: string;
  chronicConditions?: string[];
  allergies?: string[];
  height?: number;
  weight?: number;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'basic' | 'premium' | 'family';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorProfile {
  id: string;
  phone: string;
  name: string;
  email?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  bmdcNumber: string;
  nidNumber?: string;
  specializations: string[];
  qualifications: string[];
  institution?: string;
  experienceYears: number;
  consultationFee: number;
  chambers: any[];
  avatarUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  isVerified: boolean;
  rating: number;
  totalPatients: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConfig {
  password: string;
  name: string;
  email: string;
}

// Supabase (optional backup)
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder'
);

export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.includes('supabase'));
};

// Phone normalization
export const normalizePhone = (phone: string): string => {
  let n = phone.replace(/[^0-9]/g, '');
  if (n.startsWith('880')) n = n.substring(3);
  if (n.startsWith('0')) n = n.substring(1);
  return n;
};

const genId = () => crypto?.randomUUID?.() || Date.now().toString() + Math.random().toString(36).substr(2);

// ============ STORAGE HELPERS ============
const storage = {
  getSession(): { userId: string; role: string; user: any } | null {
    try {
      const raw = localStorage.getItem(KEYS.SESSION);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Expire after 7 days
      if (Date.now() - data.ts > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(KEYS.SESSION);
        return null;
      }
      console.log('[Storage] Session found:', data.role, data.user?.name);
      return data;
    } catch { return null; }
  },
  
  setSession(userId: string, role: string, user: any): void {
    console.log('[Storage] Saving session:', role, user?.name);
    localStorage.setItem(KEYS.SESSION, JSON.stringify({ userId, role, user, ts: Date.now() }));
  },
  
  clearSession(): void {
    localStorage.removeItem(KEYS.SESSION);
  },
  
  getPatients(): PatientProfile[] {
    try {
      return JSON.parse(localStorage.getItem(KEYS.PATIENTS) || '[]');
    } catch { return []; }
  },
  
  savePatient(patient: PatientProfile): void {
    const patients = this.getPatients().filter(p => p.id !== patient.id);
    patients.push(patient);
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
  },
  
  findPatientByPhone(phone: string): PatientProfile | null {
    const normalized = normalizePhone(phone);
    return this.getPatients().find(p => normalizePhone(p.phone) === normalized) || null;
  },
  
  getDoctors(): DoctorProfile[] {
    try {
      return JSON.parse(localStorage.getItem(KEYS.DOCTORS) || '[]');
    } catch { return []; }
  },
  
  saveDoctor(doctor: DoctorProfile): void {
    const doctors = this.getDoctors().filter(d => d.id !== doctor.id);
    doctors.push(doctor);
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
  },
  
  findDoctorByPhone(phone: string): DoctorProfile | null {
    const normalized = normalizePhone(phone);
    return this.getDoctors().find(d => normalizePhone(d.phone) === normalized) || null;
  },
  
  getAdmin(): AdminConfig {
    try {
      return JSON.parse(localStorage.getItem(KEYS.ADMIN) || 'null') || { password: 'nirnoy2024', name: 'Admin', email: 'admin@nirnoy.ai' };
    } catch { return { password: 'nirnoy2024', name: 'Admin', email: 'admin@nirnoy.ai' }; }
  },
  
  saveAdmin(config: Partial<AdminConfig>): void {
    const current = this.getAdmin();
    localStorage.setItem(KEYS.ADMIN, JSON.stringify({ ...current, ...config }));
  },
};

// ============ AUTH SERVICE ============
export const authService = {
  async initialize(): Promise<void> {
    console.log('[Auth] Initializing...');
    console.log('[Auth] Supabase:', isSupabaseConfigured() ? 'configured' : 'not configured');
  },
  
  getCurrentUser(): { user: PatientProfile | DoctorProfile; role: string } | null {
    const session = storage.getSession();
    if (!session) return null;
    return { user: session.user, role: session.role };
  },
  
  async checkPhone(phone: string): Promise<{ exists: boolean; type: 'patient' | 'doctor' | null; isApproved?: boolean }> {
    const patient = storage.findPatientByPhone(phone);
    if (patient) return { exists: true, type: 'patient' };
    
    const doctor = storage.findDoctorByPhone(phone);
    if (doctor) return { exists: true, type: 'doctor', isApproved: doctor.status === 'approved' };
    
    return { exists: false, type: null };
  },
  
  async loginPatient(phone: string): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] Login patient:', phone);
    const patient = storage.findPatientByPhone(phone);
    
    if (!patient) {
      return { success: false, error: 'Patient not found' };
    }
    
    storage.setSession(patient.id, 'patient', patient);
    return { success: true, user: patient };
  },
  
  async registerPatient(data: any): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] Register patient:', data.phone, data.name);
    
    // Check if already exists
    if (storage.findPatientByPhone(data.phone)) {
      return { success: false, error: 'Phone already registered' };
    }
    
    const patient: PatientProfile = {
      id: genId(),
      phone: normalizePhone(data.phone),
      name: data.name,
      email: data.email,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      emergencyContact: data.emergencyContact,
      chronicConditions: data.chronicConditions || [],
      allergies: data.allergies || [],
      subscriptionTier: 'premium',
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save to localStorage
    storage.savePatient(patient);
    
    // Save session
    storage.setSession(patient.id, 'patient', patient);
    
    // Try to sync to Supabase (non-blocking)
    if (isSupabaseConfigured()) {
      supabase.from('profiles').insert({
        id: patient.id,
        phone: patient.phone,
        name: patient.name,
        role: 'patient',
        is_verified: true,
      }).then(() => console.log('[Auth] Synced to Supabase'));
    }
    
    console.log('[Auth] Patient registered successfully');
    return { success: true, user: patient };
  },
  
  async loginDoctor(phone: string): Promise<{ success: boolean; user?: DoctorProfile; error?: string }> {
    console.log('[Auth] Login doctor:', phone);
    const doctor = storage.findDoctorByPhone(phone);
    
    if (!doctor) {
      return { success: false, error: 'Doctor not found' };
    }
    
    if (doctor.status !== 'approved') {
      return { success: false, error: 'Account pending approval' };
    }
    
    storage.setSession(doctor.id, 'doctor', doctor);
    return { success: true, user: doctor };
  },
  
  async registerDoctor(data: any): Promise<{ success: boolean; user?: DoctorProfile; error?: string }> {
    console.log('[Auth] Register doctor:', data.phone, data.name);
    
    // Check if already exists
    if (storage.findDoctorByPhone(data.phone)) {
      return { success: false, error: 'Phone already registered' };
    }
    
    const doctor: DoctorProfile = {
      id: genId(),
      phone: normalizePhone(data.phone),
      name: data.name,
      email: data.email,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bmdcNumber: data.bmdcNumber,
      nidNumber: data.nidNumber,
      specializations: data.specializations || [],
      qualifications: data.qualifications || [],
      institution: data.institution,
      experienceYears: data.experienceYears || 0,
      consultationFee: data.consultationFee || 500,
      chambers: data.chambers || [],
      avatarUrl: data.avatarUrl,
      status: 'pending',
      isVerified: false,
      rating: 0,
      totalPatients: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    storage.saveDoctor(doctor);
    
    console.log('[Auth] Doctor registered - pending approval');
    return { success: true };
  },
  
  logout(): void {
    storage.clearSession();
  },
  
  async updatePatient(id: string, updates: any): Promise<boolean> {
    const patients = storage.getPatients();
    const idx = patients.findIndex(p => p.id === id);
    if (idx === -1) return false;
    
    patients[idx] = { ...patients[idx], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
    
    // Update session if current user
    const session = storage.getSession();
    if (session && session.userId === id) {
      storage.setSession(id, 'patient', patients[idx]);
    }
    
    return true;
  },
  
  getAllPatients: () => Promise.resolve(storage.getPatients()),
  getAllDoctors: () => Promise.resolve(storage.getDoctors()),
  
  getPendingDoctors: () => Promise.resolve(storage.getDoctors().filter(d => d.status === 'pending')),
  
  async updateDoctorStatus(id: string, phone: string, status: 'approved' | 'rejected'): Promise<boolean> {
    const doctors = storage.getDoctors();
    const idx = doctors.findIndex(d => d.id === id || normalizePhone(d.phone) === normalizePhone(phone));
    if (idx === -1) return false;
    
    doctors[idx].status = status;
    doctors[idx].isVerified = status === 'approved';
    doctors[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
    
    return true;
  },
  
  admin: {
    validatePassword: (pwd: string) => pwd === storage.getAdmin().password,
    changePassword: (newPwd: string) => storage.saveAdmin({ password: newPwd }),
    getConfig: () => storage.getAdmin(),
    setConfig: (cfg: Partial<AdminConfig>) => storage.saveAdmin(cfg),
  },
  
  isOnline: () => navigator.onLine,
  isSupabaseConfigured,
  normalizePhone,
};

export { KEYS as STORAGE_KEYS };
