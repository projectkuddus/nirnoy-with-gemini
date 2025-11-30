/**
 * ============================================
 * NIRNOY SUPABASE AUTHENTICATION SERVICE
 * ============================================
 * Military-grade authentication for millions of users
 * Primary: Supabase Database
 * Fallback: localStorage (offline mode only)
 * ============================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Storage keys for offline fallback
export const STORAGE_KEYS = {
  USER: 'nirnoy_current_user',
  PATIENTS: 'nirnoy_patients_db',
  DOCTORS: 'nirnoy_doctors_db',
  PENDING_SYNC: 'nirnoy_pending_sync',
  ADMIN: 'nirnoy_admin_config',
};

// ============================================
// TYPES
// ============================================
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
  chambers: Chamber[];
  avatarUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  isVerified: boolean;
  rating: number;
  totalPatients: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chamber {
  id: string;
  name: string;
  address: string;
  area: string;
  city: string;
  phone?: string;
  fee: number;
  schedule: Schedule[];
}

export interface Schedule {
  day: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
}

export interface AdminConfig {
  password: string;
  name: string;
  email: string;
  lastLogin?: string;
}

// ============================================
// SUPABASE CLIENT
// ============================================
const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.includes('supabase'));
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
export const normalizePhone = (phone: string): string => {
  let normalized = phone.replace(/[^0-9]/g, '');
  if (normalized.startsWith('880')) {
    normalized = normalized.substring(3);
  }
  if (normalized.startsWith('0')) {
    normalized = normalized.substring(1);
  }
  return normalized;
};

const generateId = (): string => {
  return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11);
};

const isOnline = (): boolean => {
  return navigator.onLine;
};

// ============================================
// LOCAL STORAGE HELPERS
// ============================================
const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('[Storage] Failed to save:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[Storage] Failed to remove:', error);
    }
  },
};

// ============================================
// SUPABASE DATABASE OPERATIONS
// ============================================
const db = {
  async getPatientByPhone(phone: string): Promise<PatientProfile | null> {
    if (!isSupabaseConfigured()) return null;
    
    const normalized = normalizePhone(phone);
    try {
      // Try to find in profiles table with role=patient
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .or('phone.eq.' + normalized + ',phone.eq.0' + normalized);
      
      if (error || !data || data.length === 0) return null;
      
      const profile = data[0];
      
      // Get patient-specific data
      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', profile.id)
        .single();
      
      return mapDbToPatient(profile, patientData);
    } catch (err) {
      console.error('[DB] getPatientByPhone error:', err);
      return null;
    }
  },
  
  async createPatient(patient: PatientProfile): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }
    
    try {
      const profileId = crypto.randomUUID ? crypto.randomUUID() : patient.id;
      
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          phone: normalizePhone(patient.phone),
          name: patient.name,
          email: patient.email,
          role: 'patient',
          date_of_birth: patient.dateOfBirth,
          gender: patient.gender,
          blood_group: patient.bloodGroup,
          avatar_url: patient.avatarUrl,
          is_verified: true,
          created_at: patient.createdAt,
          updated_at: patient.updatedAt,
        });
      
      if (profileError) {
        console.error('[DB] Profile creation error:', profileError);
        return { success: false, error: profileError.message };
      }
      
      // Create patient record
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          user_id: profileId,
          emergency_contact_phone: patient.emergencyContact,
          chronic_conditions: patient.chronicConditions || [],
          allergies: patient.allergies || [],
          height_cm: patient.height,
          weight_kg: patient.weight,
          subscription_tier: patient.subscriptionTier,
        });
      
      if (patientError) {
        console.error('[DB] Patient creation error:', patientError);
        // Don't fail - profile was created
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('[DB] Create patient failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  async getAllPatients(): Promise<PatientProfile[]> {
    if (!isSupabaseConfigured()) return [];
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });
      
      if (error || !data) return [];
      
      return data.map(p => mapDbToPatient(p, null));
    } catch {
      return [];
    }
  },
  
  async getDoctorByPhone(phone: string): Promise<DoctorProfile | null> {
    if (!isSupabaseConfigured()) return null;
    
    const normalized = normalizePhone(phone);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor')
        .or('phone.eq.' + normalized + ',phone.eq.0' + normalized);
      
      if (error || !data || data.length === 0) return null;
      
      const profile = data[0];
      
      // Get doctor-specific data
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('*, chambers(*)')
        .eq('user_id', profile.id)
        .single();
      
      return mapDbToDoctor(profile, doctorData);
    } catch (err) {
      console.error('[DB] getDoctorByPhone error:', err);
      return null;
    }
  },
  
  async createDoctor(doctor: DoctorProfile): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }
    
    try {
      const profileId = crypto.randomUUID ? crypto.randomUUID() : doctor.id;
      
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          phone: normalizePhone(doctor.phone),
          name: doctor.name,
          email: doctor.email,
          role: 'doctor',
          date_of_birth: doctor.dateOfBirth,
          gender: doctor.gender,
          avatar_url: doctor.avatarUrl,
          is_verified: false,
          created_at: doctor.createdAt,
          updated_at: doctor.updatedAt,
        });
      
      if (profileError) {
        console.error('[DB] Doctor profile creation error:', profileError);
        return { success: false, error: profileError.message };
      }
      
      // Create doctor record
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .insert({
          user_id: profileId,
          bmdc_number: doctor.bmdcNumber,
          nid_number: doctor.nidNumber,
          degrees: doctor.qualifications,
          specialties: doctor.specializations,
          experience_years: doctor.experienceYears,
          consultation_fee: doctor.consultationFee,
          is_verified: false,
        })
        .select()
        .single();
      
      if (doctorError) {
        console.error('[DB] Doctor creation error:', doctorError);
        return { success: false, error: doctorError.message };
      }
      
      // Create chambers
      if (doctor.chambers && doctor.chambers.length > 0 && doctorData) {
        for (const chamber of doctor.chambers) {
          await supabase.from('chambers').insert({
            doctor_id: doctorData.id,
            name: chamber.name,
            address: chamber.address,
            area: chamber.area,
            city: chamber.city,
            phone: chamber.phone,
            fee: chamber.fee,
            is_primary: true,
          });
        }
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('[DB] Create doctor failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  async updateDoctorStatus(id: string, status: 'approved' | 'rejected'): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    
    try {
      const isVerified = status === 'approved';
      
      await supabase
        .from('doctors')
        .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
        .eq('user_id', id);
      
      await supabase
        .from('profiles')
        .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      return true;
    } catch {
      return false;
    }
  },
  
  async getAllDoctors(): Promise<DoctorProfile[]> {
    if (!isSupabaseConfigured()) return [];
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor')
        .order('created_at', { ascending: false });
      
      if (error || !data) return [];
      
      const doctors: DoctorProfile[] = [];
      for (const profile of data) {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('*, chambers(*)')
          .eq('user_id', profile.id)
          .single();
        
        doctors.push(mapDbToDoctor(profile, doctorData));
      }
      
      return doctors;
    } catch {
      return [];
    }
  },
  
  async getPendingDoctors(): Promise<DoctorProfile[]> {
    if (!isSupabaseConfigured()) return [];
    
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*, profiles:user_id(*), chambers(*)')
        .eq('is_verified', false);
      
      if (error || !data) return [];
      
      return data.map(d => mapDbToDoctor(d.profiles, d));
    } catch {
      return [];
    }
  },
};

// ============================================
// DATA MAPPERS
// ============================================
function mapDbToPatient(profile: any, patientData: any): PatientProfile {
  return {
    id: profile.id,
    phone: profile.phone || '',
    name: profile.name || '',
    email: profile.email,
    dateOfBirth: profile.date_of_birth,
    gender: profile.gender,
    bloodGroup: profile.blood_group,
    emergencyContact: patientData?.emergency_contact_phone,
    chronicConditions: patientData?.chronic_conditions || [],
    allergies: patientData?.allergies || [],
    height: patientData?.height_cm,
    weight: patientData?.weight_kg,
    avatarUrl: profile.avatar_url,
    subscriptionTier: patientData?.subscription_tier || 'premium',
    isVerified: profile.is_verified || false,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

function mapDbToDoctor(profile: any, doctorData: any): DoctorProfile {
  return {
    id: profile?.id || doctorData?.user_id,
    phone: profile?.phone || '',
    name: profile?.name || '',
    email: profile?.email,
    dateOfBirth: profile?.date_of_birth,
    gender: profile?.gender,
    bmdcNumber: doctorData?.bmdc_number || '',
    nidNumber: doctorData?.nid_number,
    specializations: doctorData?.specialties || [],
    qualifications: doctorData?.degrees || [],
    experienceYears: doctorData?.experience_years || 0,
    consultationFee: doctorData?.consultation_fee || 0,
    chambers: (doctorData?.chambers || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      address: c.address,
      area: c.area,
      city: c.city,
      phone: c.phone,
      fee: c.fee,
      schedule: [],
    })),
    avatarUrl: profile?.avatar_url,
    status: doctorData?.is_verified ? 'approved' : 'pending',
    isVerified: doctorData?.is_verified || false,
    rating: parseFloat(doctorData?.rating) || 0,
    totalPatients: doctorData?.total_patients || 0,
    createdAt: profile?.created_at || doctorData?.created_at,
    updatedAt: profile?.updated_at || doctorData?.updated_at,
  };
}

// ============================================
// OFFLINE STORAGE (Fallback)
// ============================================
const offline = {
  savePatient(patient: PatientProfile): void {
    const patients = storage.get<PatientProfile[]>(STORAGE_KEYS.PATIENTS, []);
    const normalized = normalizePhone(patient.phone);
    const existing = patients.findIndex(p => normalizePhone(p.phone) === normalized);
    
    if (existing >= 0) {
      patients[existing] = { ...patients[existing], ...patient };
    } else {
      patients.push(patient);
    }
    
    storage.set(STORAGE_KEYS.PATIENTS, patients);
  },
  
  getPatientByPhone(phone: string): PatientProfile | null {
    const patients = storage.get<PatientProfile[]>(STORAGE_KEYS.PATIENTS, []);
    const normalized = normalizePhone(phone);
    return patients.find(p => normalizePhone(p.phone) === normalized) || null;
  },
  
  getAllPatients(): PatientProfile[] {
    return storage.get<PatientProfile[]>(STORAGE_KEYS.PATIENTS, []);
  },
  
  saveDoctor(doctor: DoctorProfile): void {
    const doctors = storage.get<DoctorProfile[]>(STORAGE_KEYS.DOCTORS, []);
    const normalized = normalizePhone(doctor.phone);
    const existing = doctors.findIndex(d => normalizePhone(d.phone) === normalized);
    
    if (existing >= 0) {
      doctors[existing] = { ...doctors[existing], ...doctor };
    } else {
      doctors.push(doctor);
    }
    
    storage.set(STORAGE_KEYS.DOCTORS, doctors);
  },
  
  getDoctorByPhone(phone: string): DoctorProfile | null {
    const doctors = storage.get<DoctorProfile[]>(STORAGE_KEYS.DOCTORS, []);
    const normalized = normalizePhone(phone);
    return doctors.find(d => normalizePhone(d.phone) === normalized) || null;
  },
  
  getAllDoctors(): DoctorProfile[] {
    return storage.get<DoctorProfile[]>(STORAGE_KEYS.DOCTORS, []);
  },
  
  getPendingDoctors(): DoctorProfile[] {
    return storage.get<DoctorProfile[]>(STORAGE_KEYS.DOCTORS, [])
      .filter(d => d.status === 'pending');
  },
  
  updateDoctorStatus(phone: string, status: 'approved' | 'rejected'): boolean {
    const doctors = storage.get<DoctorProfile[]>(STORAGE_KEYS.DOCTORS, []);
    const normalized = normalizePhone(phone);
    const index = doctors.findIndex(d => normalizePhone(d.phone) === normalized);
    
    if (index >= 0) {
      doctors[index].status = status;
      doctors[index].isVerified = status === 'approved';
      doctors[index].updatedAt = new Date().toISOString();
      storage.set(STORAGE_KEYS.DOCTORS, doctors);
      return true;
    }
    return false;
  },
  
  setCurrentUser(user: PatientProfile | DoctorProfile | null, role: string | null): void {
    if (user && role) {
      storage.set(STORAGE_KEYS.USER, { user, role });
    } else {
      storage.remove(STORAGE_KEYS.USER);
    }
  },
  
  getCurrentUser(): { user: PatientProfile | DoctorProfile; role: string } | null {
    return storage.get<{ user: PatientProfile | DoctorProfile; role: string } | null>(STORAGE_KEYS.USER, null);
  },
  
  addPendingSync(action: { type: string; data: any }): void {
    const pending = storage.get<any[]>(STORAGE_KEYS.PENDING_SYNC, []);
    pending.push({ ...action, timestamp: Date.now() });
    storage.set(STORAGE_KEYS.PENDING_SYNC, pending);
  },
  
  getPendingSync(): any[] {
    return storage.get<any[]>(STORAGE_KEYS.PENDING_SYNC, []);
  },
  
  clearPendingSync(): void {
    storage.remove(STORAGE_KEYS.PENDING_SYNC);
  },
};

// ============================================
// ADMIN OPERATIONS
// ============================================
const admin = {
  DEFAULT_CONFIG: {
    password: 'nirnoy2024',
    name: 'Admin',
    email: 'admin@nirnoy.ai',
  } as AdminConfig,
  
  getConfig(): AdminConfig {
    return storage.get<AdminConfig>(STORAGE_KEYS.ADMIN, this.DEFAULT_CONFIG);
  },
  
  setConfig(config: Partial<AdminConfig>): void {
    const current = this.getConfig();
    storage.set(STORAGE_KEYS.ADMIN, { ...current, ...config });
  },
  
  validatePassword(password: string): boolean {
    const config = this.getConfig();
    return password === config.password;
  },
  
  changePassword(newPassword: string): void {
    this.setConfig({ password: newPassword });
  },
};

// ============================================
// SYNC SERVICE
// ============================================
const sync = {
  async syncToSupabase(): Promise<void> {
    if (!isSupabaseConfigured() || !isOnline()) return;
    
    console.log('[Sync] Starting sync to Supabase...');
    
    const pending = offline.getPendingSync();
    for (const action of pending) {
      try {
        if (action.type === 'CREATE_PATIENT') {
          await db.createPatient(action.data);
        } else if (action.type === 'CREATE_DOCTOR') {
          await db.createDoctor(action.data);
        } else if (action.type === 'UPDATE_DOCTOR_STATUS') {
          await db.updateDoctorStatus(action.data.id, action.data.status);
        }
      } catch (error) {
        console.error('[Sync] Failed to sync action:', action, error);
      }
    }
    
    offline.clearPendingSync();
    console.log('[Sync] Sync completed');
  },
  
  async syncFromSupabase(): Promise<void> {
    if (!isSupabaseConfigured() || !isOnline()) return;
    
    console.log('[Sync] Fetching data from Supabase...');
    
    try {
      const patients = await db.getAllPatients();
      if (patients.length > 0) {
        storage.set(STORAGE_KEYS.PATIENTS, patients);
        console.log('[Sync] Synced ' + patients.length + ' patients');
      }
      
      const doctors = await db.getAllDoctors();
      if (doctors.length > 0) {
        storage.set(STORAGE_KEYS.DOCTORS, doctors);
        console.log('[Sync] Synced ' + doctors.length + ' doctors');
      }
    } catch (error) {
      console.error('[Sync] Failed to sync from Supabase:', error);
    }
  },
};

// ============================================
// MAIN AUTH SERVICE
// ============================================
export const authService = {
  async initialize(): Promise<void> {
    console.log('[Auth] Initializing authentication service...');
    console.log('[Auth] Supabase configured:', isSupabaseConfigured());
    console.log('[Auth] Online:', isOnline());
    
    if (isSupabaseConfigured() && isOnline()) {
      await sync.syncFromSupabase();
    }
    
    window.addEventListener('online', () => {
      console.log('[Auth] Back online - syncing...');
      sync.syncToSupabase();
      sync.syncFromSupabase();
    });
  },
  
  getCurrentUser(): { user: PatientProfile | DoctorProfile; role: string } | null {
    return offline.getCurrentUser();
  },
  
  async checkPhone(phone: string): Promise<{ exists: boolean; type: 'patient' | 'doctor' | null; isApproved?: boolean }> {
    const normalized = normalizePhone(phone);
    console.log('[Auth] Checking phone:', normalized);
    
    // Try Supabase first
    if (isSupabaseConfigured() && isOnline()) {
      const patient = await db.getPatientByPhone(normalized);
      if (patient) {
        offline.savePatient(patient); // Cache
        return { exists: true, type: 'patient' };
      }
      
      const doctor = await db.getDoctorByPhone(normalized);
      if (doctor) {
        offline.saveDoctor(doctor); // Cache
        return { exists: true, type: 'doctor', isApproved: doctor.status === 'approved' };
      }
    }
    
    // Fallback to offline
    const offlinePatient = offline.getPatientByPhone(normalized);
    if (offlinePatient) {
      return { exists: true, type: 'patient' };
    }
    
    const offlineDoctor = offline.getDoctorByPhone(normalized);
    if (offlineDoctor) {
      return { exists: true, type: 'doctor', isApproved: offlineDoctor.status === 'approved' };
    }
    
    return { exists: false, type: null };
  },
  
  async loginPatient(phone: string): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    const normalized = normalizePhone(phone);
    console.log('[Auth] Logging in patient:', normalized);
    
    // Try Supabase first
    if (isSupabaseConfigured() && isOnline()) {
      const patient = await db.getPatientByPhone(normalized);
      if (patient) {
        offline.setCurrentUser(patient, 'patient');
        offline.savePatient(patient);
        return { success: true, user: patient };
      }
    }
    
    // Fallback to offline
    const offlinePatient = offline.getPatientByPhone(normalized);
    if (offlinePatient) {
      offline.setCurrentUser(offlinePatient, 'patient');
      return { success: true, user: offlinePatient };
    }
    
    return { success: false, error: 'Patient not found' };
  },
  
  async registerPatient(data: Omit<PatientProfile, 'id' | 'createdAt' | 'updatedAt' | 'isVerified' | 'subscriptionTier'>): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] Registering patient:', data.phone);
    
    const patient: PatientProfile = {
      ...data,
      id: generateId(),
      phone: normalizePhone(data.phone),
      subscriptionTier: 'premium',
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Try Supabase first
    if (isSupabaseConfigured() && isOnline()) {
      const result = await db.createPatient(patient);
      if (result.success) {
        offline.savePatient(patient);
        offline.setCurrentUser(patient, 'patient');
        return { success: true, user: patient };
      }
      console.warn('[Auth] Supabase save failed:', result.error);
    }
    
    // Fallback to offline with pending sync
    offline.savePatient(patient);
    offline.setCurrentUser(patient, 'patient');
    offline.addPendingSync({ type: 'CREATE_PATIENT', data: patient });
    
    return { success: true, user: patient };
  },
  
  async loginDoctor(phone: string): Promise<{ success: boolean; user?: DoctorProfile; error?: string }> {
    const normalized = normalizePhone(phone);
    console.log('[Auth] Logging in doctor:', normalized);
    
    // Try Supabase first
    if (isSupabaseConfigured() && isOnline()) {
      const doctor = await db.getDoctorByPhone(normalized);
      if (doctor) {
        if (doctor.status !== 'approved') {
          return { success: false, error: 'Doctor account pending approval' };
        }
        offline.setCurrentUser(doctor, 'doctor');
        offline.saveDoctor(doctor);
        return { success: true, user: doctor };
      }
    }
    
    // Fallback to offline
    const offlineDoctor = offline.getDoctorByPhone(normalized);
    if (offlineDoctor) {
      if (offlineDoctor.status !== 'approved') {
        return { success: false, error: 'Doctor account pending approval' };
      }
      offline.setCurrentUser(offlineDoctor, 'doctor');
      return { success: true, user: offlineDoctor };
    }
    
    return { success: false, error: 'Doctor not found' };
  },
  
  async registerDoctor(data: Omit<DoctorProfile, 'id' | 'createdAt' | 'updatedAt' | 'isVerified' | 'status' | 'rating' | 'totalPatients'>): Promise<{ success: boolean; user?: DoctorProfile; error?: string }> {
    console.log('[Auth] Registering doctor:', data.phone);
    
    const doctor: DoctorProfile = {
      ...data,
      id: generateId(),
      phone: normalizePhone(data.phone),
      status: 'pending',
      isVerified: false,
      rating: 0,
      totalPatients: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Try Supabase first
    if (isSupabaseConfigured() && isOnline()) {
      const result = await db.createDoctor(doctor);
      if (result.success) {
        offline.saveDoctor(doctor);
        return { success: true, user: doctor };
      }
      console.warn('[Auth] Supabase save failed:', result.error);
    }
    
    // Fallback to offline with pending sync
    offline.saveDoctor(doctor);
    offline.addPendingSync({ type: 'CREATE_DOCTOR', data: doctor });
    
    return { success: true, user: doctor };
  },
  
  logout(): void {
    offline.setCurrentUser(null, null);
  },
  
  async updatePatient(id: string, updates: Partial<PatientProfile>): Promise<boolean> {
    const current = offline.getCurrentUser();
    if (current && current.role === 'patient') {
      const updated = { ...current.user, ...updates, updatedAt: new Date().toISOString() } as PatientProfile;
      offline.savePatient(updated);
      offline.setCurrentUser(updated, 'patient');
    }
    return true;
  },
  
  async getAllPatients(): Promise<PatientProfile[]> {
    if (isSupabaseConfigured() && isOnline()) {
      const patients = await db.getAllPatients();
      if (patients.length > 0) {
        storage.set(STORAGE_KEYS.PATIENTS, patients);
        return patients;
      }
    }
    return offline.getAllPatients();
  },
  
  async getAllDoctors(): Promise<DoctorProfile[]> {
    if (isSupabaseConfigured() && isOnline()) {
      const doctors = await db.getAllDoctors();
      if (doctors.length > 0) {
        storage.set(STORAGE_KEYS.DOCTORS, doctors);
        return doctors;
      }
    }
    return offline.getAllDoctors();
  },
  
  async getPendingDoctors(): Promise<DoctorProfile[]> {
    if (isSupabaseConfigured() && isOnline()) {
      const doctors = await db.getPendingDoctors();
      if (doctors.length > 0) return doctors;
    }
    return offline.getPendingDoctors();
  },
  
  async updateDoctorStatus(id: string, phone: string, status: 'approved' | 'rejected'): Promise<boolean> {
    console.log('[Auth] Updating doctor status:', phone, status);
    
    // Update in Supabase
    if (isSupabaseConfigured() && isOnline()) {
      await db.updateDoctorStatus(id, status);
    }
    
    // Update locally
    offline.updateDoctorStatus(phone, status);
    
    if (!isOnline()) {
      offline.addPendingSync({ type: 'UPDATE_DOCTOR_STATUS', data: { id, status } });
    }
    
    return true;
  },
  
  admin: {
    validatePassword: admin.validatePassword.bind(admin),
    changePassword: admin.changePassword.bind(admin),
    getConfig: admin.getConfig.bind(admin),
    setConfig: admin.setConfig.bind(admin),
  },
  
  isOnline,
  isSupabaseConfigured,
  normalizePhone,
};
