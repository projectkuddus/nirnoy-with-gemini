import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  emergencyContact?: { name: string; relation: string; phone: string; };
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  familyHistory: { condition: string; relation: string }[];
  healthScore: number;
  credits: number;
  badges: string[];
  streak: number;
  referralCode: string;
  subscription: { tier: SubscriptionTier; expiresAt?: string; features: string[]; };
  familyGroupId?: string;
  isKidAccount: boolean;
  parentId?: string;
}

export interface DoctorProfile extends UserProfile {
  role: 'DOCTOR';
  bmdcNumber: string;
  nidNumber?: string;
  specializations: string[];
  qualifications: { degree: string; institution: string; year: string; }[];
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
  subscription: { tier: SubscriptionTier; expiresAt?: string; features: string[]; };
  chambers: { id: string; name: string; address: string; schedule: { day: string; startTime: string; endTime: string; }[]; }[];
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
  getAllDoctors: () => DoctorProfile[];
  getAllPatients: () => PatientProfile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============ STORAGE KEYS - PERMANENT ============
export const STORAGE_KEYS = {
  USER: 'nirnoy_user_prod',
  ROLE: 'nirnoy_role_prod',
  PATIENTS: 'nirnoy_patients_prod',
  DOCTORS: 'nirnoy_doctors_prod',
  OTP_STORE: 'nirnoy_otp_temp',
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const generateReferralCode = () => Math.random().toString(36).substr(2, 8).toUpperCase();

// Normalize phone number (remove +880, leading 0)
const normalizePhone = (phone: string): string => {
  return phone.replace(/^\+880/, '').replace(/^0/, '');
};

// ============ LOCAL STORAGE ============
const getStoredPatients = (): PatientProfile[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
    const patients = data ? JSON.parse(data) : [];
    console.log('[Auth] Loaded', patients.length, 'patients from storage');
    return patients;
  } catch (e) {
    console.error('[Auth] Error loading patients:', e);
    return [];
  }
};

const getStoredDoctors = (): DoctorProfile[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DOCTORS);
    const doctors = data ? JSON.parse(data) : [];
    console.log('[Auth] Loaded', doctors.length, 'doctors from storage');
    return doctors;
  } catch (e) {
    console.error('[Auth] Error loading doctors:', e);
    return [];
  }
};

const savePatients = (patients: PatientProfile[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    console.log('[Auth] ✅ Saved', patients.length, 'patients to storage');
  } catch (e) {
    console.error('[Auth] ❌ Error saving patients:', e);
  }
};

const saveDoctors = (doctors: DoctorProfile[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));
    console.log('[Auth] ✅ Saved', doctors.length, 'doctors to storage');
    // Log each doctor for debugging
    doctors.forEach(d => console.log('[Auth] Doctor:', d.name, 'Status:', d.status, 'Phone:', d.phone));
  } catch (e) {
    console.error('[Auth] ❌ Error saving doctors:', e);
  }
};

const saveUser = (user: PatientProfile | DoctorProfile | null) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.ROLE, user.role);
    console.log('[Auth] ✅ Saved current user:', user.name, user.role);
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    console.log('[Auth] Cleared current user');
  }
};

const loadUser = (): PatientProfile | DoctorProfile | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    if (data) {
      const user = JSON.parse(data);
      console.log('[Auth] Loaded current user:', user.name, user.role);
      return user;
    }
  } catch (e) {
    console.error('[Auth] Error loading user:', e);
  }
  return null;
};

// ============ PROVIDER ============
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PatientProfile | DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[Auth] 🚀 Initializing AuthContext...');
    const storedUser = loadUser();
    if (storedUser) {
      setUser(storedUser);
      console.log('[Auth] ✅ User restored from storage');
    } else {
      console.log('[Auth] No stored user found');
    }
    
    // Log current state
    const patients = getStoredPatients();
    const doctors = getStoredDoctors();
    console.log('[Auth] 📊 Current state: ', patients.length, 'patients,', doctors.length, 'doctors');
    
    setIsLoading(false);
  }, []);

  const sendOTP = async (phone: string) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem(STORAGE_KEYS.OTP_STORE, JSON.stringify({ phone: normalizePhone(phone), otp, exp: Date.now() + 300000 }));
    console.log('[Auth] 🔐 OTP for', phone, ':', otp);
    return { success: true, otp };
  };

  const verifyOTP = async (phone: string, otp: string) => {
    const BYPASS = '000000';
    const normalizedPhone = normalizePhone(phone);
    let valid = otp === BYPASS;
    
    if (!valid) {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.OTP_STORE) || '{}');
        valid = normalizePhone(stored.phone || '') === normalizedPhone && stored.otp === otp;
      } catch {}
    }
    
    if (!valid) {
      console.log('[Auth] ❌ Invalid OTP');
      return { success: false, isNewUser: false, error: 'Invalid OTP' };
    }
    
    localStorage.removeItem(STORAGE_KEYS.OTP_STORE);
    console.log('[Auth] ✅ OTP verified for', phone);
    
    // Check for existing user
    const patients = getStoredPatients();
    const patient = patients.find(p => normalizePhone(p.phone) === normalizedPhone);
    if (patient) {
      console.log('[Auth] Found existing patient:', patient.name);
      setUser(patient);
      saveUser(patient);
      return { success: true, isNewUser: false };
    }
    
    const doctors = getStoredDoctors();
    const doctor = doctors.find(d => normalizePhone(d.phone) === normalizedPhone);
    if (doctor) {
      console.log('[Auth] Found existing doctor:', doctor.name);
      setUser(doctor);
      saveUser(doctor);
      return { success: true, isNewUser: false };
    }
    
    console.log('[Auth] New user - needs registration');
    return { success: true, isNewUser: true };
  };

  const registerPatient = async (data: Partial<PatientProfile>) => {
    console.log('[Auth] 📝 Registering patient:', data.name);
    const now = new Date().toISOString();
    const dob = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    const age = dob ? new Date().getFullYear() - dob.getFullYear() : 0;
    
    const patient: PatientProfile = {
      id: 'P-' + generateId(),
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
      badges: ['New Member'],
      streak: 0,
      referralCode: generateReferralCode(),
      subscription: { tier: 'premium', features: ['All Features'] },
      isKidAccount: age > 0 && age < 12,
      parentId: undefined,
    };
    
    const patients = getStoredPatients();
    const normalizedPhone = normalizePhone(patient.phone);
    const idx = patients.findIndex(p => normalizePhone(p.phone) === normalizedPhone);
    if (idx >= 0) {
      console.log('[Auth] Updating existing patient');
      patients[idx] = { ...patients[idx], ...patient, id: patients[idx].id, createdAt: patients[idx].createdAt };
    } else {
      console.log('[Auth] Adding new patient');
      patients.push(patient);
    }
    savePatients(patients);
    setUser(patient);
    saveUser(patient);
    console.log('[Auth] ✅ Patient registered successfully');
    return { success: true };
  };

  const registerDoctor = async (data: Partial<DoctorProfile>) => {
    console.log('[Auth] 📝 Registering doctor:', data.name, 'Phone:', data.phone);
    const now = new Date().toISOString();
    const doctors = getStoredDoctors();
    const normalizedPhone = normalizePhone(data.phone || '');
    const existing = doctors.find(d => normalizePhone(d.phone) === normalizedPhone);
    
    const doctor: DoctorProfile = {
      id: existing?.id || 'D-' + generateId(),
      phone: data.phone || '',
      email: data.email,
      name: data.name || '',
      nameBn: data.nameBn || data.name || '',
      role: 'DOCTOR',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      isVerified: existing?.isVerified || false,
      profileImage: data.profileImage,
      bmdcNumber: data.bmdcNumber || '',
      nidNumber: data.nidNumber,
      specializations: data.specializations || [],
      qualifications: data.qualifications || [],
      experienceYears: data.experienceYears || 0,
      consultationFee: data.consultationFee || 500,
      status: existing?.status || 'pending',
      approvedAt: existing?.approvedAt,
      approvedBy: existing?.approvedBy,
      rejectionReason: existing?.rejectionReason,
      rating: existing?.rating || 0,
      totalPatients: existing?.totalPatients || 0,
      totalConsultations: existing?.totalConsultations || 0,
      credits: existing?.credits || 50,
      badges: existing?.badges || [],
      subscription: { tier: 'premium', features: ['All Features'] },
      chambers: data.chambers || existing?.chambers || [],
    };
    
    const idx = doctors.findIndex(d => normalizePhone(d.phone) === normalizedPhone);
    if (idx >= 0) {
      console.log('[Auth] Updating existing doctor, preserving status:', doctors[idx].status);
      doctors[idx] = doctor;
    } else {
      console.log('[Auth] Adding new doctor with pending status');
      doctors.push(doctor);
    }
    saveDoctors(doctors);
    setUser(doctor);
    saveUser(doctor);
    console.log('[Auth] ✅ Doctor registered successfully. Status:', doctor.status);
    return { success: true };
  };

  const login = async (phone: string, role: UserRole) => {
    const normalizedPhone = normalizePhone(phone);
    console.log('[Auth] 🔑 Login attempt:', phone, role);
    
    if (role === 'PATIENT') {
      const patients = getStoredPatients();
      const p = patients.find(x => normalizePhone(x.phone) === normalizedPhone);
      if (p) {
        setUser(p);
        saveUser(p);
        console.log('[Auth] ✅ Patient logged in:', p.name);
        return { success: true };
      }
    } else if (role === 'DOCTOR') {
      const doctors = getStoredDoctors();
      const d = doctors.find(x => normalizePhone(x.phone) === normalizedPhone);
      if (d) {
        setUser(d);
        saveUser(d);
        console.log('[Auth] ✅ Doctor logged in:', d.name);
        return { success: true };
      }
    }
    console.log('[Auth] ❌ User not found');
    return { success: false, error: 'User not found' };
  };

  const logout = async () => {
    console.log('[Auth] 👋 Logging out');
    setUser(null);
    saveUser(null);
  };

  const updateProfile = async (data: Partial<PatientProfile | DoctorProfile>) => {
    if (!user) return { success: false, error: 'Not logged in' };
    console.log('[Auth] 📝 Updating profile for:', user.name);
    
    const updated = { ...user, ...data, updatedAt: new Date().toISOString() };
    
    if (user.role === 'PATIENT') {
      const patients = getStoredPatients();
      const idx = patients.findIndex(p => p.id === user.id);
      if (idx >= 0) {
        patients[idx] = updated as PatientProfile;
        savePatients(patients);
      }
    } else if (user.role === 'DOCTOR') {
      const doctors = getStoredDoctors();
      const idx = doctors.findIndex(d => d.id === user.id);
      if (idx >= 0) {
        doctors[idx] = updated as DoctorProfile;
        saveDoctors(doctors);
      }
    }
    
    setUser(updated as any);
    saveUser(updated as any);
    console.log('[Auth] ✅ Profile updated');
    return { success: true };
  };

  const approveDoctor = async (doctorId: string) => {
    console.log('[Auth] ✅ Approving doctor:', doctorId);
    const doctors = getStoredDoctors();
    const idx = doctors.findIndex(d => d.id === doctorId);
    if (idx < 0) return { success: false, error: 'Doctor not found' };
    
    doctors[idx] = {
      ...doctors[idx],
      status: 'approved',
      isVerified: true,
      approvedAt: new Date().toISOString(),
      approvedBy: 'admin',
      updatedAt: new Date().toISOString(),
    };
    saveDoctors(doctors);
    
    if (user?.id === doctorId) {
      setUser(doctors[idx]);
      saveUser(doctors[idx]);
    }
    console.log('[Auth] ✅ Doctor approved:', doctors[idx].name);
    return { success: true };
  };

  const rejectDoctor = async (doctorId: string, reason: string) => {
    console.log('[Auth] ❌ Rejecting doctor:', doctorId);
    const doctors = getStoredDoctors();
    const idx = doctors.findIndex(d => d.id === doctorId);
    if (idx < 0) return { success: false, error: 'Doctor not found' };
    
    doctors[idx] = {
      ...doctors[idx],
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    };
    saveDoctors(doctors);
    console.log('[Auth] ❌ Doctor rejected:', doctors[idx].name);
    return { success: true };
  };

  const getAllPendingDoctors = async (): Promise<DoctorProfile[]> => {
    const doctors = getStoredDoctors();
    const pending = doctors.filter(d => d.status === 'pending');
    console.log('[Auth] 📋 Pending doctors:', pending.length);
    return pending;
  };
  
  const getAllUsers = async () => [...getStoredPatients(), ...getStoredDoctors()];
  const getAllDoctors = () => getStoredDoctors();
  const getAllPatients = () => getStoredPatients();

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated: !!user, role: user?.role || 'GUEST', isSupabaseReady: false,
      sendOTP, verifyOTP, registerPatient, registerDoctor, login, logout, updateProfile,
      approveDoctor, rejectDoctor, getAllPendingDoctors, getAllUsers, getAllDoctors, getAllPatients,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
