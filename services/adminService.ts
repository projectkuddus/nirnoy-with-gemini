/**
 * ADMIN SERVICE - Production-ready for 50,000+ users
 * Handles all admin operations with proper pagination, real-time updates, and error handling
 */

import { supabase } from '../lib/supabase';

// ============ TYPES ============
export interface AdminStats {
  totalDoctors: number;
  approvedDoctors: number;
  pendingDoctors: number;
  rejectedDoctors: number;
  totalPatients: number;
  activePatients: number;
  totalAppointments: number;
  todayAppointments: number;
}

export interface DoctorListItem {
  id: string;
  profileId: string;
  name: string;
  phone: string;
  email?: string;
  bmdcNumber: string;
  specialties: string[];
  experienceYears: number;
  consultationFee: number;
  status: 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  rating: number;
  totalPatients: number;
  createdAt: string;
  avatarUrl?: string;
}

export interface PatientListItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gender?: string;
  isVerified: boolean;
  subscriptionTier?: string;
  totalAppointments: number;
  createdAt: string;
  avatarUrl?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ ADMIN SERVICE ============
export const adminService = {
  // Get dashboard stats
  async getStats(): Promise<AdminStats> {
    try {
      // Get doctor counts
      const { count: totalDoctors } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true });

      const { count: approvedDoctors } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      const { count: pendingDoctors } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: rejectedDoctors } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');

      // Get patient counts
      const { count: totalPatients } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'patient');

      const { count: activePatients } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'patient')
        .eq('is_active', true);

      // Get appointment counts
      const { count: totalAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', today)
        .lt('appointment_date', today + 'T23:59:59');

      return {
        totalDoctors: totalDoctors || 0,
        approvedDoctors: approvedDoctors || 0,
        pendingDoctors: pendingDoctors || 0,
        rejectedDoctors: rejectedDoctors || 0,
        totalPatients: totalPatients || 0,
        activePatients: activePatients || 0,
        totalAppointments: totalAppointments || 0,
        todayAppointments: todayAppointments || 0,
      };
    } catch (error) {
      console.error('[AdminService] getStats error:', error);
      return {
        totalDoctors: 0,
        approvedDoctors: 0,
        pendingDoctors: 0,
        rejectedDoctors: 0,
        totalPatients: 0,
        activePatients: 0,
        totalAppointments: 0,
        todayAppointments: 0,
      };
    }
  },

  // Get pending doctors (for approval)
  async getPendingDoctors(): Promise<DoctorListItem[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          phone,
          email,
          avatar_url,
          created_at,
          doctors!inner(
            id,
            bmdc_number,
            specialties,
            experience_years,
            consultation_fee,
            status,
            is_verified,
            rating,
            total_patients
          )
        `)
        .eq('role', 'doctor')
        .eq('doctors.status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminService] getPendingDoctors error:', error);
        return [];
      }

      return (data || []).map(p => {
        const d = (p.doctors as any)?.[0] || p.doctors || {};
        return {
          id: d.id || p.id,
          profileId: p.id,
          name: p.name || 'Unknown',
          phone: p.phone || '',
          email: p.email,
          bmdcNumber: d.bmdc_number || 'N/A',
          specialties: d.specialties || [],
          experienceYears: d.experience_years || 0,
          consultationFee: d.consultation_fee || 0,
          status: d.status || 'pending',
          isVerified: d.is_verified || false,
          rating: parseFloat(d.rating) || 0,
          totalPatients: d.total_patients || 0,
          createdAt: p.created_at,
          avatarUrl: p.avatar_url,
        };
      });
    } catch (error) {
      console.error('[AdminService] getPendingDoctors error:', error);
      return [];
    }
  },

  // Get doctors with pagination
  async getDoctors(
    page: number = 1,
    pageSize: number = 20,
    status?: 'pending' | 'approved' | 'rejected',
    search?: string
  ): Promise<PaginatedResult<DoctorListItem>> {
    try {
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from('profiles')
        .select(`
          id,
          name,
          phone,
          email,
          avatar_url,
          created_at,
          doctors!inner(
            id,
            bmdc_number,
            specialties,
            experience_years,
            consultation_fee,
            status,
            is_verified,
            rating,
            total_patients
          )
        `, { count: 'exact' })
        .eq('role', 'doctor');

      if (status) {
        query = query.eq('doctors.status', status);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('[AdminService] getDoctors error:', error);
        return { data: [], total: 0, page, pageSize, totalPages: 0 };
      }

      const doctors: DoctorListItem[] = (data || []).map(p => {
        const d = (p.doctors as any)?.[0] || p.doctors || {};
        return {
          id: d.id || p.id,
          profileId: p.id,
          name: p.name || 'Unknown',
          phone: p.phone || '',
          email: p.email,
          bmdcNumber: d.bmdc_number || 'N/A',
          specialties: d.specialties || [],
          experienceYears: d.experience_years || 0,
          consultationFee: d.consultation_fee || 0,
          status: d.status || 'pending',
          isVerified: d.is_verified || false,
          rating: parseFloat(d.rating) || 0,
          totalPatients: d.total_patients || 0,
          createdAt: p.created_at,
          avatarUrl: p.avatar_url,
        };
      });

      const total = count || 0;
      return {
        data: doctors,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('[AdminService] getDoctors error:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }
  },

  // Approve doctor
  async approveDoctor(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AdminService] Approving doctor:', profileId);

      // Update doctors table
      const { error: doctorError } = await supabase
        .from('doctors')
        .update({ status: 'approved', is_verified: true })
        .eq('profile_id', profileId);

      if (doctorError) {
        console.error('[AdminService] Doctor update error:', doctorError);
        return { success: false, error: doctorError.message };
      }

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: true })
        .eq('id', profileId);

      if (profileError) {
        console.error('[AdminService] Profile update error:', profileError);
        return { success: false, error: profileError.message };
      }

      console.log('[AdminService] Doctor approved successfully');
      return { success: true };
    } catch (error: any) {
      console.error('[AdminService] approveDoctor error:', error);
      return { success: false, error: error.message };
    }
  },

  // Reject doctor
  async rejectDoctor(profileId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AdminService] Rejecting doctor:', profileId);

      const { error: doctorError } = await supabase
        .from('doctors')
        .update({ status: 'rejected', is_verified: false })
        .eq('profile_id', profileId);

      if (doctorError) {
        console.error('[AdminService] Doctor reject error:', doctorError);
        return { success: false, error: doctorError.message };
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_verified: false })
        .eq('id', profileId);

      if (profileError) {
        console.error('[AdminService] Profile reject error:', profileError);
        return { success: false, error: profileError.message };
      }

      console.log('[AdminService] Doctor rejected successfully');
      return { success: true };
    } catch (error: any) {
      console.error('[AdminService] rejectDoctor error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get patients with pagination
  async getPatients(
    page: number = 1,
    pageSize: number = 20,
    search?: string
  ): Promise<PaginatedResult<PatientListItem>> {
    try {
      const offset = (page - 1) * pageSize;

      let query = supabase
        .from('profiles')
        .select(`
          id,
          name,
          phone,
          email,
          gender,
          avatar_url,
          is_verified,
          subscription_tier,
          created_at
        `, { count: 'exact' })
        .eq('role', 'patient');

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('[AdminService] getPatients error:', error);
        return { data: [], total: 0, page, pageSize, totalPages: 0 };
      }

      const patients: PatientListItem[] = (data || []).map(p => ({
        id: p.id,
        name: p.name || 'Unknown',
        phone: p.phone || '',
        email: p.email,
        gender: p.gender,
        isVerified: p.is_verified || false,
        subscriptionTier: p.subscription_tier,
        totalAppointments: 0, // Would need a separate count query
        createdAt: p.created_at,
        avatarUrl: p.avatar_url,
      }));

      const total = count || 0;
      return {
        data: patients,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      console.error('[AdminService] getPatients error:', error);
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }
  },

  // Subscribe to real-time updates
  subscribeToChanges(callback: () => void) {
    const channel = supabase
      .channel('admin-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, callback)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

export default adminService;


