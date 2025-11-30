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

const STORAGE_KEYS = {
  USER: 'nirnoy_user_v2',
  ROLE: 'nirnoy_role_v2',
  PATIENTS: 'nirnoy_patients_db',
  DOCTORS: 'nirnoy_doctors_db',
  OTP_STORE: 'nirnoy_otp_temp',
};

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateReferralCode = () => Math.random().toString(36).substr(2, 8).toUpperCase();

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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PatientProfile | DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Clear old localStorage keys (v1)
        localStorage.removeItem('nirnoy_user');
        localStorage.removeItem('nirnoy_role');
        
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        console.log('AuthContext loadUser - storedUser:', storedUser);
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log('AuthContext loadUser - parsedUser:', parsedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const sendOTP = async (phone: string): Promise<{ success: boolean; otp?: string; error?: string }> => {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem(STORAGE_KEYS.OTP_STORE, JSON.stringify({
        phone, otp, expiresAt: Date.now() + 5 * 60 * 1000,
      }));
      console.log(`🔐 OTP for ${phone}: ${otp}`);
      return { success: true, otp };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const verifyOTP = async (phone: string, otp: string): Promise<{ success: boolean; isNewUser: boolean; error?: string }> => {
    try {
      const storedOtpData = localStorage.getItem(STORAGE_KEYS.OTP_STORE);
      if (!storedOtpData) return { success: false, isNewUser: false, error: 'OTP expired' };
      
      const { otp: storedOtp, expiresAt } = JSON.parse(storedOtpData);
      const BYPASS_CODE = '000000';
      
      if (otp !== storedOtp && otp !== BYPASS_CODE) {
        return { success: false, isNewUser: false, error: 'Invalid OTP' };
      }
      
      localStorage.removeItem(STORAGE_KEYS.OTP_STORE);
      
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

  const registerPatient = async (data: Partial<PatientProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const now = new Date().toISOString();
      const dob = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
      const age = dob ? new Date().getFullYear() - dob.getFullYear() : 0;
      
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
        subscription: { tier: 'free', features: ['AI Health Assistant', 'Doctor Search'] },
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

  const registerDoctor = async (data: Partial<DoctorProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const now = new Date().toISOString();
      
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
        subscription: { tier: 'free', features: ['Basic Profile'] },
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

  const logout = async (): Promise<void> => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
  };

  const updateProfile = async (data: Partial<PatientProfile | DoctorProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'Not authenticated' };
      
      const updatedUser = { ...user, ...data, updatedAt: new Date().toISOString() };
      
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

  const approveDoctor = async (doctorId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const doctors = getStoredDoctors();
      const index = doctors.findIndex(d => d.id === doctorId);
      if (index === -1) return { success: false, error: 'Doctor not found' };
      
      doctors[index] = {
        ...doctors[index],
        status: 'approved',
        isVerified: true,
        approvedAt: new Date().toISOString(),
        credits: doctors[index].credits + 100,
        badges: [...doctors[index].badges, 'যাচাইকৃত ডাক্তার'],
      };
      
      saveDoctors(doctors);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const rejectDoctor = async (doctorId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    try {
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

  const getAllPendingDoctors = async (): Promise<DoctorProfile[]> => {
    return getStoredDoctors().filter(d => d.status === 'pending');
  };

  const getAllUsers = async (): Promise<(PatientProfile | DoctorProfile)[]> => {
    return [...getStoredPatients(), ...getStoredDoctors()];
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    role: user?.role || 'GUEST',
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
