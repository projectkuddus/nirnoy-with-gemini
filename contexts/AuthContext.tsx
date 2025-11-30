import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

// ============ TYPES ============
export type UserRole = 'GUEST' | 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'family' | 'clinic';
export type DoctorStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface UserProfile {
  id: string;
  phone: string;
  email?: string;
  name: string;
  nameBn?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  isVerified: boolean;
  profileImage?: string;
}

export interface PatientProfile extends UserProfile {
  role: 'PATIENT';
  dateOfBirth?: string;
  gender?: 'male' | 'female';
  bloodGroup?: string;
  height?: number;
  weight?: number;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  familyHistory: { condition: string; relation: string }[];
  healthScore: number;
  credits: number;
  badges: string[];
  streak: number;
  referralCode: string;
  subscription: {
    tier: SubscriptionTier;
    expiresAt?: string;
    features: string[];
  };
  familyGroupId?: string;
  isKidAccount: boolean;
  parentId?: string;
}

export interface DoctorProfile extends UserProfile {
  role: 'DOCTOR';
  bmdcNumber: string;
  nidNumber?: string;
  specializations: string[];
  qualifications: {
    degree: string;
    institution: string;
    year: string;
  }[];
  experienceYears: number;
  consultationFee: number;
  status: DoctorStatus;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  rating: number;
  totalPatients: number;
  totalConsultations: number;
  credits: number;
  badges: string[];
  subscription: {
    tier: SubscriptionTier;
    expiresAt?: string;
    features: string[];
  };
  chambers: {
    id: string;
    name: string;
    address: string;
    schedule: {
      day: string;
      startTime: string;
      endTime: string;
    }[];
  }[];
}

interface AuthContextType {
  user: PatientProfile | DoctorProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole;
  isSupabaseReady: boolean;
  sendOTP: (phone: string) => Promise<{ success: boolean; otp?: string; error?: string }>;
  verifyOTP: (phone: string, otp: string) => Promise<{ success: boolean; isNewUser: boolean; error?: string }>;
  registerPatient: (data: Partial<PatientProfile>) => Promise<{ success: boolean; error?: string }>;
  registerDoctor: (data: Partial<DoctorProfile>) => Promise<{ success: boolean; error?: string }>;
  login: (phone: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<PatientProfile | DoctorProfile>) => Promise<{ success: boolean; error?: string }>;
  approveDoctor: (doctorId: string) => Promise<{ success: boolean; error?: string }>;
  rejectDoctor: (doctorId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  getAllPendingDoctors: () => Promise<DoctorProfile[]>;
  getAllUsers: () => Promise<(PatientProfile | DoctorProfile)[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys for hybrid mode (Supabase + localStorage fallback)
// IMPORTANT: These keys should NEVER change after production launch
// All user data is now stored in Supabase - localStorage is only for offline/fallback
const STORAGE_KEYS = {
  USER: 'nirnoy_user_prod',
  ROLE: 'nirnoy_role_prod',
  PATIENTS: 'nirnoy_patients_prod',
  DOCTORS: 'nirnoy_doctors_prod',
  OTP_STORE: 'nirnoy_otp_temp',
  MIGRATED: 'nirnoy_data_migrated',
};

// Old keys to migrate from (will be cleaned up after migration)
const OLD_STORAGE_KEYS = [
  'nirnoy_user', 'nirnoy_role', 'nirnoy_patients_db', 'nirnoy_doctors_db',
  'nirnoy_user_v2', 'nirnoy_role_v2', 'nirnoy_patients_db_v2', 'nirnoy_doctors_db_v2',
  'nirnoy_user_v3', 'nirnoy_role_v3', 'nirnoy_patients_db_v3', 'nirnoy_doctors_db_v3',
  'nirnoy_user_v4', 'nirnoy_role_v4', 'nirnoy_patients_db_v4', 'nirnoy_doctors_db_v4',
];

// Export for use in other components
export { STORAGE_KEYS };

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateReferralCode = () => Math.random().toString(36).substr(2, 8).toUpperCase();

// ============ MIGRATION HELPER ============
const migrateOldData = () => {
  // Check if already migrated
  if (localStorage.getItem(STORAGE_KEYS.MIGRATED)) {
    return;
  }

  console.log('[Auth] Checking for old data to migrate...');

  // Try to find and migrate old user data
  const oldUserKeys = ['nirnoy_user_v4', 'nirnoy_user_v3', 'nirnoy_user_v2', 'nirnoy_user'];
  const oldPatientsKeys = ['nirnoy_patients_db_v4', 'nirnoy_patients_db_v3', 'nirnoy_patients_db_v2', 'nirnoy_patients_db'];
  const oldDoctorsKeys = ['nirnoy_doctors_db_v4', 'nirnoy_doctors_db_v3', 'nirnoy_doctors_db_v2', 'nirnoy_doctors_db'];

  // Migrate current user
  for (const key of oldUserKeys) {
    const oldUser = localStorage.getItem(key);
    if (oldUser && !localStorage.getItem(STORAGE_KEYS.USER)) {
      console.log(`[Auth] Migrating user from ${key}`);
      localStorage.setItem(STORAGE_KEYS.USER, oldUser);
      break;
    }
  }

  // Migrate patients database
  let allPatients: PatientProfile[] = [];
  for (const key of oldPatientsKeys) {
    try {
      const oldPatients = JSON.parse(localStorage.getItem(key) || '[]');
      if (oldPatients.length > 0) {
        console.log(`[Auth] Found ${oldPatients.length} patients in ${key}`);
        allPatients = [...allPatients, ...oldPatients];
      }
    } catch (e) { /* ignore */ }
  }
  
  // Deduplicate by phone
  const uniquePatients = allPatients.reduce((acc: PatientProfile[], p) => {
    if (!acc.find(x => x.phone === p.phone)) acc.push(p);
    return acc;
  }, []);
  
  if (uniquePatients.length > 0) {
    console.log(`[Auth] Migrating ${uniquePatients.length} unique patients`);
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(uniquePatients));
  }

  // Migrate doctors database
  let allDoctors: DoctorProfile[] = [];
  for (const key of oldDoctorsKeys) {
    try {
      const oldDoctors = JSON.parse(localStorage.getItem(key) || '[]');
      if (oldDoctors.length > 0) {
        console.log(`[Auth] Found ${oldDoctors.length} doctors in ${key}`);
        allDoctors = [...allDoctors, ...oldDoctors];
      }
    } catch (e) { /* ignore */ }
  }
  
  // Deduplicate by phone
  const uniqueDoctors = allDoctors.reduce((acc: DoctorProfile[], d) => {
    if (!acc.find(x => x.phone === d.phone)) acc.push(d);
    return acc;
  }, []);
  
  if (uniqueDoctors.length > 0) {
    console.log(`[Auth] Migrating ${uniqueDoctors.length} unique doctors`);
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(uniqueDoctors));
  }

  // Mark as migrated
  localStorage.setItem(STORAGE_KEYS.MIGRATED, new Date().toISOString());
  console.log('[Auth] Migration complete!');

  // Clean up old keys (optional - keep for safety)
  // OLD_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
};

// ============ LOCAL STORAGE HELPERS (Fallback) ============
const getStoredPatients = (): PatientProfile[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PATIENTS) || '[]'); } catch { return []; }
};

const getStoredDoctors = (): DoctorProfile[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCTORS) || '[]'); } catch { return []; }
};

const savePatients = (patients: PatientProfile[]) => {
  localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
};

const saveDoctors = (doctors: DoctorProfile[]) => {
  localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));
};

// ============ SUPABASE HELPERS ============
const formatPhoneBD = (phone: string): string => {
  // Remove any existing country code and format for Bangladesh
  const cleaned = phone.replace(/^\+880/, '').replace(/^0/, '');
  return `+880${cleaned}`;
};

const mapSupabaseToPatient = (profile: any, patient: any): PatientProfile => ({
  id: profile.id,
  phone: profile.phone?.replace('+880', '0') || '',
  email: profile.email,
  name: profile.name || '',
  nameBn: profile.name_bn || profile.name || '',
  role: 'PATIENT',
  createdAt: profile.created_at,
  updatedAt: profile.updated_at,
  isVerified: profile.is_verified,
  profileImage: profile.avatar_url,
  dateOfBirth: profile.date_of_birth,
  gender: profile.gender,
  bloodGroup: profile.blood_group,
  height: patient?.height_cm,
  weight: patient?.weight_kg,
  emergencyContact: patient?.emergency_contact_name ? {
    name: patient.emergency_contact_name,
    relation: patient.emergency_contact_relation || '',
    phone: patient.emergency_contact_phone || '',
  } : undefined,
  allergies: patient?.allergies || [],
  chronicConditions: patient?.chronic_conditions || [],
  currentMedications: patient?.current_medications || [],
  familyHistory: [],
  healthScore: 50,
  credits: 100,
  badges: ['নতুন সদস্য'],
  streak: 0,
  referralCode: generateReferralCode(),
  subscription: { tier: 'premium', features: ['All Features'] },
  isKidAccount: false,
});

const mapSupabaseToDoctor = (profile: any, doctor: any): DoctorProfile => ({
  id: profile.id,
  phone: profile.phone?.replace('+880', '0') || '',
  email: profile.email,
  name: profile.name || '',
  nameBn: profile.name_bn || profile.name || '',
  role: 'DOCTOR',
  createdAt: profile.created_at,
  updatedAt: profile.updated_at,
  isVerified: doctor?.is_verified || false,
  profileImage: profile.avatar_url,
  bmdcNumber: doctor?.bmdc_number || '',
  nidNumber: doctor?.nid_number,
  specializations: doctor?.specialties || [],
  qualifications: (doctor?.degrees || []).map((d: string) => ({ degree: d, institution: '', year: '' })),
  experienceYears: doctor?.experience_years || 0,
  consultationFee: doctor?.consultation_fee || 500,
  status: doctor?.is_verified ? 'approved' : 'pending',
  rating: doctor?.rating || 0,
  totalPatients: doctor?.total_patients || 0,
  totalConsultations: 0,
  credits: 50,
  badges: doctor?.is_verified ? ['যাচাইকৃত ডাক্তার'] : [],
  subscription: { tier: 'premium', features: ['All Features'] },
  chambers: (doctor?.chambers || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    schedule: [],
  })),
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PatientProfile | DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);

  // Migrate old data on first mount (runs once)
  useEffect(() => {
    migrateOldData();
  }, []);

  // Initialize auth state
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check if Supabase is configured
        if (isSupabaseConfigured) {
          console.log('[Auth] Supabase is configured, checking session...');
          setIsSupabaseReady(true);
          
          // Get current Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            console.log('[Auth] Supabase session found:', session.user.id);
            
            // Fetch profile from Supabase
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (profile) {
              if (profile.role === 'doctor') {
                const { data: doctor } = await supabase
                  .from('doctors')
                  .select('*, chambers(*)')
                  .eq('user_id', session.user.id)
                  .single();
                
                const doctorProfile = mapSupabaseToDoctor(profile, doctor);
                setUser(doctorProfile);
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(doctorProfile));
                localStorage.setItem(STORAGE_KEYS.ROLE, 'DOCTOR');
              } else {
                const { data: patient } = await supabase
                  .from('patients')
                  .select('*')
                  .eq('user_id', session.user.id)
                  .single();
                
                const patientProfile = mapSupabaseToPatient(profile, patient);
                setUser(patientProfile);
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(patientProfile));
                localStorage.setItem(STORAGE_KEYS.ROLE, 'PATIENT');
              }
            }
          } else {
            // No Supabase session, check localStorage
            const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
          }
        } else {
          // Supabase not configured, use localStorage only
          console.log('[Auth] Supabase not configured, using localStorage');
          const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
        console.error('[Auth] Error loading user:', error);
        // Fallback to localStorage
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();

    // Listen to Supabase auth changes
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[Auth] Auth state changed:', event);
        if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem(STORAGE_KEYS.USER);
          localStorage.removeItem(STORAGE_KEYS.ROLE);
        }
      });
      
      return () => subscription.unsubscribe();
    }
  }, []);

  // ============ SEND OTP ============
  const sendOTP = async (phone: string): Promise<{ success: boolean; otp?: string; error?: string }> => {
    try {
      // Generate OTP for test mode
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      if (isSupabaseConfigured) {
        // Try Supabase OTP
        const formattedPhone = formatPhoneBD(phone);
        console.log('[Auth] Sending OTP via Supabase to:', formattedPhone);
        
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
        
        if (error) {
          console.warn('[Auth] Supabase OTP failed, using test mode:', error.message);
          // Fall back to test mode
        } else {
          console.log('[Auth] Supabase OTP sent successfully');
        }
      }
      
      // Always store OTP for test mode (000000 bypass)
      localStorage.setItem(STORAGE_KEYS.OTP_STORE, JSON.stringify({
        phone, otp, expiresAt: Date.now() + 5 * 60 * 1000,
      }));
      
      console.log(`🔐 [Test Mode] OTP for ${phone}: ${otp}`);
      return { success: true, otp };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // ============ VERIFY OTP ============
  const verifyOTP = async (phone: string, otp: string): Promise<{ success: boolean; isNewUser: boolean; error?: string }> => {
    try {
      const BYPASS_CODE = '000000';
      
      // Check test mode OTP
      const storedOtpData = localStorage.getItem(STORAGE_KEYS.OTP_STORE);
      let testModeValid = false;
      
      if (storedOtpData) {
        const { otp: storedOtp } = JSON.parse(storedOtpData);
        testModeValid = otp === storedOtp || otp === BYPASS_CODE;
      } else if (otp === BYPASS_CODE) {
        testModeValid = true;
      }
      
      // Try Supabase verification first
      if (isSupabaseConfigured && otp !== BYPASS_CODE) {
        const formattedPhone = formatPhoneBD(phone);
        console.log('[Auth] Verifying OTP via Supabase for:', formattedPhone);
        
        const { data, error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: 'sms',
        });
        
        if (!error && data.user) {
          console.log('[Auth] Supabase OTP verified, user:', data.user.id);
          localStorage.removeItem(STORAGE_KEYS.OTP_STORE);
          
          // Check if profile exists
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (profile && profile.name) {
            // Existing user
            if (profile.role === 'doctor') {
              const { data: doctor } = await supabase
                .from('doctors')
                .select('*, chambers(*)')
                .eq('user_id', data.user.id)
                .single();
              
              const doctorProfile = mapSupabaseToDoctor(profile, doctor);
              setUser(doctorProfile);
              localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(doctorProfile));
              localStorage.setItem(STORAGE_KEYS.ROLE, 'DOCTOR');
            } else {
              const { data: patient } = await supabase
                .from('patients')
                .select('*')
                .eq('user_id', data.user.id)
                .single();
              
              const patientProfile = mapSupabaseToPatient(profile, patient);
              setUser(patientProfile);
              localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(patientProfile));
              localStorage.setItem(STORAGE_KEYS.ROLE, 'PATIENT');
            }
            return { success: true, isNewUser: false };
          }
          
          return { success: true, isNewUser: true };
        }
      }
      
      // Test mode verification
      if (!testModeValid) {
        return { success: false, isNewUser: false, error: 'Invalid OTP' };
      }
      
      localStorage.removeItem(STORAGE_KEYS.OTP_STORE);
      
      // Check local storage for existing user
      const patients = getStoredPatients();
      const doctors = getStoredDoctors();
      
      const existingPatient = patients.find(p => p.phone === phone);
      if (existingPatient) {
        setUser(existingPatient);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(existingPatient));
        localStorage.setItem(STORAGE_KEYS.ROLE, 'PATIENT');
        return { success: true, isNewUser: false };
      }
      
      const existingDoctor = doctors.find(d => d.phone === phone);
      if (existingDoctor) {
        setUser(existingDoctor);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(existingDoctor));
        localStorage.setItem(STORAGE_KEYS.ROLE, 'DOCTOR');
        return { success: true, isNewUser: false };
      }
      
      return { success: true, isNewUser: true };
    } catch (error: any) {
      return { success: false, isNewUser: false, error: error.message };
    }
  };

  // ============ REGISTER PATIENT ============
  const registerPatient = async (data: Partial<PatientProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const now = new Date().toISOString();
      const dob = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
      const age = dob ? new Date().getFullYear() - dob.getFullYear() : 0;
      
      // Try Supabase first
      if (isSupabaseConfigured) {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        
        if (supabaseUser) {
          console.log('[Auth] Registering patient in Supabase:', supabaseUser.id);
          
          // Update profile
          await supabase.from('profiles').upsert({
            id: supabaseUser.id,
            phone: formatPhoneBD(data.phone || ''),
            name: data.name,
            name_bn: data.nameBn || data.name,
            email: data.email,
            role: 'patient',
            date_of_birth: data.dateOfBirth,
            gender: data.gender,
            blood_group: data.bloodGroup,
            is_verified: true,
            avatar_url: data.profileImage,
            updated_at: now,
          });
          
          // Create patient record
          await supabase.from('patients').upsert({
            user_id: supabaseUser.id,
            height_cm: data.height,
            weight_kg: data.weight,
            emergency_contact_name: data.emergencyContact?.name,
            emergency_contact_phone: data.emergencyContact?.phone,
            emergency_contact_relation: data.emergencyContact?.relation,
            allergies: data.allergies || [],
            chronic_conditions: data.chronicConditions || [],
            current_medications: data.currentMedications || [],
            updated_at: now,
          });
          
          // Fetch complete profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();
          
          const { data: patient } = await supabase
            .from('patients')
            .select('*')
            .eq('user_id', supabaseUser.id)
            .single();
          
          const patientProfile = mapSupabaseToPatient(profile, patient);
          setUser(patientProfile);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(patientProfile));
          localStorage.setItem(STORAGE_KEYS.ROLE, 'PATIENT');
          
          return { success: true };
        }
      }
      
      // Fallback to localStorage
      const newPatient: PatientProfile = {
        id: `P-${generateId()}`,
        phone: data.phone || '',
        name: data.name || '',
        nameBn: data.nameBn || data.name || '',
        role: 'PATIENT',
        createdAt: now,
        updatedAt: now,
        isVerified: true,
        profileImage: data.profileImage,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        height: data.height,
        weight: data.weight,
        emergencyContact: data.emergencyContact,
        allergies: data.allergies || [],
        chronicConditions: data.chronicConditions || [],
        currentMedications: data.currentMedications || [],
        familyHistory: data.familyHistory || [],
        healthScore: 50,
        credits: 100,
        badges: ['নতুন সদস্য'],
        streak: 0,
        referralCode: generateReferralCode(),
        subscription: { tier: 'premium', features: ['All Features'] },
        isKidAccount: age > 0 && age < 12,
        parentId: age > 0 && age < 12 ? data.parentId : undefined,
      };
      
      const patients = getStoredPatients();
      patients.push(newPatient);
      savePatients(patients);
      
      setUser(newPatient);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newPatient));
      localStorage.setItem(STORAGE_KEYS.ROLE, 'PATIENT');
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // ============ REGISTER DOCTOR ============
  const registerDoctor = async (data: Partial<DoctorProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const now = new Date().toISOString();
      
      // Try Supabase first
      if (isSupabaseConfigured) {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        
        if (supabaseUser) {
          console.log('[Auth] Registering doctor in Supabase:', supabaseUser.id);
          
          // Update profile
          await supabase.from('profiles').upsert({
            id: supabaseUser.id,
            phone: formatPhoneBD(data.phone || ''),
            name: data.name,
            name_bn: data.nameBn || data.name,
            email: data.email,
            role: 'doctor',
            is_verified: false,
            avatar_url: data.profileImage,
            updated_at: now,
          });
          
          // Create doctor record
          await supabase.from('doctors').insert({
            user_id: supabaseUser.id,
            bmdc_number: data.bmdcNumber,
            nid_number: data.nidNumber,
            degrees: data.qualifications?.map(q => q.degree) || [],
            specialties: data.specializations || [],
            experience_years: data.experienceYears || 0,
            consultation_fee: data.consultationFee || 500,
            is_verified: false,
          });
          
          // Fetch complete profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();
          
          const { data: doctor } = await supabase
            .from('doctors')
            .select('*, chambers(*)')
            .eq('user_id', supabaseUser.id)
            .single();
          
          const doctorProfile = mapSupabaseToDoctor(profile, doctor);
          setUser(doctorProfile);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(doctorProfile));
          localStorage.setItem(STORAGE_KEYS.ROLE, 'DOCTOR');
          
          return { success: true };
        }
      }
      
      // Fallback to localStorage
      const newDoctor: DoctorProfile = {
        id: `D-${generateId()}`,
        phone: data.phone || '',
        email: data.email,
        name: data.name || '',
        nameBn: data.nameBn || data.name || '',
        role: 'DOCTOR',
        createdAt: now,
        updatedAt: now,
        isVerified: false,
        profileImage: data.profileImage,
        bmdcNumber: data.bmdcNumber || '',
        nidNumber: data.nidNumber,
        specializations: data.specializations || [],
        qualifications: data.qualifications || [],
        experienceYears: data.experienceYears || 0,
        consultationFee: data.consultationFee || 500,
        status: 'pending',
        rating: 0,
        totalPatients: 0,
        totalConsultations: 0,
        credits: 50,
        badges: [],
        subscription: { tier: 'premium', features: ['All Features'] },
        chambers: data.chambers || [],
      };
      
      const doctors = getStoredDoctors();
      doctors.push(newDoctor);
      saveDoctors(doctors);
      
      setUser(newDoctor);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newDoctor));
      localStorage.setItem(STORAGE_KEYS.ROLE, 'DOCTOR');
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // ============ LOGIN ============
  const login = async (phone: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      if (role === 'PATIENT') {
        const patient = getStoredPatients().find(p => p.phone === phone);
        if (patient) {
          setUser(patient);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(patient));
          localStorage.setItem(STORAGE_KEYS.ROLE, 'PATIENT');
          return { success: true };
        }
      } else if (role === 'DOCTOR') {
        const doctor = getStoredDoctors().find(d => d.phone === phone);
        if (doctor) {
          setUser(doctor);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(doctor));
          localStorage.setItem(STORAGE_KEYS.ROLE, 'DOCTOR');
          return { success: true };
        }
      }
      return { success: false, error: 'User not found' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // ============ LOGOUT ============
  const logout = async (): Promise<void> => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
  };

  // ============ UPDATE PROFILE ============
  const updateProfile = async (data: Partial<PatientProfile | DoctorProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'Not authenticated' };
      
      const now = new Date().toISOString();
      
      // Try Supabase first
      if (isSupabaseConfigured) {
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        
        if (supabaseUser) {
          // Update profile in Supabase
          await supabase.from('profiles').update({
            name: data.name,
            name_bn: (data as any).nameBn,
            email: data.email,
            avatar_url: data.profileImage,
            updated_at: now,
          }).eq('id', supabaseUser.id);
          
          if (user.role === 'PATIENT') {
            await supabase.from('patients').update({
              height_cm: (data as PatientProfile).height,
              weight_kg: (data as PatientProfile).weight,
              allergies: (data as PatientProfile).allergies,
              chronic_conditions: (data as PatientProfile).chronicConditions,
              current_medications: (data as PatientProfile).currentMedications,
              updated_at: now,
            }).eq('user_id', supabaseUser.id);
          }
        }
      }
      
      // Update local state
      const updatedUser = { ...user, ...data, updatedAt: now };
      
      if (user.role === 'PATIENT') {
        const patients = getStoredPatients();
        const index = patients.findIndex(p => p.id === user.id);
        if (index !== -1) {
          patients[index] = updatedUser as PatientProfile;
          savePatients(patients);
        }
      } else if (user.role === 'DOCTOR') {
        const doctors = getStoredDoctors();
        const index = doctors.findIndex(d => d.id === user.id);
        if (index !== -1) {
          doctors[index] = updatedUser as DoctorProfile;
          saveDoctors(doctors);
        }
      }
      
      setUser(updatedUser as PatientProfile | DoctorProfile);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // ============ ADMIN: APPROVE DOCTOR ============
  const approveDoctor = async (doctorId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const now = new Date().toISOString();
      
      // Try Supabase first
      if (isSupabaseConfigured) {
        await supabase.from('doctors').update({
          is_verified: true,
          updated_at: now,
        }).eq('id', doctorId);
      }
      
      // Update local storage
      const doctors = getStoredDoctors();
      const index = doctors.findIndex(d => d.id === doctorId);
      if (index === -1) return { success: false, error: 'Doctor not found' };
      
      doctors[index] = {
        ...doctors[index],
        status: 'approved',
        isVerified: true,
        approvedAt: now,
        credits: doctors[index].credits + 100,
        badges: [...doctors[index].badges, 'যাচাইকৃত ডাক্তার'],
      };
      
      saveDoctors(doctors);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // ============ ADMIN: REJECT DOCTOR ============
  const rejectDoctor = async (doctorId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Update local storage
      const doctors = getStoredDoctors();
      const index = doctors.findIndex(d => d.id === doctorId);
      if (index === -1) return { success: false, error: 'Doctor not found' };
      
      doctors[index] = {
        ...doctors[index],
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date().toISOString(),
      };
      
      saveDoctors(doctors);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  // ============ ADMIN: GET PENDING DOCTORS ============
  const getAllPendingDoctors = async (): Promise<DoctorProfile[]> => {
    if (isSupabaseConfigured) {
      try {
        const { data: doctors } = await supabase
          .from('doctors')
          .select('*, profiles(*)')
          .eq('is_verified', false);
        
        if (doctors && doctors.length > 0) {
          return doctors.map((d: any) => mapSupabaseToDoctor(d.profiles, d));
        }
      } catch (error) {
        console.error('[Auth] Error fetching pending doctors:', error);
      }
    }
    
    return getStoredDoctors().filter(d => d.status === 'pending');
  };

  // ============ ADMIN: GET ALL USERS ============
  const getAllUsers = async (): Promise<(PatientProfile | DoctorProfile)[]> => {
    if (isSupabaseConfigured) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profiles && profiles.length > 0) {
          const users: (PatientProfile | DoctorProfile)[] = [];
          
          for (const profile of profiles) {
            if (profile.role === 'doctor') {
              const { data: doctor } = await supabase
                .from('doctors')
                .select('*, chambers(*)')
                .eq('user_id', profile.id)
                .single();
              users.push(mapSupabaseToDoctor(profile, doctor));
            } else {
              const { data: patient } = await supabase
                .from('patients')
                .select('*')
                .eq('user_id', profile.id)
                .single();
              users.push(mapSupabaseToPatient(profile, patient));
            }
          }
          
          return users;
        }
      } catch (error) {
        console.error('[Auth] Error fetching all users:', error);
      }
    }
    
    return [...getStoredPatients(), ...getStoredDoctors()];
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    role: user?.role || 'GUEST',
    isSupabaseReady,
    sendOTP,
    verifyOTP,
    registerPatient,
    registerDoctor,
    login,
    logout,
    updateProfile,
    approveDoctor,
    rejectDoctor,
    getAllPendingDoctors,
    getAllUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
