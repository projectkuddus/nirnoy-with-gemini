/**
 * NIRNOY AUTH CONTEXT - SIMPLIFIED
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, PatientProfile, DoctorProfile, normalizePhone, isSupabaseConfigured } from '../services/supabaseAuth';

// Re-export types
export type { PatientProfile, DoctorProfile };

interface AuthContextType {
  user: PatientProfile | DoctorProfile | null;
  role: 'patient' | 'doctor' | 'admin' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  
  checkPhone: (phone: string) => Promise<{ exists: boolean; type: 'patient' | 'doctor' | null; isApproved?: boolean }>;
  loginPatient: (phone: string) => Promise<{ success: boolean; error?: string }>;
  loginDoctor: (phone: string) => Promise<{ success: boolean; error?: string }>;
  registerPatient: (data: any) => Promise<{ success: boolean; error?: string }>;
  registerDoctor: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: Partial<PatientProfile | DoctorProfile>) => Promise<boolean>;
  
  getAllPatients: () => Promise<PatientProfile[]>;
  getAllDoctors: () => Promise<DoctorProfile[]>;
  getPendingDoctors: () => Promise<DoctorProfile[]>;
  approveDoctor: (id: string, phone: string) => Promise<boolean>;
  rejectDoctor: (id: string, phone: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PatientProfile | DoctorProfile | null>(null);
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize - check for existing session
  useEffect(() => {
    console.log('[AuthContext] Initializing...');
    
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      console.log('[AuthContext] Found user:', currentUser.role, currentUser.user?.name);
      setUser(currentUser.user);
      setRole(currentUser.role as any);
    } else {
      console.log('[AuthContext] No user found');
    }
    
    setIsLoading(false);
    
    // Online/offline
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const checkPhone = (phone: string) => authService.checkPhone(phone);
  
  const loginPatient = async (phone: string) => {
    console.log('[AuthContext] loginPatient:', phone);
    const result = await authService.loginPatient(phone);
    if (result.success && result.user) {
      setUser(result.user);
      setRole('patient');
    }
    return result;
  };
  
  const loginDoctor = async (phone: string) => {
    console.log('[AuthContext] loginDoctor:', phone);
    const result = await authService.loginDoctor(phone);
    if (result.success && result.user) {
      setUser(result.user);
      setRole('doctor');
    }
    return result;
  };
  
  const registerPatient = async (data: any) => {
    console.log('[AuthContext] registerPatient:', data.phone);
    const result = await authService.registerPatient(data);
    if (result.success && result.user) {
      console.log('[AuthContext] Setting user after registration');
      setUser(result.user);
      setRole('patient');
    }
    return result;
  };
  
  const registerDoctor = async (data: any) => {
    console.log('[AuthContext] registerDoctor:', data.phone);
    return await authService.registerDoctor(data);
  };
  
  const logout = () => {
    console.log('[AuthContext] Logging out');
    authService.logout();
    setUser(null);
    setRole(null);
  };
  
  const updateProfile = async (updates: any) => {
    if (!user) return false;
    const success = await authService.updatePatient(user.id, updates);
    if (success) {
      setUser(prev => prev ? { ...prev, ...updates } : null);
    }
    return success;
  };
  
  const getAllPatients = () => authService.getAllPatients();
  const getAllDoctors = () => authService.getAllDoctors();
  const getPendingDoctors = () => authService.getPendingDoctors();
  
  const approveDoctor = async (id: string, phone: string) => {
    return await authService.updateDoctorStatus(id, phone, 'approved');
  };
  
  const rejectDoctor = async (id: string, phone: string) => {
    return await authService.updateDoctorStatus(id, phone, 'rejected');
  };

  return (
    <AuthContext.Provider value={{
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
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export { normalizePhone, isSupabaseConfigured };
