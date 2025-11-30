/**
 * ============================================
 * NIRNOY AUTH CONTEXT
 * ============================================
 * Military-grade authentication wrapper
 * Uses Supabase as primary, localStorage as fallback
 * ============================================
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  authService, 
  PatientProfile, 
  DoctorProfile, 
  STORAGE_KEYS,
  normalizePhone,
  isSupabaseConfigured 
} from '../services/supabaseAuth';

// ============================================
// TYPES
// ============================================
interface AuthContextType {
  user: PatientProfile | DoctorProfile | null;
  role: 'patient' | 'doctor' | 'admin' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  
  // Auth methods
  checkPhone: (phone: string) => Promise<{ exists: boolean; type: 'patient' | 'doctor' | null; isApproved?: boolean }>;
  loginPatient: (phone: string) => Promise<{ success: boolean; error?: string }>;
  loginDoctor: (phone: string) => Promise<{ success: boolean; error?: string }>;
  registerPatient: (data: any) => Promise<{ success: boolean; error?: string }>;
  registerDoctor: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<PatientProfile | DoctorProfile>) => Promise<boolean>;
  
  // Admin methods
  getAllPatients: () => Promise<PatientProfile[]>;
  getAllDoctors: () => Promise<DoctorProfile[]>;
  getPendingDoctors: () => Promise<DoctorProfile[]>;
  approveDoctor: (id: string, phone: string) => Promise<boolean>;
  rejectDoctor: (id: string, phone: string) => Promise<boolean>;
}

// ============================================
// CONTEXT
// ============================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PatientProfile | DoctorProfile | null>(null);
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      console.log('[AuthContext] Initializing...');
      
      // Initialize the auth service (syncs with Supabase)
      await authService.initialize();
      
      // Check for existing session
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        console.log('[AuthContext] Found existing user:', currentUser.role);
        setUser(currentUser.user);
        setRole(currentUser.role as any);
      } else {
        console.log('[AuthContext] No existing user found');
      }
      
      setIsLoading(false);
    };

    init();

    // Online/offline listeners
    const handleOnline = () => {
      console.log('[AuthContext] Back online');
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log('[AuthContext] Gone offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check if phone exists
  const checkPhone = async (phone: string) => {
    console.log('[AuthContext] Checking phone:', phone);
    return await authService.checkPhone(phone);
  };

  // Login patient
  const loginPatient = async (phone: string) => {
    console.log('[AuthContext] Logging in patient:', phone);
    setIsLoading(true);
    
    try {
      const result = await authService.loginPatient(phone);
      
      if (result.success && result.user) {
        setUser(result.user);
        setRole('patient');
        console.log('[AuthContext] Patient login successful');
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  // Login doctor
  const loginDoctor = async (phone: string) => {
    console.log('[AuthContext] Logging in doctor:', phone);
    setIsLoading(true);
    
    try {
      const result = await authService.loginDoctor(phone);
      
      if (result.success && result.user) {
        setUser(result.user);
        setRole('doctor');
        console.log('[AuthContext] Doctor login successful');
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  // Register patient
  const registerPatient = async (data: any) => {
    console.log('[AuthContext] Registering patient:', data.phone);
    setIsLoading(true);
    
    try {
      const result = await authService.registerPatient(data);
      
      if (result.success && result.user) {
        setUser(result.user);
        setRole('patient');
        console.log('[AuthContext] Patient registration successful');
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  // Register doctor
  const registerDoctor = async (data: any) => {
    console.log('[AuthContext] Registering doctor:', data.phone);
    setIsLoading(true);
    
    try {
      const result = await authService.registerDoctor(data);
      
      if (result.success) {
        // Don't log in doctor - needs admin approval
        console.log('[AuthContext] Doctor registration successful - pending approval');
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = () => {
    console.log('[AuthContext] Logging out');
    authService.logout();
    setUser(null);
    setRole(null);
  };

  // Update profile
  const updateProfile = async (updates: Partial<PatientProfile | DoctorProfile>) => {
    if (!user) return false;
    
    const success = await authService.updatePatient(user.id, updates as any);
    
    if (success) {
      setUser(prev => prev ? { ...prev, ...updates } : null);
    }
    
    return success;
  };

  // Admin: Get all patients
  const getAllPatients = async () => {
    return await authService.getAllPatients();
  };

  // Admin: Get all doctors
  const getAllDoctors = async () => {
    return await authService.getAllDoctors();
  };

  // Admin: Get pending doctors
  const getPendingDoctors = async () => {
    return await authService.getPendingDoctors();
  };

  // Admin: Approve doctor
  const approveDoctor = async (id: string, phone: string) => {
    return await authService.updateDoctorStatus(id, phone, 'approved');
  };

  // Admin: Reject doctor
  const rejectDoctor = async (id: string, phone: string) => {
    return await authService.updateDoctorStatus(id, phone, 'rejected');
  };

  const value: AuthContextType = {
    user,
    role,
    isLoading,
    isAuthenticated: !!user,
    isOnline,
    checkPhone,
    loginPatient,
    loginDoctor,
    registerPatient,
    registerDoctor,
    logout,
    updateProfile,
    getAllPatients,
    getAllDoctors,
    getPendingDoctors,
    approveDoctor,
    rejectDoctor,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Re-export types
export type { PatientProfile, DoctorProfile };
export { STORAGE_KEYS, normalizePhone, isSupabaseConfigured };
