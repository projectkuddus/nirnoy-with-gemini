import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl.includes('supabase'));

// Create Supabase client
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// ============ AUTH HELPERS ============

export const authService = {
  // Send OTP to phone
  async sendOTP(phone: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, simulating OTP send');
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+880${phone.replace(/^0/, '')}`,
      });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Verify OTP
  async verifyOTP(phone: string, otp: string): Promise<{ success: boolean; user?: any; error?: string }> {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, simulating OTP verification');
      return { success: true, user: { id: 'demo-user', phone } };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+880${phone.replace(/^0/, '')}`,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Get current user
  async getCurrentUser() {
    if (!isSupabaseConfigured) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Sign out
  async signOut(): Promise<void> {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!isSupabaseConfigured) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },
};

// ============ DATABASE HELPERS ============

export const dbService = {
  // ---- PROFILES ----
  async getProfile(userId: string) {
    if (!isSupabaseConfigured) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: any) {
    if (!isSupabaseConfigured) return { success: true };
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
    return { success: true };
  },

  // ---- DOCTORS ----
  async getDoctors(filters?: { specialty?: string; area?: string; limit?: number }) {
    if (!isSupabaseConfigured) return [];
    
    let query = supabase
      .from('doctors')
      .select(`
        *,
        profiles(*),
        chambers(*)
      `)
      .eq('is_verified', true);
    
    if (filters?.specialty) {
      query = query.contains('specialties', [filters.specialty]);
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getDoctorById(doctorId: string) {
    if (!isSupabaseConfigured) return null;
    
    const { data, error } = await supabase
      .from('doctors')
      .select(`
        *,
        profiles(*),
        chambers(*),
        schedules(*)
      `)
      .eq('id', doctorId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // ---- APPOINTMENTS ----
  async createAppointment(appointment: any) {
    if (!isSupabaseConfigured) {
      return { success: true, id: `demo-${Date.now()}` };
    }
    
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, id: data.id, data };
  },

  async getAppointments(userId: string, role: 'patient' | 'doctor') {
    if (!isSupabaseConfigured) return [];
    
    const column = role === 'patient' ? 'patient_id' : 'doctor_id';
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors(*, profiles(*), chambers(*)),
        patients(*, profiles(*))
      `)
      .eq(column, userId)
      .order('appointment_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async updateAppointmentStatus(appointmentId: string, status: string) {
    if (!isSupabaseConfigured) return { success: true };
    
    const { error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', appointmentId);
    
    if (error) throw error;
    return { success: true };
  },

  // ---- FEEDBACK ----
  async submitFeedback(feedback: any) {
    if (!isSupabaseConfigured) {
      // Store in localStorage as fallback
      const existing = JSON.parse(localStorage.getItem('nirnoy_feedback') || '[]');
      existing.push({ ...feedback, id: `local-${Date.now()}` });
      localStorage.setItem('nirnoy_feedback', JSON.stringify(existing));
      return { success: true };
    }
    
    const { data, error } = await supabase
      .from('feedback')
      .insert(feedback)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, id: data.id };
  },

  // ---- AI CONVERSATIONS ----
  async saveConversation(conversation: any) {
    if (!isSupabaseConfigured) return { success: true };
    
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert(conversation)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, id: data.id };
  },

  // ---- REVIEWS ----
  async getDoctorReviews(doctorId: string) {
    if (!isSupabaseConfigured) return [];
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        patients(profiles(name, name_bn))
      `)
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async submitReview(review: any) {
    if (!isSupabaseConfigured) return { success: true };
    
    const { error } = await supabase
      .from('reviews')
      .insert(review);
    
    if (error) throw error;
    return { success: true };
  },
};

// ============ REALTIME HELPERS ============

export const realtimeService = {
  // Subscribe to appointment updates
  subscribeToAppointments(appointmentId: string, callback: (payload: any) => void) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    
    const subscription = supabase
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
      unsubscribe: () => subscription.unsubscribe(),
    };
  },

  // Subscribe to queue updates for a chamber
  subscribeToQueue(chamberId: string, date: string, callback: (payload: any) => void) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} };
    
    const subscription = supabase
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
      unsubscribe: () => subscription.unsubscribe(),
    };
  },
};

export default supabase;

