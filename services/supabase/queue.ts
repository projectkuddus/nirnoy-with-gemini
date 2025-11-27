import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type QueueEntry = Database['public']['Tables']['queue_entries']['Row'];
type QueueEntryInsert = Database['public']['Tables']['queue_entries']['Insert'];
type QueueEntryUpdate = Database['public']['Tables']['queue_entries']['Update'];

export class QueueService {
  /**
   * Get current queue for doctor
   */
  static async getDoctorQueue(doctorId: string) {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*, appointments(*, patients(*, users(*)))')
      .eq('doctor_id', doctorId)
      .in('status', ['waiting', 'next', 'current'])
      .order('current_serial', { ascending: true });

    if (error) {
      console.error('Error fetching queue:', error);
      return [];
    }

    return data;
  }

  /**
   * Update queue entry (when doctor moves to next patient)
   */
  static async updateQueueEntry(
    queueId: string,
    updates: QueueEntryUpdate
  ): Promise<QueueEntry | null> {
    const { data, error } = await supabase
      .from('queue_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', queueId)
      .select()
      .single();

    if (error) {
      console.error('Error updating queue entry:', error);
      return null;
    }

    return data;
  }

  /**
   * Update current serial (when doctor sees a patient)
   */
  static async updateCurrentSerial(
    doctorId: string,
    newSerial: number,
    delayMinutes = 0,
    message?: string
  ) {
    // Update all queue entries for this doctor
    const update: QueueEntryUpdate = {
      current_serial: newSerial,
      delay_minutes: delayMinutes,
      doctor_message: message || null,
      updated_at: new Date().toISOString(),
    };

    // Update status based on serial
    const { data: queueEntries } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('doctor_id', doctorId)
      .in('status', ['waiting', 'next', 'current']);

    if (queueEntries) {
      for (const entry of queueEntries) {
        const appointment = await supabase
          .from('appointments')
          .select('serial_number')
          .eq('id', entry.appointment_id)
          .single();

        if (appointment.data) {
          const serialNumber = appointment.data.serial_number;
          let status: QueueEntry['status'] = 'waiting';

          if (serialNumber === newSerial) {
            status = 'current';
          } else if (serialNumber === newSerial + 1) {
            status = 'next';
          }

          await supabase
            .from('queue_entries')
            .update({ ...update, status })
            .eq('id', entry.id);
        }
      }
    }

    return true;
  }

  /**
   * Subscribe to queue updates (real-time)
   */
  static subscribeToQueue(doctorId: string, callback: (update: QueueEntry) => void) {
    return supabase
      .channel(`queue:${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload) => {
          callback(payload.new as QueueEntry);
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to specific appointment queue position
   */
  static subscribeToAppointmentQueue(
    appointmentId: string,
    callback: (update: QueueEntry) => void
  ) {
    return supabase
      .channel(`appointment-queue:${appointmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `appointment_id=eq.${appointmentId}`,
        },
        (payload) => {
          callback(payload.new as QueueEntry);
        }
      )
      .subscribe();
  }
}

