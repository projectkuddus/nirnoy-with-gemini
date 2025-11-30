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

// Comprehensive Health Record
export interface HealthRecord {
  // Vaccinations
  vaccinations: {
    name: string;
    date?: string;
    nextDue?: string;
  }[];
  
  // Surgery History
  surgeries: {
    name: string;
    date: string;
    hospital?: string;
    notes?: string;
  }[];
  
  // Past Illnesses
  pastIllnesses: {
    name: string;
    year: string;
    recovered: boolean;
  }[];
  
  // Vital Records (historical)
  vitalHistory: {
    date: string;
    bloodPressure?: string;
    heartRate?: number;
    weight?: number;
    bloodSugar?: number;
    temperature?: number;
  }[];
  
  // Lab Reports
  labReports: {
    id: string;
    date: string;
    type: string;
    results: string;
    doctorNotes?: string;
  }[];
  
  // Consultation History
  consultations: {
    id: string;
    date: string;
    doctorId: string;
    doctorName: string;
    specialty: string;
    diagnosis: string;
    prescription: string[];
    notes?: string;
  }[];
  
  // AI-detected health insights
  aiInsights: {
    date: string;
    insight: string;
    category: string;
    severity: 'info' | 'warning' | 'critical';
    acknowledged: boolean;
  }[];
}

export interface PatientProfile extends UserProfile {
  role: 'PATIENT';
  
  // Basic Info
  dateOfBirth?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  
  // Physical
  height?: number; // in cm
  weight?: number; // in kg
  
  // Medical Info
  chronicConditions: string[];
  allergies: string[];
  currentMedications: {
    name: string;
    dosage: string;
    frequency: string;
    startDate?: string;
  }[];
  
  // Family History
  familyHistory: {
    condition: string;
    relation: string;
  }[];
  
  // Emergency
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  
  // Health Records
  healthRecords: HealthRecord;
  
  // Gamification
  healthScore: number;
  credits: number;
  badges: string[];
  streak: number;
  referralCode: string;
  
  // Subscription
  subscription: {
    tier: SubscriptionTier;
    expiresAt?: string;
    features: string[];
  };
  
  // Family
  familyGroupId?: string;
  familyMembers?: {
    id: string;
    name: string;
    relation: string;
    phone: string;
  }[];
  isKidAccount: boolean;
  parentId?: string;
  
  // Profile completeness
  profileCompleteness: number; // 0-100
  missingFields: string[];
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
  updateHealthRecord: (data: Partial<HealthRecord>) => Promise<{ success: boolean; error?: string }>;
  addAIInsight: (insight: { insight: string; category: string; severity: 'info' | 'warning' | 'critical' }) => Promise<void>;
  approveDoctor: (doctorId: string) => Promise<{ success: boolean; error?: string }>;
  rejectDoctor: (doctorId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  getAllPendingDoctors: () => Promise<DoctorProfile[]>;
  getAllUsers: () => Promise<(PatientProfile | DoctorProfile)[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'nirnoy_user_v3',
  ROLE: 'nirnoy_role_v3',
  PATIENTS: 'nirnoy_patients_db_v3',
  DOCTORS: 'nirnoy_doctors_db_v3',
  OTP_STORE: 'nirnoy_otp_temp',
};

// Universal test OTP - works for all logins
const UNIVERSAL_TEST_OTP = '000000';

const generateId = () => Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
const generateReferralCode = () => Math.random().toString(36).substr(2, 8).toUpperCase();

// Calculate profile completeness
const calculateProfileCompleteness = (profile: Partial<PatientProfile>): { completeness: number; missingFields: string[] } => {
  const requiredFields = [
    { key: 'name', label: 'নাম' },
    { key: 'dateOfBirth', label: 'জন্ম তারিখ' },
    { key: 'gender', label: 'লিঙ্গ' },
    { key: 'bloodGroup', label: 'রক্তের গ্রুপ' },
    { key: 'height', label: 'উচ্চতা' },
    { key: 'weight', label: 'ওজন' },
    { key: 'emergencyContact', label: 'জরুরি যোগাযোগ' },
  ];
  
  const missingFields: string[] = [];
  let filled = 0;
  
  for (const field of requiredFields) {
    const value = (profile as any)[field.key];
    if (value && (typeof value !== 'object' || Object.keys(value).length > 0)) {
      filled++;
    } else {
      missingFields.push(field.label);
    }
  }
  
  return {
    completeness: Math.round((filled / requiredFields.length) * 100),
    missingFields
  };
};

// Get patients from localStorage
const getStoredPatients = (): PatientProfile[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PATIENTS) || '[]'); } catch { return []; }
};

// Get doctors from localStorage
const getStoredDoctors = (): DoctorProfile[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCTORS) || '[]'); } catch { return []; }
};

// Save patients to localStorage
const savePatients = (patients: PatientProfile[]) => {
  localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
};

// Save doctors to localStorage
const saveDoctors = (doctors: DoctorProfile[]) => {
  localStorage.setItem(STORAGE_KEYS.DOCTORS, JSON.stringify(doctors));
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PatientProfile | DoctorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        // Clear ALL old localStorage keys
        localStorage.removeItem('nirnoy_user');
        localStorage.removeItem('nirnoy_role');
        localStorage.removeItem('nirnoy_user_v2');
        localStorage.removeItem('nirnoy_role_v2');
        localStorage.removeItem('nirnoy_patients_db');
        localStorage.removeItem('nirnoy_doctors_db');
        
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        console.log('AuthContext loadUser - storedUser:', storedUser ? 'found' : 'null');
        
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
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
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP temporarily
      localStorage.setItem(STORAGE_KEYS.OTP_STORE, JSON.stringify({
        phone,
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      }));
      
      console.log('OTP for', phone, ':', otp);
      
      // Return OTP for test mode display
      return { success: true, otp };
    } catch (error) {
      return { success: false, error: 'OTP পাঠাতে সমস্যা হয়েছে' };
    }
  };

  const verifyOTP = async (phone: string, otp: string): Promise<{ success: boolean; isNewUser: boolean; error?: string }> => {
    try {
      // Universal test OTP always works
      if (otp === UNIVERSAL_TEST_OTP) {
        // Check if user exists
        const patients = getStoredPatients();
        const doctors = getStoredDoctors();
        const existingPatient = patients.find(p => p.phone === phone);
        const existingDoctor = doctors.find(d => d.phone === phone);
        
        if (existingPatient) {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(existingPatient));
          localStorage.setItem(STORAGE_KEYS.ROLE, 'PATIENT');
          setUser(existingPatient);
          return { success: true, isNewUser: false };
        }
        
        if (existingDoctor) {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(existingDoctor));
          localStorage.setItem(STORAGE_KEYS.ROLE, 'DOCTOR');
          setUser(existingDoctor);
          return { success: true, isNewUser: false };
        }
        
        return { success: true, isNewUser: true };
      }
      
      // Check stored OTP
      const storedOtpData = localStorage.getItem(STORAGE_KEYS.OTP_STORE);
      if (!storedOtpData) {
        return { success: false, error: 'OTP এর মেয়াদ শেষ' };
      }
      
      const { phone: storedPhone, otp: storedOtp, expiresAt } = JSON.parse(storedOtpData);
      
      if (Date.now() > expiresAt) {
        localStorage.removeItem(STORAGE_KEYS.OTP_STORE);
        return { success: false, error: 'OTP এর মেয়াদ শেষ' };
      }
      
      if (phone !== storedPhone || otp !== storedOtp) {
        return { success: false, error: 'ভুল OTP' };
      }
      
      localStorage.removeItem(STORAGE_KEYS.OTP_STORE);
      
      // Check if user exists
      const patients = getStoredPatients();
      const doctors = getStoredDoctors();
      const existingPatient = patients.find(p => p.phone === phone);
      const existingDoctor = doctors.find(d => d.phone === phone);
      
      if (existingPatient) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(existingPatient));
        localStorage.setItem(STORAGE_KEYS.ROLE, 'PATIENT');
        setUser(existingPatient);
        return { success: true, isNewUser: false };
      }
      
      if (existingDoctor) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(existingDoctor));
        localStorage.setItem(STORAGE_KEYS.ROLE, 'DOCTOR');
        setUser(existingDoctor);
        return { success: true, isNewUser: false };
      }
      
      return { success: true, isNewUser: true };
    } catch (error) {
      return { success: false, error: 'যাচাই করতে সমস্যা হয়েছে' };
    }
  };

  const registerPatient = async (data: Partial<PatientProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const { completeness, missingFields } = calculateProfileCompleteness(data);
      
      const newPatient: PatientProfile = {
        id: generateId(),
        phone: data.phone || '',
        name: data.name || '',
        nameBn: data.nameBn || data.name || '',
        role: 'PATIENT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isVerified: true,
        profileImage: data.profileImage,
        dateOfBirth: data.dateOfBirth,
        age: data.dateOfBirth ? new Date().getFullYear() - new Date(data.dateOfBirth).getFullYear() : undefined,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        height: data.height,
        weight: data.weight,
        emergencyContact: data.emergencyContact,
        chronicConditions: data.chronicConditions || [],
        allergies: data.allergies || [],
        currentMedications: data.currentMedications || [],
        familyHistory: data.familyHistory || [],
        healthRecords: {
          vaccinations: [],
          surgeries: [],
          pastIllnesses: [],
          vitalHistory: [],
          labReports: [],
          consultations: [],
          aiInsights: []
        },
        healthScore: 100,
        credits: 50, // Welcome bonus
        badges: ['নতুন সদস্য'],
        streak: 0,
        referralCode: generateReferralCode(),
        subscription: { tier: 'free', features: ['basic_chat', 'doctor_search'] },
        isKidAccount: data.isKidAccount || false,
        profileCompleteness: completeness,
        missingFields: missingFields
      };
      
      const patients = getStoredPatients();
      patients.push(newPatient);
      savePatients(patients);
      
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newPatient));
      localStorage.setItem(STORAGE_KEYS.ROLE, 'PATIENT');
      setUser(newPatient);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'রেজিস্ট্রেশন ব্যর্থ হয়েছে' };
    }
  };

  const registerDoctor = async (data: Partial<DoctorProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      const newDoctor: DoctorProfile = {
        id: generateId(),
        phone: data.phone || '',
        name: data.name || '',
        nameBn: data.nameBn || data.name || '',
        role: 'DOCTOR',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isVerified: true,
        profileImage: data.profileImage,
        bmdcNumber: data.bmdcNumber || '',
        nidNumber: data.nidNumber,
        specializations: data.specializations || [],
        qualifications: data.qualifications || [],
        experienceYears: data.experienceYears || 0,
        consultationFee: data.consultationFee || 500,
        status: 'pending', // Requires admin approval
        rating: 0,
        totalPatients: 0,
        totalConsultations: 0,
        credits: 0,
        badges: [],
        subscription: { tier: 'free', features: [] },
        chambers: data.chambers || []
      };
      
      const doctors = getStoredDoctors();
      doctors.push(newDoctor);
      saveDoctors(doctors);
      
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newDoctor));
      localStorage.setItem(STORAGE_KEYS.ROLE, 'DOCTOR');
      setUser(newDoctor);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'রেজিস্ট্রেশন ব্যর্থ হয়েছে' };
    }
  };

  const login = async (phone: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      if (role === 'PATIENT') {
        const patients = getStoredPatients();
        const patient = patients.find(p => p.phone === phone);
        if (patient) {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(patient));
          localStorage.setItem(STORAGE_KEYS.ROLE, 'PATIENT');
          setUser(patient);
          return { success: true };
        }
      } else if (role === 'DOCTOR') {
        const doctors = getStoredDoctors();
        const doctor = doctors.find(d => d.phone === phone);
        if (doctor) {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(doctor));
          localStorage.setItem(STORAGE_KEYS.ROLE, 'DOCTOR');
          setUser(doctor);
          return { success: true };
        }
      }
      return { success: false, error: 'ব্যবহারকারী পাওয়া যায়নি' };
    } catch (error) {
      return { success: false, error: 'লগইন ব্যর্থ হয়েছে' };
    }
  };

  const logout = async (): Promise<void> => {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    setUser(null);
  };

  const updateProfile = async (data: Partial<PatientProfile | DoctorProfile>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) return { success: false, error: 'ব্যবহারকারী পাওয়া যায়নি' };
      
      const updatedUser = { ...user, ...data, updatedAt: new Date().toISOString() };
      
      // Recalculate profile completeness for patients
      if (user.role === 'PATIENT') {
        const { completeness, missingFields } = calculateProfileCompleteness(updatedUser as PatientProfile);
        (updatedUser as PatientProfile).profileCompleteness = completeness;
        (updatedUser as PatientProfile).missingFields = missingFields;
        
        // Update age from DOB
        if ((updatedUser as PatientProfile).dateOfBirth) {
          (updatedUser as PatientProfile).age = new Date().getFullYear() - new Date((updatedUser as PatientProfile).dateOfBirth!).getFullYear();
        }
      }
      
      // Update in storage
      if (user.role === 'PATIENT') {
        const patients = getStoredPatients();
        const index = patients.findIndex(p => p.id === user.id);
        if (index >= 0) {
          patients[index] = updatedUser as PatientProfile;
          savePatients(patients);
        }
      } else if (user.role === 'DOCTOR') {
        const doctors = getStoredDoctors();
        const index = doctors.findIndex(d => d.id === user.id);
        if (index >= 0) {
          doctors[index] = updatedUser as DoctorProfile;
          saveDoctors(doctors);
        }
      }
      
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      setUser(updatedUser as PatientProfile | DoctorProfile);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'আপডেট ব্যর্থ হয়েছে' };
    }
  };

  const updateHealthRecord = async (data: Partial<HealthRecord>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user || user.role !== 'PATIENT') return { success: false, error: 'রোগী পাওয়া যায়নি' };
      
      const patientUser = user as PatientProfile;
      const updatedHealthRecords = {
        ...patientUser.healthRecords,
        ...data
      };
      
      return await updateProfile({ healthRecords: updatedHealthRecords } as any);
    } catch (error) {
      return { success: false, error: 'হেলথ রেকর্ড আপডেট ব্যর্থ' };
    }
  };

  const addAIInsight = async (insight: { insight: string; category: string; severity: 'info' | 'warning' | 'critical' }): Promise<void> => {
    if (!user || user.role !== 'PATIENT') return;
    
    const patientUser = user as PatientProfile;
    const newInsight = {
      date: new Date().toISOString(),
      ...insight,
      acknowledged: false
    };
    
    const updatedInsights = [...(patientUser.healthRecords?.aiInsights || []), newInsight];
    await updateHealthRecord({ aiInsights: updatedInsights });
  };

  const approveDoctor = async (doctorId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const doctors = getStoredDoctors();
      const index = doctors.findIndex(d => d.id === doctorId);
      if (index >= 0) {
        doctors[index].status = 'approved';
        doctors[index].approvedAt = new Date().toISOString();
        doctors[index].approvedBy = user?.id || 'admin';
        saveDoctors(doctors);
        return { success: true };
      }
      return { success: false, error: 'ডাক্তার পাওয়া যায়নি' };
    } catch (error) {
      return { success: false, error: 'অনুমোদন ব্যর্থ' };
    }
  };

  const rejectDoctor = async (doctorId: string, reason: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const doctors = getStoredDoctors();
      const index = doctors.findIndex(d => d.id === doctorId);
      if (index >= 0) {
        doctors[index].status = 'rejected';
        doctors[index].rejectionReason = reason;
        saveDoctors(doctors);
        return { success: true };
      }
      return { success: false, error: 'ডাক্তার পাওয়া যায়নি' };
    } catch (error) {
      return { success: false, error: 'প্রত্যাখ্যান ব্যর্থ' };
    }
  };

  const getAllPendingDoctors = async (): Promise<DoctorProfile[]> => {
    return getStoredDoctors().filter(d => d.status === 'pending');
  };

  const getAllUsers = async (): Promise<(PatientProfile | DoctorProfile)[]> => {
    return [...getStoredPatients(), ...getStoredDoctors()];
  };

  return (
    <AuthContext.Provider value={{
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
      updateHealthRecord,
      addAIInsight,
      approveDoctor,
      rejectDoctor,
      getAllPendingDoctors,
      getAllUsers
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
