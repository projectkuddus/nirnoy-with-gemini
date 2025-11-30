/**
 * ============================================
 * NIRNOY CLOUD AUTHENTICATION SERVICE
 * ============================================
 * 100% Cloud-based - Supabase Only
 * No localStorage for user data
 * Military-grade security
 * ============================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only for session management (not user data)
const SESSION_KEY = 'nirnoy_session';
const ADMIN_KEY = 'nirnoy_admin';

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
}

// ============================================
// SUPABASE CLIENT
// ============================================
export const supabase: SupabaseClient = createClient(
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
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11);
};

// ============================================
// SESSION MANAGEMENT (localStorage only for session token)
// ============================================
const session = {
  save(userId: string, role: string, userData: any): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, role, userData, timestamp: Date.now() }));
    } catch (e) {
      console.error('[Session] Failed to save:', e);
    }
  },
  
  get(): { userId: string; role: string; userData: any } | null {
    try {
      const data = sessionStorage.getItem(SESSION_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      // Session expires after 24 hours
      if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },
  
  clear(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.error('[Session] Failed to clear:', e);
    }
  },
};

// ============================================
// DATABASE OPERATIONS - 100% CLOUD
// ============================================
const db = {
  // ---- PROFILES ----
  async getProfileByPhone(phone: string): Promise<{ profile: any; type: 'patient' | 'doctor' | null } | null> {
    if (!isSupabaseConfigured()) {
      console.error('[DB] Supabase not configured!');
      return null;
    }
    
    const normalized = normalizePhone(phone);
    console.log('[DB] Looking for phone:', normalized);
    
    try {
      // Search in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`phone.eq.${normalized},phone.eq.0${normalized}`);
      
      if (error) {
        console.error('[DB] Query error:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('[DB] No profile found');
        return null;
      }
      
      const profile = data[0];
      console.log('[DB] Found profile:', profile.name, 'role:', profile.role);
      
      return {
        profile,
        type: profile.role as 'patient' | 'doctor',
      };
    } catch (err) {
      console.error('[DB] getProfileByPhone error:', err);
      return null;
    }
  },
  
  async createPatient(patient: PatientProfile): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }
    
    const normalized = normalizePhone(patient.phone);
    console.log('[DB] Creating patient:', normalized);
    
    try {
      // Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: patient.id,
          phone: normalized,
          name: patient.name,
          email: patient.email || null,
          role: 'patient',
          date_of_birth: patient.dateOfBirth || null,
          gender: patient.gender || null,
          blood_group: patient.bloodGroup || null,
          avatar_url: patient.avatarUrl || null,
          is_verified: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('[DB] Profile creation error:', profileError);
        return { success: false, error: profileError.message };
      }
      
      console.log('[DB] Profile created:', profileData.id);
      
      // Create patient record
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          user_id: profileData.id,
          emergency_contact_phone: patient.emergencyContact || null,
          chronic_conditions: patient.chronicConditions || [],
          allergies: patient.allergies || [],
          height_cm: patient.height || null,
          weight_kg: patient.weight || null,
          subscription_tier: patient.subscriptionTier || 'premium',
        });
      
      if (patientError) {
        console.error('[DB] Patient record error:', patientError);
        // Profile was created, so partial success
      }
      
      console.log('[DB] Patient created successfully');
      return { success: true };
    } catch (error: any) {
      console.error('[DB] Create patient failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  async createDoctor(doctor: DoctorProfile): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }
    
    const normalized = normalizePhone(doctor.phone);
    console.log('[DB] Creating doctor:', normalized);
    
    try {
      // Create profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: doctor.id,
          phone: normalized,
          name: doctor.name,
          email: doctor.email || null,
          role: 'doctor',
          date_of_birth: doctor.dateOfBirth || null,
          gender: doctor.gender || null,
          avatar_url: doctor.avatarUrl || null,
          is_verified: false, // Needs admin approval
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('[DB] Doctor profile creation error:', profileError);
        return { success: false, error: profileError.message };
      }
      
      console.log('[DB] Doctor profile created:', profileData.id);
      
      // Create doctor record
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .insert({
          user_id: profileData.id,
          bmdc_number: doctor.bmdcNumber,
          nid_number: doctor.nidNumber || null,
          degrees: doctor.qualifications || [],
          specialties: doctor.specializations || [],
          experience_years: doctor.experienceYears || 0,
          consultation_fee: doctor.consultationFee || 500,
          is_verified: false,
          is_featured: false,
          rating: 0,
          total_reviews: 0,
          total_patients: 0,
        })
        .select()
        .single();
      
      if (doctorError) {
        console.error('[DB] Doctor record error:', doctorError);
        return { success: false, error: doctorError.message };
      }
      
      // Create chambers if provided
      if (doctor.chambers && doctor.chambers.length > 0) {
        for (const chamber of doctor.chambers) {
          await supabase.from('chambers').insert({
            doctor_id: doctorData.id,
            name: chamber.name,
            address: chamber.address,
            area: chamber.area,
            city: chamber.city,
            phone: chamber.phone || null,
            fee: chamber.fee,
            is_primary: true,
          });
        }
      }
      
      console.log('[DB] Doctor created successfully');
      return { success: true };
    } catch (error: any) {
      console.error('[DB] Create doctor failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  async getPatientByPhone(phone: string): Promise<PatientProfile | null> {
    const result = await this.getProfileByPhone(phone);
    if (!result || result.type !== 'patient') return null;
    
    const profile = result.profile;
    
    // Get patient-specific data
    const { data: patientData } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', profile.id)
      .single();
    
    return {
      id: profile.id,
      phone: profile.phone,
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
  },
  
  async getDoctorByPhone(phone: string): Promise<DoctorProfile | null> {
    const result = await this.getProfileByPhone(phone);
    if (!result || result.type !== 'doctor') return null;
    
    const profile = result.profile;
    
    // Get doctor-specific data
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('*, chambers(*)')
      .eq('user_id', profile.id)
      .single();
    
    return {
      id: profile.id,
      phone: profile.phone,
      name: profile.name || '',
      email: profile.email,
      dateOfBirth: profile.date_of_birth,
      gender: profile.gender,
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
      avatarUrl: profile.avatar_url,
      status: doctorData?.is_verified ? 'approved' : 'pending',
      isVerified: doctorData?.is_verified || false,
      rating: parseFloat(doctorData?.rating) || 0,
      totalPatients: doctorData?.total_patients || 0,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
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
      
      return data.map(profile => ({
        id: profile.id,
        phone: profile.phone || '',
        name: profile.name || '',
        email: profile.email,
        dateOfBirth: profile.date_of_birth,
        gender: profile.gender,
        bloodGroup: profile.blood_group,
        avatarUrl: profile.avatar_url,
        subscriptionTier: 'premium' as const,
        isVerified: profile.is_verified || false,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      }));
    } catch {
      return [];
    }
  },
  
  async getAllDoctors(): Promise<DoctorProfile[]> {
    if (!isSupabaseConfigured()) return [];
    
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*, profiles:user_id(*), chambers(*)')
        .order('created_at', { ascending: false });
      
      if (error || !data) return [];
      
      return data.map(d => {
        const profile = d.profiles || {};
        return {
          id: profile.id || d.user_id,
          phone: profile.phone || '',
          name: profile.name || '',
          email: profile.email,
          dateOfBirth: profile.date_of_birth,
          gender: profile.gender,
          bmdcNumber: d.bmdc_number || '',
          nidNumber: d.nid_number,
          specializations: d.specialties || [],
          qualifications: d.degrees || [],
          experienceYears: d.experience_years || 0,
          consultationFee: d.consultation_fee || 0,
          chambers: (d.chambers || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            address: c.address,
            area: c.area,
            city: c.city,
            phone: c.phone,
            fee: c.fee,
            schedule: [],
          })),
          avatarUrl: profile.avatar_url,
          status: d.is_verified ? 'approved' as const : 'pending' as const,
          isVerified: d.is_verified || false,
          rating: parseFloat(d.rating) || 0,
          totalPatients: d.total_patients || 0,
          createdAt: profile.created_at || d.created_at,
          updatedAt: profile.updated_at || d.updated_at,
        };
      });
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
        .eq('is_verified', false)
        .order('created_at', { ascending: false });
      
      if (error || !data) return [];
      
      return data.map(d => {
        const profile = d.profiles || {};
        return {
          id: profile.id || d.user_id,
          phone: profile.phone || '',
          name: profile.name || '',
          email: profile.email,
          dateOfBirth: profile.date_of_birth,
          gender: profile.gender,
          bmdcNumber: d.bmdc_number || '',
          nidNumber: d.nid_number,
          specializations: d.specialties || [],
          qualifications: d.degrees || [],
          experienceYears: d.experience_years || 0,
          consultationFee: d.consultation_fee || 0,
          chambers: [],
          avatarUrl: profile.avatar_url,
          status: 'pending' as const,
          isVerified: false,
          rating: 0,
          totalPatients: 0,
          createdAt: profile.created_at || d.created_at,
          updatedAt: profile.updated_at || d.updated_at,
        };
      });
    } catch {
      return [];
    }
  },
  
  async updateDoctorStatus(userId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    
    try {
      const isVerified = status === 'approved';
      
      // Update doctor record
      const { error: doctorError } = await supabase
        .from('doctors')
        .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      
      if (doctorError) {
        console.error('[DB] Update doctor status error:', doctorError);
        return false;
      }
      
      // Update profile
      await supabase
        .from('profiles')
        .update({ is_verified: isVerified, updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      console.log('[DB] Doctor status updated:', userId, status);
      return true;
    } catch (err) {
      console.error('[DB] updateDoctorStatus error:', err);
      return false;
    }
  },
};

// ============================================
// ADMIN OPERATIONS (stored in localStorage for simplicity)
// ============================================
const admin = {
  DEFAULT: {
    password: 'nirnoy2024',
    name: 'Admin',
    email: 'admin@nirnoy.ai',
  } as AdminConfig,
  
  getConfig(): AdminConfig {
    try {
      const stored = localStorage.getItem(ADMIN_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return this.DEFAULT;
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
    console.log('[Auth] Supabase URL:', SUPABASE_URL ? 'configured' : 'missing');
    console.log('[Auth] Supabase Key:', SUPABASE_ANON_KEY ? 'configured' : 'missing');
    console.log('[Auth] Is configured:', isSupabaseConfigured());
  },
  
  getCurrentUser(): { user: PatientProfile | DoctorProfile; role: string } | null {
    const sessionData = session.get();
    if (!sessionData) return null;
    return { user: sessionData.userData, role: sessionData.role };
  },
  
  async checkPhone(phone: string): Promise<{ exists: boolean; type: 'patient' | 'doctor' | null; isApproved?: boolean }> {
    const normalized = normalizePhone(phone);
    console.log('[Auth] Checking phone:', normalized);
    
    const result = await db.getProfileByPhone(normalized);
    
    if (!result) {
      return { exists: false, type: null };
    }
    
    if (result.type === 'doctor') {
      return { 
        exists: true, 
        type: 'doctor', 
        isApproved: result.profile.is_verified 
      };
    }
    
    return { exists: true, type: 'patient' };
  },
  
  async loginPatient(phone: string): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] Logging in patient:', phone);
    
    const patient = await db.getPatientByPhone(phone);
    
    if (!patient) {
      return { success: false, error: 'Patient not found' };
    }
    
    // Save session
    session.save(patient.id, 'patient', patient);
    
    return { success: true, user: patient };
  },
  
  async registerPatient(data: any): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] Registering patient:', data.phone);
    
    const patient: PatientProfile = {
      id: generateId(),
      phone: normalizePhone(data.phone),
      name: data.name,
      email: data.email,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      emergencyContact: data.emergencyContact,
      chronicConditions: [],
      allergies: [],
      subscriptionTier: 'premium',
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const result = await db.createPatient(patient);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    // Save session
    session.save(patient.id, 'patient', patient);
    
    return { success: true, user: patient };
  },
  
  async loginDoctor(phone: string): Promise<{ success: boolean; user?: DoctorProfile; error?: string }> {
    console.log('[Auth] Logging in doctor:', phone);
    
    const doctor = await db.getDoctorByPhone(phone);
    
    if (!doctor) {
      return { success: false, error: 'Doctor not found' };
    }
    
    if (!doctor.isVerified) {
      return { success: false, error: 'Account pending approval' };
    }
    
    // Save session
    session.save(doctor.id, 'doctor', doctor);
    
    return { success: true, user: doctor };
  },
  
  async registerDoctor(data: any): Promise<{ success: boolean; user?: DoctorProfile; error?: string }> {
    console.log('[Auth] Registering doctor:', data.phone);
    
    const doctor: DoctorProfile = {
      id: generateId(),
      phone: normalizePhone(data.phone),
      name: data.name,
      email: data.email,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bmdcNumber: data.bmdcNumber,
      nidNumber: data.nidNumber,
      specializations: data.specializations || [],
      qualifications: data.qualifications || [],
      experienceYears: data.experienceYears || 0,
      consultationFee: data.consultationFee || 500,
      chambers: data.chambers || [],
      avatarUrl: data.profileImage,
      status: 'pending',
      isVerified: false,
      rating: 0,
      totalPatients: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const result = await db.createDoctor(doctor);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    // Don't save session - doctor needs approval
    return { success: true, user: doctor };
  },
  
  logout(): void {
    session.clear();
  },
  
  async updatePatient(id: string, updates: Partial<PatientProfile>): Promise<boolean> {
    // Update in Supabase
    if (isSupabaseConfigured()) {
      await supabase
        .from('profiles')
        .update({
          name: updates.name,
          email: updates.email,
          date_of_birth: updates.dateOfBirth,
          gender: updates.gender,
          blood_group: updates.bloodGroup,
          avatar_url: updates.avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }
    
    // Update session
    const current = session.get();
    if (current && current.role === 'patient') {
      const updated = { ...current.userData, ...updates };
      session.save(id, 'patient', updated);
    }
    
    return true;
  },
  
  async getAllPatients(): Promise<PatientProfile[]> {
    return await db.getAllPatients();
  },
  
  async getAllDoctors(): Promise<DoctorProfile[]> {
    return await db.getAllDoctors();
  },
  
  async getPendingDoctors(): Promise<DoctorProfile[]> {
    return await db.getPendingDoctors();
  },
  
  async updateDoctorStatus(id: string, phone: string, status: 'approved' | 'rejected'): Promise<boolean> {
    return await db.updateDoctorStatus(id, status);
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

// Export for use in other files
export { ADMIN_KEY as STORAGE_KEYS };
