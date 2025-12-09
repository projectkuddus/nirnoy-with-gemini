import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type Patient = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];

export class PatientService {
  /**
   * Get patient by user ID
   */
  static async getByUserId(userId: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching patient:', error);
      return null;
    }

    return data;
  }

  /**
   * Get patient by ID
   */
  static async getById(patientId: string): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (error) {
      console.error('Error fetching patient:', error);
      return null;
    }

    return data;
  }

  /**
   * Create new patient
   */
  static async create(patient: PatientInsert): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .insert(patient)
      .select()
      .single();

    if (error) {
      console.error('Error creating patient:', error);
      return null;
    }

    return data;
  }

  /**
   * Update patient
   */
  static async update(patientId: string, updates: PatientUpdate): Promise<Patient | null> {
    const { data, error } = await supabase
      .from('patients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', patientId)
      .select()
      .single();

    if (error) {
      console.error('Error updating patient:', error);
      return null;
    }

    return data;
  }

  /**
   * Get patient health records
   */
  static async getHealthRecords(patientId: string, limit = 50) {
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching health records:', error);
      return [];
    }

    return data;
  }

  /**
   * Get patient appointments
   */
  static async getAppointments(patientId: string, status?: string) {
    let query = supabase
      .from('appointments')
      .select('*, doctors(*), chambers(*)')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }

    return data;
  }

  /**
   * Subscribe to patient updates (real-time)
   */
  static subscribeToPatient(patientId: string, callback: (patient: Patient) => void) {
    return supabase
      .channel(`patient:${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patients',
          filter: `id=eq.${patientId}`,
        },
        (payload) => {
          callback(payload.new as Patient);
        }
      )
      .subscribe();
  }
}

