import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type Doctor = Database['public']['Tables']['doctors']['Row'];
type DoctorInsert = Database['public']['Tables']['doctors']['Insert'];
type DoctorUpdate = Database['public']['Tables']['doctors']['Update'];

export class DoctorService {
  /**
   * Get doctor by user ID
   */
  static async getByUserId(userId: string): Promise<Doctor | null> {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching doctor:', error);
      return null;
    }

    return data;
  }

  /**
   * Get doctor by ID
   */
  static async getById(doctorId: string): Promise<Doctor | null> {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', doctorId)
      .single();

    if (error) {
      console.error('Error fetching doctor:', error);
      return null;
    }

    return data;
  }

  /**
   * Search doctors with filters
   */
  static async search(filters: {
    specialty?: string;
    location?: string;
    gender?: string;
    minRating?: number;
    maxFee?: number;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase
      .from('doctors')
      .select('*, users(*), chambers(*)')
      .eq('is_active', true)
      .eq('is_verified', true);

    if (filters.specialty) {
      query = query.contains('specializations', [filters.specialty]);
    }

    if (filters.minRating) {
      query = query.gte('rating', filters.minRating);
    }

    if (filters.maxFee) {
      query = query.lte('consultation_fee', filters.maxFee);
    }

    query = query
      .order('rating', { ascending: false })
      .limit(filters.limit || 50)
      .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error searching doctors:', error);
      return [];
    }

    return data;
  }

  /**
   * Get doctor's patients
   */
  static async getPatients(doctorId: string, limit = 100) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(*, users(*))')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching doctor patients:', error);
      return [];
    }

    return data;
  }

  /**
   * Get doctor's appointments for today
   */
  static async getTodayAppointments(doctorId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(*, users(*))')
      .eq('doctor_id', doctorId)
      .eq('date', today)
      .in('status', ['scheduled', 'confirmed', 'in_queue', 'in_progress'])
      .order('serial_number', { ascending: true });

    if (error) {
      console.error('Error fetching today appointments:', error);
      return [];
    }

    return data;
  }

  /**
   * Subscribe to doctor queue updates (real-time)
   */
  static subscribeToQueue(doctorId: string, callback: (update: any) => void) {
    return supabase
      .channel(`doctor-queue:${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();
  }
}

