/**
 * NIRNOY AUTH SERVICE - PRODUCTION READY v2
 * ======================================
 * Supabase = Cloud Database (1000+ users)
 * localStorage = Session Cache ONLY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SESSION_KEY = 'nirnoy_session';

console.log('=== NIRNOY AUTH SERVICE v2 ===');
console.log('[Config] SUPABASE_URL:', SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET');
console.log('[Config] SUPABASE_KEY:', SUPABASE_ANON_KEY ? 'SET (' + SUPABASE_ANON_KEY.length + ' chars)' : 'NOT SET');

// Types
export interface PatientProfile {
  id: string;
  visibleId?: string;
  phone: string;
  name: string;
  email?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  chronicConditions?: string[];
  allergies?: string[];
  heightCm?: number;
  weightKg?: number;
  avatarUrl?: string;
  subscriptionTier: 'free' | 'basic' | 'premium' | 'family';
  quizPoints?: number;
  streakDays?: number;
  healthScore?: number;
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
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.includes('supabase'));
};

// Phone normalization
export const normalizePhone = (phone: string): string => {
  let n = phone.replace(/[^0-9]/g, '');
  if (n.startsWith('880')) n = n.substring(3);
  if (n.startsWith('0')) n = n.substring(1);
  return n;
};

// Session cache (localStorage) - ONLY for quick access, NOT source of truth
const session = {
  save(userId: string, role: string, user: any): void {
    console.log('[Session] SAVING:', { userId, role, name: user?.name });
    try {
      const data = JSON.stringify({ userId, role, user, ts: Date.now() });
      localStorage.setItem(SESSION_KEY, data);
    } catch (e) {
      console.error('[Session] SAVE FAILED:', e);
    }
  },
  
  get(): { userId: string; role: string; user: any } | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Check expiry (7 days)
      if (Date.now() - data.ts > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },
  
  clear(): void {
    localStorage.removeItem(SESSION_KEY);
  }
};

// Admin config
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
    if (!isSupabaseConfigured()) return null;
    
    const normalized = normalizePhone(phone);
    console.log('[DB] Finding phone:', normalized);
    
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', normalized)
        .maybeSingle();
      
      if (!data) {
        const result = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', '0' + normalized)
          .maybeSingle();
        data = result.data;
      }
      
      return data || null;
    } catch (e) {
      console.error('[DB] Exception:', e);
      return null;
    }
  },

  async getFullPatientProfile(profileId: string): Promise<PatientProfile | null> {
    if (!isSupabaseConfigured()) return null;
    
    try {
      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (profileError || !profile) {
        console.error('[DB] Profile fetch error:', profileError);
        return null;
      }
      
      // Get patient data
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('profile_id', profileId)
        .single();
      
      if (patientError) {
        console.log('[DB] No patient record, creating...');
        await supabase.from('patients').insert({ profile_id: profileId, subscription_tier: 'premium' });
      }
      
      // Combine all data
      const patient: PatientProfile = {
        id: profile.id,
        visibleId: profile.id.substring(0, 8).toUpperCase(),
        phone: profile.phone,
        name: profile.name,
        email: profile.email,
        dateOfBirth: profile.date_of_birth,
        gender: profile.gender,
        bloodGroup: profile.blood_group,
        avatarUrl: profile.avatar_url,
        // Patient-specific fields from patients table
        heightCm: patientData?.height_cm || undefined,
        weightKg: patientData?.weight_kg || undefined,
        chronicConditions: patientData?.chronic_conditions || [],
        allergies: patientData?.allergies || [],
        emergencyContactPhone: patientData?.emergency_contact_phone || undefined,
        emergencyContactName: patientData?.emergency_contact_name || undefined,
        emergencyContact: patientData?.emergency_contact_phone || undefined,
        subscriptionTier: patientData?.subscription_tier || 'premium',
        quizPoints: patientData?.quiz_points || 0,
        streakDays: patientData?.streak_days || 0,
        healthScore: patientData?.health_score || 75,
        isVerified: profile.is_verified,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      };
      
      console.log('[DB] Full patient profile loaded:', patient.name, 'height:', patient.heightCm, 'weight:', patient.weightKg);
      return patient;
    } catch (e) {
      console.error('[DB] getFullPatientProfile exception:', e);
      return null;
    }
  },

  async createPatient(profileData: any, patientData: any): Promise<{ success: boolean; profile?: any; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }
    
    console.log('[DB] Creating patient:', profileData.phone, profileData.name);
    
    try {
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
      
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          profile_id: profile.id,
          emergency_contact_phone: patientData.emergencyContact || null,
          chronic_conditions: patientData.chronicConditions || [],
          allergies: patientData.allergies || [],
          subscription_tier: 'premium',
          health_score: 75
        });
      
      if (patientError) {
        console.error('[DB] Patient insert error:', patientError);
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
        return { success: false, error: profileError.message };
      }
      
      const { error: doctorError } = await supabase
        .from('doctors')
        .insert({
          profile_id: profile.id,
          bmdc_number: doctorData.bmdcNumber,
          nid_number: doctorData.nidNumber || null,
          specialties: doctorData.specializations || [],
          experience_years: doctorData.experienceYears || 0,
          consultation_fee: doctorData.consultationFee || 500,
          is_verified: false  // Pending admin approval
        });
      
      if (doctorError) {
        return { success: false, error: doctorError.message };
      }
      
      return { success: true, profile };
    } catch (e: any) {
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
        heightCm: p.patients?.[0]?.height_cm,
        weightKg: p.patients?.[0]?.weight_kg,
        chronicConditions: p.patients?.[0]?.chronic_conditions || [],
        allergies: p.patients?.[0]?.allergies || [],
        subscriptionTier: p.patients?.[0]?.subscription_tier || 'premium',
        healthScore: p.patients?.[0]?.health_score || 75,
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
    // Filter by is_verified=false (pending approval)
    return all.filter(d => !d.isVerified);
  },

  async updateDoctorStatus(profileId: string, status: 'approved' | 'rejected'): Promise<boolean> {
    try {
      await supabase.from('doctors').update({ status }).eq('profile_id', profileId);
      await supabase.from('profiles').update({ is_verified: status === 'approved' }).eq('id', profileId);
      return true;
    } catch { return false; }
  }
};

// ============ AI CHAT HISTORY ============
export const aiChatService = {
  async saveConversation(patientId: string, messages: any[], summary?: string): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;
    
    try {
      // Get patient record ID
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', patientId)
        .single();
      
      if (!patient) {
        console.error('[AI Chat] Patient not found');
        return null;
      }
      
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          patient_id: patient.id,
          messages: messages,
          summary: summary || null,
          ended_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('[AI Chat] Save error:', error);
        return null;
      }
      
      console.log('[AI Chat] Conversation saved:', data.id);
      return data.id;
    } catch (e) {
      console.error('[AI Chat] Save exception:', e);
      return null;
    }
  },

  async getConversations(patientId: string, limit = 10): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];
    
    try {
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('profile_id', patientId)
        .single();
      
      if (!patient) return [];
      
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('[AI Chat] Get error:', error);
        return [];
      }
      
      return data || [];
    } catch (e) {
      console.error('[AI Chat] Get exception:', e);
      return [];
    }
  },

  async getLatestMessages(patientId: string): Promise<any[]> {
    const conversations = await this.getConversations(patientId, 3);
    const allMessages: any[] = [];
    
    for (const conv of conversations) {
      if (conv.messages && Array.isArray(conv.messages)) {
        allMessages.push(...conv.messages);
      }
    }
    
    // Return last 10 messages for context
    return allMessages.slice(-10);
  },

  async updateConversation(conversationId: string, messages: any[]): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({ messages, ended_at: new Date().toISOString() })
        .eq('id', conversationId);
      
      return !error;
    } catch {
      return false;
    }
  }
};

// ============ MAIN AUTH SERVICE ============
export const authService = {
  async initialize(): Promise<void> {
    console.log('[Auth] Initializing...');
  },

  getCurrentUser(): { user: PatientProfile | DoctorProfile; role: string } | null {
    const cached = session.get();
    if (!cached) return null;
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
        .select('is_verified')
        .eq('profile_id', profile.id)
        .single();
      return { exists: true, type: 'doctor', isApproved: doctor?.is_verified === true };
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
    
    // Get FULL patient profile from database
    const patient = await db.getFullPatientProfile(profile.id);
    if (!patient) {
      return { success: false, error: 'Failed to load patient data' };
    }
    
    // Save to session cache
    session.save(patient.id, 'patient', patient);
    console.log('[Auth] Patient logged in:', patient.name, 'height:', patient.heightCm, 'weight:', patient.weightKg);
    return { success: true, user: patient };
  },

  async registerPatient(data: any): Promise<{ success: boolean; user?: PatientProfile; error?: string }> {
    console.log('[Auth] registerPatient:', data.phone, data.name);
    
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Database not configured' };
    }
    
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
    
    // Get full profile
    const patient = await db.getFullPatientProfile(result.profile!.id);
    if (!patient) {
      return { success: false, error: 'Failed to load patient data' };
    }
    
    session.save(patient.id, 'patient', patient);
    console.log('[Auth] Patient registered:', patient.name, patient.id);
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
    
    if (!doctorData?.is_verified) {
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
    
    return { success: true };
  },

  logout(): void {
    console.log('[Auth] Logging out');
    session.clear();
  },

  async updatePatient(id: string, updates: any): Promise<boolean> {
    console.log('[Auth] updatePatient:', id, updates);
    
    if (!isSupabaseConfigured()) {
      console.error('[Auth] Supabase not configured');
      return false;
    }
    
    try {
      // Update profiles table
      const profileUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.name !== undefined) profileUpdates.name = updates.name;
      if (updates.email !== undefined) profileUpdates.email = updates.email;
      if (updates.dateOfBirth !== undefined) profileUpdates.date_of_birth = updates.dateOfBirth;
      if (updates.gender !== undefined) profileUpdates.gender = updates.gender;
      if (updates.bloodGroup !== undefined) profileUpdates.blood_group = updates.bloodGroup;
      
      console.log('[Auth] Updating profiles table:', profileUpdates);
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', id);
      
      if (profileError) {
        console.error('[Auth] Profile update error:', profileError);
        return false;
      }
      
      // Update patients table
      const patientUpdates: any = {};
      if (updates.heightCm !== undefined) patientUpdates.height_cm = updates.heightCm;
      if (updates.weightKg !== undefined) patientUpdates.weight_kg = updates.weightKg;
      if (updates.chronicConditions !== undefined) patientUpdates.chronic_conditions = updates.chronicConditions;
      if (updates.allergies !== undefined) patientUpdates.allergies = updates.allergies;
      if (updates.emergencyContactPhone !== undefined) patientUpdates.emergency_contact_phone = updates.emergencyContactPhone;
      if (updates.emergencyContactName !== undefined) patientUpdates.emergency_contact_name = updates.emergencyContactName;
      if (updates.healthScore !== undefined) patientUpdates.health_score = updates.healthScore;
      
      if (Object.keys(patientUpdates).length > 0) {
        console.log('[Auth] Updating patients table:', patientUpdates);
        const { error: patientError } = await supabase
          .from('patients')
          .update(patientUpdates)
          .eq('profile_id', id);
        
        if (patientError) {
          console.error('[Auth] Patient update error:', patientError);
          return false;
        }
      }
      
      // Refresh session with updated data from DB
      const refreshedUser = await db.getFullPatientProfile(id);
      if (refreshedUser) {
        session.save(id, 'patient', refreshedUser);
        console.log('[Auth] Session refreshed with new data');
      }
      
      console.log('[Auth] Profile updated successfully');
      return true;
    } catch (e) {
      console.error('[Auth] Update exception:', e);
      return false;
    }
  },

  // Refresh user data from database
  async refreshPatientData(id: string): Promise<PatientProfile | null> {
    const patient = await db.getFullPatientProfile(id);
    if (patient) {
      session.save(id, 'patient', patient);
    }
    return patient;
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
