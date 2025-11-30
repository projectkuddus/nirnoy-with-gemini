// ==============================================
// SUPABASE DATABASE SERVICE
// Production-ready for 500+ users, 100+ doctors
// ==============================================

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase'));

// Create Supabase client with optimized settings for scale
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-client-info': 'nirnoy-health-app' },
    },
  }
);

// ==============================================
// TYPES
// ==============================================

export interface Profile {
  id: string;
  phone: string;
  name?: string;
  name_bn?: string;
  email?: string;
  role: 'patient' | 'doctor' | 'admin';
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  blood_group?: string;
  address?: string;
  city?: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  user_id: string;
  bmdc_number: string;
  nid_number?: string;
  degrees: string[];
  specialties: string[];
  experience_years: number;
  bio?: string;
  bio_bn?: string;
  consultation_fee: number;
  follow_up_fee: number;
  is_verified: boolean;
  is_featured: boolean;
  rating: number;
  total_reviews: number;
  total_patients: number;
  languages: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: Profile;
  chambers?: Chamber[];
}

export interface Chamber {
  id: string;
  doctor_id: string;
  name: string;
  address: string;
  area?: string;
  city: string;
  phone?: string;
  fee: number;
  follow_up_fee?: number;
  is_primary: boolean;
  has_parking: boolean;
  has_ac: boolean;
  created_at: string;
  // Joined data
  schedules?: Schedule[];
}

export interface Schedule {
  id: string;
  chamber_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  max_patients: number;
  is_active: boolean;
}

export interface Patient {
  id: string;
  user_id: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  allergies: string[];
  chronic_conditions: string[];
  current_medications: string[];
  height_cm?: number;
  weight_kg?: number;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: Profile;
  family_members?: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  patient_id: string;
  name: string;
  relation: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  phone?: string;
  is_admin: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  chamber_id: string;
  appointment_date: string;
  appointment_time: string;
  serial_number: number;
  visit_type: 'new' | 'follow_up' | 'report';
  status: 'booked' | 'confirmed' | 'in_queue' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  fee: number;
  is_paid: boolean;
  payment_method?: string;
  chief_complaint?: string;
  symptoms: string[];
  notes?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  doctor?: Doctor;
  patient?: Patient;
  chamber?: Chamber;
}

export interface Feedback {
  id: string;
  user_id?: string;
  type: 'bug' | 'feature' | 'general' | 'doctor' | 'complaint';
  mood?: 'happy' | 'neutral' | 'sad';
  message: string;
  email?: string;
  phone?: string;
  page?: string;
  user_agent?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  admin_notes?: string;
  created_at: string;
}

// ==============================================
// AUTH SERVICE
// ==============================================

export const authService = {
  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Send OTP to phone (Bangladesh format)
  async sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      console.log('[Supabase] Not configured, using test mode');
      return { success: true };
    }

    try {
      // Format phone for Bangladesh (+880)
      const formattedPhone = `+880${phone.replace(/^0/, '').replace(/^\+880/, '')}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('[Supabase] OTP send error:', error);
      return { success: false, error: error.message };
    }
  },

  // Verify OTP
  async verifyOTP(phone: string, otp: string): Promise<{ success: boolean; user?: User; isNewUser?: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      console.log('[Supabase] Not configured, using test mode');
      return { success: true, isNewUser: true };
    }

    try {
      const formattedPhone = `+880${phone.replace(/^0/, '').replace(/^\+880/, '')}`;
      
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single();

      const isNewUser = !profile || !profile.name;

      return { success: true, user: data.user || undefined, isNewUser };
    } catch (error: any) {
      console.error('[Supabase] OTP verify error:', error);
      return { success: false, error: error.message };
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ==============================================
// PROFILE SERVICE
// ==============================================

export const profileService = {
  // Get profile by user ID
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Supabase] Get profile error:', error);
      return null;
    }
    return data;
  },

  // Update profile
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('[Supabase] Update profile error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Create or update profile (upsert)
  async upsertProfile(profile: Partial<Profile> & { id: string }): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        ...profile,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Supabase] Upsert profile error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },
};

// ==============================================
// PATIENT SERVICE
// ==============================================

export const patientService = {
  // Get patient by user ID
  async getPatient(userId: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        profile:profiles(*),
        family_members(*)
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[Supabase] Get patient error:', error);
      return null;
    }
    return data;
  },

  // Create patient
  async createPatient(userId: string, data: Partial<Patient>): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data: patient, error } = await supabase
      .from('patients')
      .insert({
        user_id: userId,
        ...data,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Create patient error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: patient.id };
  },

  // Update patient
  async updatePatient(patientId: string, updates: Partial<Patient>): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('patients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', patientId);

    if (error) {
      console.error('[Supabase] Update patient error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Get all patients (for admin)
  async getAllPatients(limit = 100, offset = 0): Promise<Patient[]> {
    const { data, error } = await supabase
      .from('patients')
      .select(`
        *,
        profile:profiles(*)
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Get all patients error:', error);
      return [];
    }
    return data;
  },

  // Add family member
  async addFamilyMember(patientId: string, member: Partial<FamilyMember>): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data, error } = await supabase
      .from('family_members')
      .insert({
        patient_id: patientId,
        ...member,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Add family member error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
  },

  // Remove family member
  async removeFamilyMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('[Supabase] Remove family member error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },
};

// ==============================================
// DOCTOR SERVICE
// ==============================================

export const doctorService = {
  // Get all verified doctors
  async getDoctors(filters?: {
    specialty?: string;
    area?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<Doctor[]> {
    let query = supabase
      .from('doctors')
      .select(`
        *,
        profile:profiles(*),
        chambers(*, schedules(*))
      `)
      .eq('is_verified', true);

    if (filters?.specialty) {
      query = query.contains('specialties', [filters.specialty]);
    }

    if (filters?.area) {
      query = query.eq('chambers.area', filters.area);
    }

    if (filters?.search) {
      query = query.or(`profile.name.ilike.%${filters.search}%,profile.name_bn.ilike.%${filters.search}%`);
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase] Get doctors error:', error);
      return [];
    }
    return data;
  },

  // Get doctor by ID
  async getDoctorById(doctorId: string): Promise<Doctor | null> {
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        *,
        profile:profiles(*),
        chambers(*, schedules(*))
      `)
      .eq('id', doctorId)
      .single();

    if (error) {
      console.error('[Supabase] Get doctor error:', error);
      return null;
    }
    return data;
  },

  // Get doctor by user ID
  async getDoctorByUserId(userId: string): Promise<Doctor | null> {
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        *,
        profile:profiles(*),
        chambers(*, schedules(*))
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[Supabase] Get doctor by user error:', error);
      return null;
    }
    return data;
  },

  // Create doctor (registration)
  async createDoctor(userId: string, data: Partial<Doctor>): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data: doctor, error } = await supabase
      .from('doctors')
      .insert({
        user_id: userId,
        is_verified: false, // Needs admin approval
        ...data,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Create doctor error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: doctor.id };
  },

  // Update doctor
  async updateDoctor(doctorId: string, updates: Partial<Doctor>): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('doctors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', doctorId);

    if (error) {
      console.error('[Supabase] Update doctor error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Get pending doctors (for admin approval)
  async getPendingDoctors(): Promise<Doctor[]> {
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('is_verified', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Get pending doctors error:', error);
      return [];
    }
    return data;
  },

  // Approve doctor
  async approveDoctor(doctorId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('doctors')
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq('id', doctorId);

    if (error) {
      console.error('[Supabase] Approve doctor error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Reject doctor
  async rejectDoctor(doctorId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('doctors')
      .delete()
      .eq('id', doctorId);

    if (error) {
      console.error('[Supabase] Reject doctor error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Add chamber
  async addChamber(doctorId: string, chamber: Partial<Chamber>): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data, error } = await supabase
      .from('chambers')
      .insert({
        doctor_id: doctorId,
        ...chamber,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Add chamber error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
  },

  // Add schedule
  async addSchedule(chamberId: string, schedule: Partial<Schedule>): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data, error } = await supabase
      .from('schedules')
      .insert({
        chamber_id: chamberId,
        ...schedule,
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Add schedule error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
  },
};

// ==============================================
// APPOINTMENT SERVICE
// ==============================================

export const appointmentService = {
  // Create appointment
  async createAppointment(data: Partial<Appointment>): Promise<{ success: boolean; id?: string; error?: string }> {
    // Get next serial number
    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('serial_number')
      .eq('doctor_id', data.doctor_id)
      .eq('chamber_id', data.chamber_id)
      .eq('appointment_date', data.appointment_date)
      .order('serial_number', { ascending: false })
      .limit(1);

    const nextSerial = existingAppts && existingAppts.length > 0 
      ? existingAppts[0].serial_number + 1 
      : 1;

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        ...data,
        serial_number: nextSerial,
        status: 'booked',
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Create appointment error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: appointment.id };
  },

  // Get appointments for patient
  async getPatientAppointments(patientId: string, status?: string): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctors(*, profile:profiles(*), chambers(*)),
        chamber:chambers(*)
      `)
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase] Get patient appointments error:', error);
      return [];
    }
    return data;
  },

  // Get appointments for doctor
  async getDoctorAppointments(doctorId: string, date?: string, status?: string): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*, profile:profiles(*)),
        chamber:chambers(*)
      `)
      .eq('doctor_id', doctorId)
      .order('serial_number', { ascending: true });

    if (date) {
      query = query.eq('appointment_date', date);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase] Get doctor appointments error:', error);
      return [];
    }
    return data;
  },

  // Update appointment status
  async updateStatus(appointmentId: string, status: Appointment['status'], notes?: string): Promise<{ success: boolean; error?: string }> {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (notes) updates.notes = notes;

    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointmentId);

    if (error) {
      console.error('[Supabase] Update appointment status error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Cancel appointment
  async cancelAppointment(appointmentId: string, cancelledBy: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_by: cancelledBy,
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId);

    if (error) {
      console.error('[Supabase] Cancel appointment error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Get queue for a chamber on a date
  async getQueue(chamberId: string, date: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*, profile:profiles(*))
      `)
      .eq('chamber_id', chamberId)
      .eq('appointment_date', date)
      .in('status', ['booked', 'confirmed', 'in_queue', 'in_progress'])
      .order('serial_number', { ascending: true });

    if (error) {
      console.error('[Supabase] Get queue error:', error);
      return [];
    }
    return data;
  },

  // Get available slots for a doctor on a date
  async getAvailableSlots(doctorId: string, chamberId: string, date: string): Promise<number[]> {
    // Get schedule for this chamber and day
    const dayOfWeek = new Date(date).getDay();
    
    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('chamber_id', chamberId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);

    if (!schedules || schedules.length === 0) return [];

    const schedule = schedules[0];

    // Get booked appointments
    const { data: appointments } = await supabase
      .from('appointments')
      .select('serial_number')
      .eq('doctor_id', doctorId)
      .eq('chamber_id', chamberId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled');

    const bookedSerials = new Set(appointments?.map(a => a.serial_number) || []);
    const availableSlots: number[] = [];

    for (let i = 1; i <= schedule.max_patients; i++) {
      if (!bookedSerials.has(i)) {
        availableSlots.push(i);
      }
    }

    return availableSlots;
  },
};

// ==============================================
// FEEDBACK SERVICE
// ==============================================

export const feedbackService = {
  // Submit feedback
  async submitFeedback(feedback: Partial<Feedback>): Promise<{ success: boolean; id?: string; error?: string }> {
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        ...feedback,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Submit feedback error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data.id };
  },

  // Get all feedback (for admin)
  async getAllFeedback(status?: string): Promise<Feedback[]> {
    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase] Get feedback error:', error);
      return [];
    }
    return data;
  },

  // Update feedback status
  async updateFeedbackStatus(feedbackId: string, status: Feedback['status'], adminNotes?: string): Promise<{ success: boolean; error?: string }> {
    const updates: any = { status };
    if (adminNotes) updates.admin_notes = adminNotes;

    const { error } = await supabase
      .from('feedback')
      .update(updates)
      .eq('id', feedbackId);

    if (error) {
      console.error('[Supabase] Update feedback error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },
};

// ==============================================
// REALTIME SERVICE
// ==============================================

export const realtimeService = {
  // Subscribe to queue updates
  subscribeToQueue(chamberId: string, date: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`queue:${chamberId}:${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `chamber_id=eq.${chamberId}`,
        },
        callback
      )
      .subscribe();

    return {
      unsubscribe: () => channel.unsubscribe(),
    };
  },

  // Subscribe to appointment updates
  subscribeToAppointment(appointmentId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`appointment:${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `id=eq.${appointmentId}`,
        },
        callback
      )
      .subscribe();

    return {
      unsubscribe: () => channel.unsubscribe(),
    };
  },

  // Subscribe to doctor's appointments
  subscribeToDoctorAppointments(doctorId: string, callback: (payload: any) => void) {
    const channel = supabase
      .channel(`doctor:${doctorId}:appointments`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${doctorId}`,
        },
        callback
      )
      .subscribe();

    return {
      unsubscribe: () => channel.unsubscribe(),
    };
  },
};

// ==============================================
// ADMIN SERVICE
// ==============================================

export const adminService = {
  // Get dashboard stats
  async getDashboardStats(): Promise<{
    totalPatients: number;
    totalDoctors: number;
    totalAppointments: number;
    pendingDoctors: number;
    todayAppointments: number;
    revenue: number;
  }> {
    const today = new Date().toISOString().split('T')[0];

    const [patients, doctors, appointments, pendingDoctors, todayAppts] = await Promise.all([
      supabase.from('patients').select('id', { count: 'exact', head: true }),
      supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('is_verified', true),
      supabase.from('appointments').select('id', { count: 'exact', head: true }),
      supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('is_verified', false),
      supabase.from('appointments').select('id, fee', { count: 'exact' }).eq('appointment_date', today),
    ]);

    const revenue = todayAppts.data?.reduce((sum, a) => sum + (a.fee || 0), 0) || 0;

    return {
      totalPatients: patients.count || 0,
      totalDoctors: doctors.count || 0,
      totalAppointments: appointments.count || 0,
      pendingDoctors: pendingDoctors.count || 0,
      todayAppointments: todayAppts.count || 0,
      revenue,
    };
  },

  // Get all users
  async getAllUsers(role?: string, limit = 100, offset = 0): Promise<Profile[]> {
    let query = supabase
      .from('profiles')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Supabase] Get all users error:', error);
      return [];
    }
    return data;
  },
};

// Export default
export default supabase;

