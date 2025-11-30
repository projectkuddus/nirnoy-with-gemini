/**
 * NIRNOY AUTH SERVICE - PRODUCTION READY
 * ======================================
 * Supabase = Cloud Database
 * localStorage = Session Cache
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration - Log at startup
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SESSION_KEY = 'nirnoy_session';

// Log configuration at module load
console.log('=== NIRNOY AUTH SERVICE ===');
console.log('[Config] SUPABASE_URL:', SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET');
console.log('[Config] SUPABASE_KEY:', SUPABASE_ANON_KEY ? 'SET (' + SUPABASE_ANON_KEY.length + ' chars)' : 'NOT SET');

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

// Supabase Client
let supabase: SupabaseClient;
try {
  supabase = createClient(
    SUPABASE_URL || 'https://placeholder.supabase.co',
    SUPABASE_ANON_KEY || 'placeholder'
  );
  console.log('[Supabase] Client created');
} catch (e) {
  console.error('[Supabase] Failed to create client:', e);
  supabase = null as any;
}

export { supabase };

export const isSupabaseConfigured = (): boolean => {
  const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.includes('supabase'));
  return configured;
};

// Phone normalization
export const normalizePhone = (phone: string): string => {
  let n = phone.replace(/[^0-9]/g, '');
  if (n.startsWith('880')) n = n.substring(3);
  if (n.startsWith('0')) n = n.substring(1);
  return n;
};

// Session cache (localStorage)
const session = {
  save(userId: string, role: string, user: any): void {
    console.log('[Session] SAVING:', { userId, role, name: user?.name });
    try {
      const data = JSON.stringify({ userId, role, user, ts: Date.now() });
      localStorage.setItem(SESSION_KEY, data);
      console.log('[Session] SAVED successfully, length:', data.length);
      // Verify save
      const verify = localStorage.getItem(SESSION_KEY);
      console.log('[Session] VERIFY:', verify ? 'Data exists' : 'DATA MISSING!');
    } catch (e) {
      console.error('[Session] SAVE FAILED:', e);
    }
  },
  
  get(): { userId: string; role: string; user: any } | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      console.log('[Session] GET:', raw ? 'Found data (' + raw.length + ' chars)' : 'No data');
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Check expiry (7 days)
      if (Date.now() - data.ts > 7 * 24 * 60 * 60 * 1000) {
        console.log('[Session] EXPIRED');
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      console.log('[Session] VALID:', data.role, data.user?.name);
      return data;
    } catch (e) {
      console.error('[Session] GET FAILED:', e);
      return null;
    }
  },
  
  clear(): void {
    console.log('[Session] CLEARING');
    localStorage.removeItem(SESSION_KEY);
  }
};

// Admin config (localStorage)
const adminConfig = {
  DEFAULT: { password: 'nirnoy2024', name: 'Admin', email: 'admin@nirnoy.ai' },
  get(): AdminConfig {
    try {
      return JSON.parse(localStorage.getItem('nirnoy_admin') || 'null') || this.DEFAULT;
    } catch { return this.DEFAULT; }
  },
  set(cfg: Partial<AdminConfig>): void {
    localStorage.setItem('nirnoy_admin', JSON.stringify({ ...this.get(), ...cfg }));
  }
};

// ============ SUPABASE DATABASE OPERATIONS ============
const db = {
  async findByPhone(phone: string): Promise<any | null> {
    if (!isSupabaseConfigured()) {
      console.log('[DB] Supabase not configured!');
      return null;
    }
    
    const normalized = normalizePhone(phone);
    console.log('[DB] Finding phone:', normalized);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`phone.eq.${normalized},phone.eq.0${normalized}`)
        .limit(1);
      
      if (error) {
        console.error('[DB] Query error:', error.message);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('[DB] No profile found');
        return null;
      }
      
      console.log('[DB] Found profile:', data[0].name, data[0].id);
      return data[0];
    } catch (e) {
      console.error('[DB] Exception:', e);
      return null;
    }
  },

  async createPatient(profileData: any, patientData: any): Promise<{ success: boolean; profile?: any; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }
    
    console.log('[DB] Creating patient:', profileData.phone, profileData.name);
    
    try {
      // 1. Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          phone: normalizePhone(profileData.phone),
          name: profileData.name,
          email: profileData.email || null,
          role: 'patient',
          date_of_birth: profileData.dateOfBirth || null,
          gender: profileData.gender || null,
          blood_group: profileData.bloodGroup || null,
          is_verified: true,
          is_active: true
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('[DB] Profile insert error:', profileError);
        return { success: false, error: profileError.message };
      }
      
      console.log('[DB] Profile created:', profile.id);
      
      // 2. Create patient record
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          profile_id: profile.id,
          emergency_contact: patientData.emergencyContact || null,
          chronic_conditions: patientData.chronicConditions || [],
          allergies: patientData.allergies || [],
          subscription_tier: 'premium'
        });
      
      if (patientError) {
        console.error('[DB] Patient insert error:', patientError);
        // Don't fail - profile was created
      }
      
      return { success: true, profile };
    } catch (e: any) {
      console.error('[DB] Create patient exception:', e);
      return { success: false, error: e.message };
    }
  },

  async createDoctor(profileData: any, doctorData: any): Promise<{ success: boolean; profile?: any; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }
    
    console.log('[DB] Creating doctor:', profileData.phone, profileData.name);
    
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          phone: normalizePhone(profileData.phone),
          name: profileData.name,
          email: profileData.email || null,
          role: 'doctor',
          date_of_birth: profileData.dateOfBirth || null,
          gender: profileData.gender || null,
          is_verified: false,
          is_active: true
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('[DB] Profile insert error:', profileError);
        return { success: false, error: profileError.message };
      }
      
      const { error: doctorError } = await supabase
        .from('doctors')
        .insert({
          profile_id: profile.id,
          bmdc_number: doctorData.bmdcNumber,
          nid_number: doctorData.nidNumber || null,
          specialties: doctorData.specializations || [],
          qualifications: doctorData.qualifications || [],
          institution: doctorData.institution || null,
          experience_years: doctorData.experienceYears || 0,
          consultation_fee: doctorData.consultationFee || 500,
          status: 'pending'
        });
      
      if (doctorError) {
        console.error('[DB] Doctor insert error:', doctorError);
        return { success: false, error: doctorError.message };
      }
      
      return { success: true, profile };
    } catch (e: any) {
      console.error('[DB] Create doctor exception:', e);
      return { success: false, error: e.message };
    }
  },

  async getAllPatients(): Promise<PatientProfile[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*, patients(*)')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });
      
      return (data || []).map(p => ({
        id: p.id,
        phone: p.phone,
        name: p.name,
        email: p.email,
        dateOfBirth: p.date_of_birth,
        gender: p.gender,
        bloodGroup: p.blood_group,
        avatarUrl: p.avatar_url,
        subscriptionTier: p.patients?.[0]?.subscription_tier || 'premium',
        isVerified: p.is_verified,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
    } catch { return []; }
  },

  async getAllDoctors(): Promise<DoctorProfile[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*, doctors(*)')
        .eq('role', 'doctor')
        .order('created_at', { ascending: false });
      
      return (data || []).map(p => {
        const d = p.doctors?.[0] || {};
        return {
          id: p.id,
          phone: p.phone,
          name: p.name,
          email: p.email,
          dateOfBirth: p.date_of_birth,
          gender: p.gender,
          bmdcNumber: d.bmdc_number || '',
          nidNumber: d.nid_number,
          specializations: d.specialties || [],
          qualifications: d.qualifications || [],
          institution: d.institution,
          experienceYears: d.experience_years || 0,
          consultationFee: d.consultation_fee || 500,
          chambers: [],
          avatarUrl: p.avatar_url,
          status: d.status || 'pending',
          isVerified: p.is_verified,
          rating: parseFloat(d.rating) || 0,
          totalPatients: d.total_patients || 0,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        };
      });
    } catch { return []; }
  },

  async getPendingDoctors(): Promise<DoctorProfile[]> {
    const all = await this.getAllDoctors();
    return all.filter(d => d.status === 'pending');
  },

  async updateDoctorStatus(profileId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    try {
      await supabase.from('doctors').update({ status }).eq('profile_id', profileId);
      await supabase.from('profiles').update({ is_verified: status === 'approved' }).eq('id', profileId);
      return true;
    } catch { return false; }
  }
};

// ============ MAIN AUTH SERVICE ============
export const authService = {
  async initialize(): Promise<void> {
    console.log('[Auth] Initializing...');
    console.log('[Auth] Supabase configured:', isSupabaseConfigured());
  },

  getCurrentUser(): { user: PatientProfile | DoctorProfile; role: string } | null {
    console.log('[Auth] getCurrentUser called');
    const cached = session.get();
    if (!cached) {
      console.log('[Auth] No cached session');
      return null;
    }
    console.log('[Auth] Returning cached user:', cached.role, cached.user?.name);
    return { user: cached.user, role: cached.role };
  },

  async checkPhone(phone: string): Promise<{ exists: boolean; type: 'patient' | 'doctor' | null; isApproved?: boolean }> {
    console.log('[Auth] checkPhone:', phone);
    
    if (!isSupabaseConfigured()) {
      console.log('[Auth] Supabase not configured, returning not exists');
      return { exists: false, type: null };
    }
    
    const profile = await db.findByPhone(phone);
    if (!profile) return { exists: false, type: null };
    
    if (profile.role === 'doctor') {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('status')
        .eq('profile_id', profile.id)
        .single();
      return { exists: true, type: 'doctor', isApproved: doctor?.status === 'approved' };
    }
    
    return { exists: true, type: 'patient' };
  },

  async loginPatient(phone: string): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] loginPatient:', phone);
    
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database not configured' };
    }
    
    const profile = await db.findByPhone(phone);
    if (!profile || profile.role !== 'patient') {
      return { success: false, error: 'Patient not found' };
    }
    
    const { data: patientData } = await supabase
      .from('patients')
      .select('*')
      .eq('profile_id', profile.id)
      .single();
    
    const patient: PatientProfile = {
      id: profile.id,
      phone: profile.phone,
      name: profile.name,
      email: profile.email,
      dateOfBirth: profile.date_of_birth,
      gender: profile.gender,
      bloodGroup: profile.blood_group,
      avatarUrl: profile.avatar_url,
      emergencyContact: patientData?.emergency_contact,
      chronicConditions: patientData?.chronic_conditions || [],
      allergies: patientData?.allergies || [],
      subscriptionTier: patientData?.subscription_tier || 'premium',
      isVerified: profile.is_verified,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };
    
    session.save(patient.id, 'patient', patient);
    console.log('[Auth] Patient logged in:', patient.name);
    return { success: true, user: patient };
  },

  async registerPatient(data: any): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] registerPatient:', data.phone, data.name);
    
    if (!isSupabaseConfigured()) {
      console.error('[Auth] Cannot register - Supabase not configured!');
      return { success: false, error: 'Database not configured' };
    }
    
    // Check if already exists
    const existing = await db.findByPhone(data.phone);
    if (existing) {
      console.log('[Auth] Phone already registered');
      return { success: false, error: 'Phone already registered' };
    }
    
    const result = await db.createPatient(
      { phone: data.phone, name: data.name, email: data.email, dateOfBirth: data.dateOfBirth, gender: data.gender, bloodGroup: data.bloodGroup },
      { emergencyContact: data.emergencyContact, chronicConditions: data.chronicConditions, allergies: data.allergies }
    );
    
    if (!result.success) {
      console.error('[Auth] Registration failed:', result.error);
      return { success: false, error: result.error };
    }
    
    const patient: PatientProfile = {
      id: result.profile!.id,
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
      updatedAt: new Date().toISOString()
    };
    
    // CRITICAL: Save session
    session.save(patient.id, 'patient', patient);
    
    console.log('[Auth] Patient registered successfully:', patient.name, patient.id);
    return { success: true, user: patient };
  },

  async loginDoctor(phone: string): Promise<{ success: boolean; user?: DoctorProfile; error?: string }> {
    console.log('[Auth] loginDoctor:', phone);
    
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database not configured' };
    }
    
    const profile = await db.findByPhone(phone);
    if (!profile || profile.role !== 'doctor') {
      return { success: false, error: 'Doctor not found' };
    }
    
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('*')
      .eq('profile_id', profile.id)
      .single();
    
    if (doctorData?.status !== 'approved') {
      return { success: false, error: 'Account pending approval' };
    }
    
    const doctor: DoctorProfile = {
      id: profile.id,
      phone: profile.phone,
      name: profile.name,
      email: profile.email,
      dateOfBirth: profile.date_of_birth,
      gender: profile.gender,
      bmdcNumber: doctorData.bmdc_number,
      nidNumber: doctorData.nid_number,
      specializations: doctorData.specialties || [],
      qualifications: doctorData.qualifications || [],
      institution: doctorData.institution,
      experienceYears: doctorData.experience_years || 0,
      consultationFee: doctorData.consultation_fee || 500,
      chambers: [],
      avatarUrl: profile.avatar_url,
      status: doctorData.status,
      isVerified: profile.is_verified,
      rating: parseFloat(doctorData.rating) || 0,
      totalPatients: doctorData.total_patients || 0,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };
    
    session.save(doctor.id, 'doctor', doctor);
    return { success: true, user: doctor };
  },

  async registerDoctor(data: any): Promise<{ success: boolean; error?: string }> {
    console.log('[Auth] registerDoctor:', data.phone, data.name);
    
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database not configured' };
    }
    
    const existing = await db.findByPhone(data.phone);
    if (existing) {
      return { success: false, error: 'Phone already registered' };
    }
    
    const result = await db.createDoctor(
      { phone: data.phone, name: data.name, email: data.email, dateOfBirth: data.dateOfBirth, gender: data.gender },
      data
    );
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    console.log('[Auth] Doctor registered - pending approval');
    return { success: true };
  },

  logout(): void {
    console.log('[Auth] Logging out');
    session.clear();
  },

  async updatePatient(id: string, updates: any): Promise<boolean> {
    await supabase.from('profiles').update({
      name: updates.name,
      email: updates.email,
      date_of_birth: updates.dateOfBirth,
      gender: updates.gender,
      blood_group: updates.bloodGroup,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    
    const cached = session.get();
    if (cached && cached.userId === id) {
      session.save(id, 'patient', { ...cached.user, ...updates });
    }
    
    return true;
  },

  getAllPatients: () => db.getAllPatients(),
  getAllDoctors: () => db.getAllDoctors(),
  getPendingDoctors: () => db.getPendingDoctors(),

  async updateDoctorStatus(id: string, phone: string, status: 'approved' | 'rejected'): Promise<boolean> {
    return await db.updateDoctorStatus(id, status);
  },

  admin: {
    validatePassword: (pwd: string) => pwd === adminConfig.get().password,
    changePassword: (newPwd: string) => adminConfig.set({ password: newPwd }),
    getConfig: () => adminConfig.get(),
    setConfig: (cfg: Partial<AdminConfig>) => adminConfig.set(cfg)
  },

  isOnline: () => navigator.onLine,
  isSupabaseConfigured,
  normalizePhone
};
