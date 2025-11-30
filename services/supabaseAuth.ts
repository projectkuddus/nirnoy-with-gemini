/**
 * NIRNOY AUTH SERVICE - SUPABASE PRIMARY
 * ======================================
 * Supabase = Primary database (for 100+ users)
 * localStorage = Session cache only
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SESSION_KEY = 'nirnoy_session';

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
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder'
);

export const isSupabaseConfigured = (): boolean => {
  const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.includes('supabase'));
  console.log('[Supabase] Configured:', configured, SUPABASE_URL ? 'URL set' : 'No URL');
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
    console.log('[Session] Saving:', role, user?.name);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, role, user, ts: Date.now() }));
  },
  get(): { userId: string; role: string; user: any } | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch { return null; }
  },
  clear(): void {
    localStorage.removeItem(SESSION_KEY);
  }
};

// Admin config (localStorage - admin is single user)
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
    const normalized = normalizePhone(phone);
    console.log('[DB] Finding phone:', normalized);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`phone.eq.${normalized},phone.eq.0${normalized}`)
      .limit(1)
      .single();
    
    if (error) {
      console.log('[DB] Not found or error:', error.message);
      return null;
    }
    console.log('[DB] Found:', data?.name);
    return data;
  },

  async createPatient(profileData: any, patientData: any): Promise<{ success: boolean; profile?: any; error?: string }> {
    console.log('[DB] Creating patient:', profileData.phone);
    
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
      console.error('[DB] Profile error:', profileError);
      return { success: false, error: profileError.message };
    }
    
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
      console.error('[DB] Patient error:', patientError);
      // Don't fail - profile was created
    }
    
    console.log('[DB] Patient created:', profile.id);
    return { success: true, profile };
  },

  async createDoctor(profileData: any, doctorData: any): Promise<{ success: boolean; profile?: any; error?: string }> {
    console.log('[DB] Creating doctor:', profileData.phone);
    
    // 1. Create profile
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
      console.error('[DB] Profile error:', profileError);
      return { success: false, error: profileError.message };
    }
    
    // 2. Create doctor record
    const { data: doctor, error: doctorError } = await supabase
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
      })
      .select()
      .single();
    
    if (doctorError) {
      console.error('[DB] Doctor error:', doctorError);
      return { success: false, error: doctorError.message };
    }
    
    // 3. Create chambers if provided
    if (doctorData.chambers?.length > 0) {
      for (const chamber of doctorData.chambers) {
        await supabase.from('chambers').insert({
          doctor_id: doctor.id,
          name: chamber.name || 'Main Chamber',
          address: chamber.address || '',
          area: chamber.area || '',
          city: chamber.city || 'Dhaka',
          fee: chamber.fee || 500,
          is_primary: true
        });
      }
    }
    
    console.log('[DB] Doctor created:', profile.id);
    return { success: true, profile };
  },

  async getAllPatients(): Promise<PatientProfile[]> {
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
      emergencyContact: p.patients?.[0]?.emergency_contact,
      chronicConditions: p.patients?.[0]?.chronic_conditions || [],
      allergies: p.patients?.[0]?.allergies || [],
      subscriptionTier: p.patients?.[0]?.subscription_tier || 'premium',
      isVerified: p.is_verified,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
  },

  async getAllDoctors(): Promise<DoctorProfile[]> {
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
  },

  async getPendingDoctors(): Promise<DoctorProfile[]> {
    const all = await this.getAllDoctors();
    return all.filter(d => d.status === 'pending');
  },

  async updateDoctorStatus(profileId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    // Update doctor status
    const { error: doctorError } = await supabase
      .from('doctors')
      .update({ status })
      .eq('profile_id', profileId);
    
    // Update profile verification
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_verified: status === 'approved' })
      .eq('id', profileId);
    
    return !doctorError && !profileError;
  }
};

// ============ MAIN AUTH SERVICE ============
export const authService = {
  async initialize(): Promise<void> {
    console.log('[Auth] Initializing...');
    console.log('[Auth] Supabase configured:', isSupabaseConfigured());
  },

  getCurrentUser(): { user: PatientProfile | DoctorProfile; role: string } | null {
    const cached = session.get();
    if (!cached) {
      console.log('[Auth] No cached session');
      return null;
    }
    console.log('[Auth] Found cached session:', cached.role, cached.user?.name);
    return { user: cached.user, role: cached.role };
  },

  async checkPhone(phone: string): Promise<{ exists: boolean; type: 'patient' | 'doctor' | null; isApproved?: boolean }> {
    if (!isSupabaseConfigured()) {
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
    console.log('[Auth] Login patient:', phone);
    
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database not configured' };
    }
    
    const profile = await db.findByPhone(phone);
    if (!profile || profile.role !== 'patient') {
      return { success: false, error: 'Patient not found' };
    }
    
    // Get patient details
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
    return { success: true, user: patient };
  },

  async registerPatient(data: any): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] Register patient:', data.phone);
    
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database not configured' };
    }
    
    // Check if already exists
    const existing = await db.findByPhone(data.phone);
    if (existing) {
      return { success: false, error: 'Phone already registered' };
    }
    
    const result = await db.createPatient(
      { phone: data.phone, name: data.name, email: data.email, dateOfBirth: data.dateOfBirth, gender: data.gender, bloodGroup: data.bloodGroup },
      { emergencyContact: data.emergencyContact, chronicConditions: data.chronicConditions, allergies: data.allergies }
    );
    
    if (!result.success) {
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
    
    session.save(patient.id, 'patient', patient);
    console.log('[Auth] Patient registered and session saved');
    return { success: true, user: patient };
  },

  async loginDoctor(phone: string): Promise<{ success: boolean; user?: DoctorProfile; error?: string }> {
    console.log('[Auth] Login doctor:', phone);
    
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
    console.log('[Auth] Register doctor:', data.phone);
    
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database not configured' };
    }
    
    const existing = await db.findByPhone(data.phone);
    if (existing) {
      return { success: false, error: 'Phone already registered' };
    }
    
    const result = await db.createDoctor(
      { phone: data.phone, name: data.name, email: data.email, dateOfBirth: data.dateOfBirth, gender: data.gender },
      { bmdcNumber: data.bmdcNumber, nidNumber: data.nidNumber, specializations: data.specializations, qualifications: data.qualifications, institution: data.institution, experienceYears: data.experienceYears, consultationFee: data.consultationFee, chambers: data.chambers }
    );
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    console.log('[Auth] Doctor registered - pending approval');
    return { success: true };
  },

  logout(): void {
    session.clear();
  },

  async updatePatient(id: string, updates: any): Promise<boolean> {
    // Update in Supabase
    await supabase.from('profiles').update({
      name: updates.name,
      email: updates.email,
      date_of_birth: updates.dateOfBirth,
      gender: updates.gender,
      blood_group: updates.bloodGroup,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    
    // Update session cache
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
