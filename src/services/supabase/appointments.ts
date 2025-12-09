import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type Appointment = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];

export class AppointmentService {
  /**
   * Create new appointment
   */
  static async create(appointment: AppointmentInsert): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      return null;
    }

    return data;
  }

  /**
   * Get appointment by ID
   */
  static async getById(appointmentId: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, doctors(*, users(*)), patients(*, users(*)), chambers(*)')
      .eq('id', appointmentId)
      .single();

    if (error) {
      console.error('Error fetching appointment:', error);
      return null;
    }

    return data;
  }

  /**
   * Update appointment status
   */
  static async updateStatus(
    appointmentId: string,
    status: Appointment['status'],
    notes?: string
  ): Promise<Appointment | null> {
    const update: AppointmentUpdate = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (notes) {
      update.notes = notes;
    }

    if (status === 'completed') {
      update.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(update)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating appointment:', error);
      return null;
    }

    return data;
  }

  /**
   * Subscribe to appointment updates (real-time)
   */
  static subscribeToAppointment(
    appointmentId: string,
    callback: (appointment: Appointment) => void
  ) {
    return supabase
      .channel(`appointment:${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `id=eq.${appointmentId}`,
        },
        (payload) => {
          callback(payload.new as Appointment);
        }
      )
      .subscribe();
  }
}

