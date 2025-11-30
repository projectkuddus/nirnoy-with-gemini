/**
 * ============================================
 * NIRNOY CLOUD AUTHENTICATION SERVICE
 * ============================================
 * Supabase for data storage
 * localStorage for session persistence
 * ============================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SESSION_KEY = 'nirnoy_user_session';
const ADMIN_KEY = 'nirnoy_admin_config';

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
  schedule: any[];
}

export interface AdminConfig {
  password: string;
  name: string;
  email: string;
}

// Supabase Client
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder'
);

export const isSupabaseConfigured = (): boolean => {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.includes('supabase'));
};

// Phone normalization
export const normalizePhone = (phone: string): string => {
  let normalized = phone.replace(/[^0-9]/g, '');
  if (normalized.startsWith('880')) normalized = normalized.substring(3);
  if (normalized.startsWith('0')) normalized = normalized.substring(1);
  return normalized;
};

const generateId = (): string => {
  return crypto?.randomUUID?.() || Date.now().toString() + Math.random().toString(36).substring(2, 11);
};

// ============================================
// SESSION - Uses localStorage for persistence
// ============================================
const session = {
  save(userId: string, role: string, userData: any): void {
    console.log('[Session] Saving:', { userId, role, name: userData?.name });
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ 
        userId, 
        role, 
        userData, 
        timestamp: Date.now() 
      }));
    } catch (e) {
      console.error('[Session] Save failed:', e);
    }
  },
  
  get(): { userId: string; role: string; userData: any } | null {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) {
        console.log('[Session] No session found');
        return null;
      }
      const parsed = JSON.parse(data);
      // Session expires after 7 days
      if (Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
        console.log('[Session] Session expired');
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      console.log('[Session] Found session:', { userId: parsed.userId, role: parsed.role });
      return parsed;
    } catch (e) {
      console.error('[Session] Get failed:', e);
      return null;
    }
  },
  
  clear(): void {
    console.log('[Session] Clearing');
    localStorage.removeItem(SESSION_KEY);
  },
};

// ============================================
// DATABASE OPERATIONS
// ============================================
const db = {
  async getProfileByPhone(phone: string): Promise<any | null> {
    if (!isSupabaseConfigured()) return null;
    
    const normalized = normalizePhone(phone);
    console.log('[DB] Looking for phone:', normalized);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`phone.eq.${normalized},phone.eq.0${normalized}`)
        .limit(1);
      
      if (error) {
        console.error('[DB] Query error:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('[DB] No profile found');
        return null;
      }
      
      console.log('[DB] Found profile:', data[0].name);
      return data[0];
    } catch (err) {
      console.error('[DB] Error:', err);
      return null;
    }
  },
  
  async createProfile(profile: any): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }
    
    console.log('[DB] Creating profile:', profile.phone, profile.name);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: profile.id,
          phone: normalizePhone(profile.phone),
          name: profile.name,
          email: profile.email || null,
          role: profile.role || 'patient',
          date_of_birth: profile.dateOfBirth || null,
          gender: profile.gender || null,
          blood_group: profile.bloodGroup || null,
          is_verified: profile.role === 'patient',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('[DB] Insert error:', error);
        return { success: false, error: error.message };
      }
      
      console.log('[DB] Profile created:', data.id);
      return { success: true, data };
    } catch (err: any) {
      console.error('[DB] Create failed:', err);
      return { success: false, error: err.message };
    }
  },
  
  async createPatientRecord(userId: string, data: any): Promise<boolean> {
    try {
      await supabase.from('patients').insert({
        user_id: userId,
        emergency_contact_phone: data.emergencyContact || null,
        chronic_conditions: data.chronicConditions || [],
        allergies: data.allergies || [],
        subscription_tier: 'premium',
      });
      return true;
    } catch {
      return false;
    }
  },
  
  async createDoctorRecord(userId: string, data: any): Promise<boolean> {
    try {
      const { data: doctorData, error } = await supabase.from('doctors').insert({
        user_id: userId,
        bmdc_number: data.bmdcNumber,
        nid_number: data.nidNumber || null,
        degrees: data.qualifications || [],
        specialties: data.specializations || [],
        experience_years: data.experienceYears || 0,
        consultation_fee: data.consultationFee || 500,
        is_verified: false,
      }).select().single();
      
      if (error) {
        console.error('[DB] Doctor record error:', error);
        return false;
      }
      
      // Create chamber if provided
      if (data.chambers && data.chambers.length > 0) {
        for (const chamber of data.chambers) {
          await supabase.from('chambers').insert({
            doctor_id: doctorData.id,
            name: chamber.name || 'Main Chamber',
            address: chamber.address || '',
            area: chamber.area || '',
            city: chamber.city || 'Dhaka',
            fee: chamber.fee || 500,
            is_primary: true,
          });
        }
      }
      
      return true;
    } catch (err) {
      console.error('[DB] Doctor record failed:', err);
      return false;
    }
  },
  
  async getAllPatients(): Promise<PatientProfile[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });
      return (data || []).map(mapToPatient);
    } catch {
      return [];
    }
  },
  
  async getAllDoctors(): Promise<DoctorProfile[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data } = await supabase
        .from('doctors')
        .select('*, profiles:user_id(*)')
        .order('created_at', { ascending: false });
      return (data || []).map(mapToDoctor);
    } catch {
      return [];
    }
  },
  
  async getPendingDoctors(): Promise<DoctorProfile[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data } = await supabase
        .from('doctors')
        .select('*, profiles:user_id(*)')
        .eq('is_verified', false)
        .order('created_at', { ascending: false });
      return (data || []).map(mapToDoctor);
    } catch {
      return [];
    }
  },
  
  async updateDoctorStatus(userId: string, approved: boolean): Promise<boolean> {
    try {
      await supabase.from('doctors').update({ is_verified: approved }).eq('user_id', userId);
      await supabase.from('profiles').update({ is_verified: approved }).eq('id', userId);
      return true;
    } catch {
      return false;
    }
  },
};

// Mappers
function mapToPatient(p: any): PatientProfile {
  return {
    id: p.id,
    phone: p.phone || '',
    name: p.name || '',
    email: p.email,
    dateOfBirth: p.date_of_birth,
    gender: p.gender,
    bloodGroup: p.blood_group,
    avatarUrl: p.avatar_url,
    subscriptionTier: 'premium',
    isVerified: p.is_verified || false,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function mapToDoctor(d: any): DoctorProfile {
  const p = d.profiles || {};
  return {
    id: p.id || d.user_id,
    phone: p.phone || '',
    name: p.name || '',
    email: p.email,
    dateOfBirth: p.date_of_birth,
    gender: p.gender,
    bmdcNumber: d.bmdc_number || '',
    nidNumber: d.nid_number,
    specializations: d.specialties || [],
    qualifications: d.degrees || [],
    experienceYears: d.experience_years || 0,
    consultationFee: d.consultation_fee || 0,
    chambers: [],
    avatarUrl: p.avatar_url,
    status: d.is_verified ? 'approved' : 'pending',
    isVerified: d.is_verified || false,
    rating: parseFloat(d.rating) || 0,
    totalPatients: d.total_patients || 0,
    createdAt: p.created_at || d.created_at,
    updatedAt: p.updated_at || d.updated_at,
  };
}

// Admin
const admin = {
  DEFAULT: { password: 'nirnoy2024', name: 'Admin', email: 'admin@nirnoy.ai' },
  
  getConfig(): AdminConfig {
    try {
      const stored = localStorage.getItem(ADMIN_KEY);
      return stored ? JSON.parse(stored) : this.DEFAULT;
    } catch {
      return this.DEFAULT;
    }
  },
  
  setConfig(config: Partial<AdminConfig>): void {
    const current = this.getConfig();
    localStorage.setItem(ADMIN_KEY, JSON.stringify({ ...current, ...config }));
  },
  
  validatePassword(password: string): boolean {
    return password === this.getConfig().password;
  },
  
  changePassword(newPassword: string): void {
    this.setConfig({ password: newPassword });
  },
};

// ============================================
// MAIN AUTH SERVICE
// ============================================
export const authService = {
  async initialize(): Promise<void> {
    console.log('[Auth] Initializing...');
    console.log('[Auth] Supabase configured:', isSupabaseConfigured());
  },
  
  getCurrentUser(): { user: PatientProfile | DoctorProfile; role: string } | null {
    const sessionData = session.get();
    if (!sessionData) return null;
    return { user: sessionData.userData, role: sessionData.role };
  },
  
  async checkPhone(phone: string): Promise<{ exists: boolean; type: 'patient' | 'doctor' | null; isApproved?: boolean }> {
    const profile = await db.getProfileByPhone(phone);
    if (!profile) return { exists: false, type: null };
    
    if (profile.role === 'doctor') {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('is_verified')
        .eq('user_id', profile.id)
        .single();
      return { exists: true, type: 'doctor', isApproved: doctor?.is_verified };
    }
    
    return { exists: true, type: 'patient' };
  },
  
  async loginPatient(phone: string): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] Login patient:', phone);
    const profile = await db.getProfileByPhone(phone);
    
    if (!profile || profile.role !== 'patient') {
      return { success: false, error: 'Patient not found' };
    }
    
    const patient = mapToPatient(profile);
    session.save(patient.id, 'patient', patient);
    return { success: true, user: patient };
  },
  
  async registerPatient(data: any): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] Register patient:', data.phone);
    
    const patientId = generateId();
    const result = await db.createProfile({
      id: patientId,
      phone: data.phone,
      name: data.name,
      email: data.email,
      role: 'patient',
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
    });
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    await db.createPatientRecord(patientId, data);
    
    const patient: PatientProfile = {
      id: patientId,
      phone: normalizePhone(data.phone),
      name: data.name,
      email: data.email,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      emergencyContact: data.emergencyContact,
      subscriptionTier: 'premium',
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    session.save(patientId, 'patient', patient);
    console.log('[Auth] Patient registered and session saved');
    return { success: true, user: patient };
  },
  
  async loginDoctor(phone: string): Promise<{ success: boolean; user?: DoctorProfile; error?: string }> {
    console.log('[Auth] Login doctor:', phone);
    const profile = await db.getProfileByPhone(phone);
    
    if (!profile || profile.role !== 'doctor') {
      return { success: false, error: 'Doctor not found' };
    }
    
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', profile.id)
      .single();
    
    if (!doctorData?.is_verified) {
      return { success: false, error: 'Account pending approval' };
    }
    
    const doctor = mapToDoctor({ ...doctorData, profiles: profile });
    session.save(doctor.id, 'doctor', doctor);
    return { success: true, user: doctor };
  },
  
  async registerDoctor(data: any): Promise<{ success: boolean; user?: DoctorProfile; error?: string }> {
    console.log('[Auth] Register doctor:', data.phone);
    
    const doctorId = generateId();
    const result = await db.createProfile({
      id: doctorId,
      phone: data.phone,
      name: data.name,
      email: data.email,
      role: 'doctor',
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
    });
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    const doctorCreated = await db.createDoctorRecord(doctorId, data);
    if (!doctorCreated) {
      return { success: false, error: 'Failed to create doctor record' };
    }
    
    console.log('[Auth] Doctor registered - pending approval');
    return { success: true };
  },
  
  logout(): void {
    session.clear();
  },
  
  async updatePatient(id: string, updates: any): Promise<boolean> {
    const current = session.get();
    if (current) {
      const updated = { ...current.userData, ...updates };
      session.save(id, 'patient', updated);
    }
    return true;
  },
  
  getAllPatients: () => db.getAllPatients(),
  getAllDoctors: () => db.getAllDoctors(),
  getPendingDoctors: () => db.getPendingDoctors(),
  
  async updateDoctorStatus(id: string, phone: string, status: 'approved' | 'rejected'): Promise<boolean> {
    return await db.updateDoctorStatus(id, status === 'approved');
  },
  
  admin: {
    validatePassword: admin.validatePassword.bind(admin),
    changePassword: admin.changePassword.bind(admin),
    getConfig: admin.getConfig.bind(admin),
    setConfig: admin.setConfig.bind(admin),
  },
  
  isOnline: () => navigator.onLine,
  isSupabaseConfigured,
  normalizePhone,
};

export { ADMIN_KEY as STORAGE_KEYS };
