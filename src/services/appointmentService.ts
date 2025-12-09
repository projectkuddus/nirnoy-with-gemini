/**
 * Appointment Service
 * Handles all appointment-related operations with Supabase
 * Production-ready for 500+ users, 100+ doctors
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// ============ TYPES ============
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  chamberId: string;
  appointmentDate: string;
  appointmentTime: string;
  serialNumber: number;
  visitType: 'new' | 'follow_up' | 'report';
  status: 'booked' | 'confirmed' | 'in_queue' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  fee: number;
  isPaid: boolean;
  paymentMethod?: string;
  chiefComplaint?: string;
  symptoms: string[];
  notes?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  doctor?: {
    id: string;
    name: string;
    specialties: string[];
    profileImage?: string;
  };
  patient?: {
    id: string;
    name: string;
    phone: string;
  };
  chamber?: {
    id: string;
    name: string;
    address: string;
  };
}

export interface CreateAppointmentData {
  patientId: string;
  doctorId: string;
  chamberId: string;
  appointmentDate: string;
  appointmentTime: string;
  visitType: 'new' | 'follow_up' | 'report';
  fee: number;
  chiefComplaint?: string;
  symptoms?: string[];
}

// Local storage key for fallback
const APPOINTMENTS_KEY = 'nirnoy_appointments_v4';

// ============ LOCAL STORAGE HELPERS ============
const getStoredAppointments = (): Appointment[] => {
  try {
    return JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveAppointments = (appointments: Appointment[]) => {
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
};

const generateId = () => `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============ SUPABASE MAPPER ============
const mapSupabaseAppointment = (data: any): Appointment => ({
  id: data.id,
  patientId: data.patient_id,
  doctorId: data.doctor_id,
  chamberId: data.chamber_id,
  appointmentDate: data.appointment_date,
  appointmentTime: data.appointment_time,
  serialNumber: data.serial_number,
  visitType: data.visit_type,
  status: data.status,
  fee: data.fee,
  isPaid: data.is_paid,
  paymentMethod: data.payment_method,
  chiefComplaint: data.chief_complaint,
  symptoms: data.symptoms || [],
  notes: data.notes,
  cancelledBy: data.cancelled_by,
  cancellationReason: data.cancellation_reason,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  doctor: data.doctor ? {
    id: data.doctor.id,
    name: data.doctor.profile?.name || data.doctor.profiles?.name || '',
    specialties: data.doctor.specialties || [],
    profileImage: data.doctor.profile?.avatar_url || data.doctor.profiles?.avatar_url,
  } : undefined,
  patient: data.patient ? {
    id: data.patient.id,
    name: data.patient.profile?.name || data.patient.profiles?.name || '',
    phone: data.patient.profile?.phone || data.patient.profiles?.phone || '',
  } : undefined,
  chamber: data.chamber ? {
    id: data.chamber.id,
    name: data.chamber.name,
    address: data.chamber.address,
  } : undefined,
});

// ============ APPOINTMENT SERVICE ============
export const appointmentService = {
  /**
   * Create a new appointment
   */
  async createAppointment(data: CreateAppointmentData): Promise<{ success: boolean; id?: string; serialNumber?: number; error?: string }> {
    try {
      // Get next serial number
      let serialNumber = 1;
      
      if (isSupabaseConfigured) {
        // Get from Supabase
        const { data: existingAppts } = await supabase
          .from('appointments')
          .select('serial_number')
          .eq('doctor_id', data.doctorId)
          .eq('chamber_id', data.chamberId)
          .eq('appointment_date', data.appointmentDate)
          .neq('status', 'cancelled')
          .order('serial_number', { ascending: false })
          .limit(1);
        
        if (existingAppts && existingAppts.length > 0) {
          serialNumber = existingAppts[0].serial_number + 1;
        }
        
        // Create in Supabase
        const { data: appointment, error } = await supabase
          .from('appointments')
          .insert({
            patient_id: data.patientId,
            doctor_id: data.doctorId,
            chamber_id: data.chamberId,
            appointment_date: data.appointmentDate,
            appointment_time: data.appointmentTime,
            serial_number: serialNumber,
            visit_type: data.visitType,
            status: 'booked',
            fee: data.fee,
            is_paid: false,
            chief_complaint: data.chiefComplaint,
            symptoms: data.symptoms || [],
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return { success: true, id: appointment.id, serialNumber };
      }
      
      // Fallback to localStorage
      const appointments = getStoredAppointments();
      const existingForDate = appointments.filter(
        a => a.doctorId === data.doctorId && 
             a.chamberId === data.chamberId && 
             a.appointmentDate === data.appointmentDate &&
             a.status !== 'cancelled'
      );
      
      if (existingForDate.length > 0) {
        serialNumber = Math.max(...existingForDate.map(a => a.serialNumber)) + 1;
      }
      
      const newAppointment: Appointment = {
        id: generateId(),
        patientId: data.patientId,
        doctorId: data.doctorId,
        chamberId: data.chamberId,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        serialNumber,
        visitType: data.visitType,
        status: 'booked',
        fee: data.fee,
        isPaid: false,
        chiefComplaint: data.chiefComplaint,
        symptoms: data.symptoms || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      appointments.push(newAppointment);
      saveAppointments(appointments);
      
      return { success: true, id: newAppointment.id, serialNumber };
    } catch (error: any) {
      console.error('[AppointmentService] Create error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get appointments for a patient
   */
  async getPatientAppointments(patientId: string, status?: string): Promise<Appointment[]> {
    try {
      if (isSupabaseConfigured) {
        let query = supabase
          .from('appointments')
          .select(`
            *,
            doctor:doctors(id, specialties, profiles:user_id(name, avatar_url)),
            chamber:chambers(id, name, address)
          `)
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false });
        
        if (status) {
          query = query.eq('status', status);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return (data || []).map(mapSupabaseAppointment);
      }
      
      // Fallback to localStorage
      let appointments = getStoredAppointments().filter(a => a.patientId === patientId);
      if (status) {
        appointments = appointments.filter(a => a.status === status);
      }
      return appointments.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
    } catch (error: any) {
      console.error('[AppointmentService] Get patient appointments error:', error);
      return [];
    }
  },

  /**
   * Get appointments for a doctor
   */
  async getDoctorAppointments(doctorId: string, date?: string, status?: string): Promise<Appointment[]> {
    try {
      if (isSupabaseConfigured) {
        let query = supabase
          .from('appointments')
          .select(`
            *,
            patient:patients(id, user_id, profiles:user_id(name, phone, avatar_url)),
            chamber:chambers(id, name, address)
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
        
        if (error) throw error;
        return (data || []).map(mapSupabaseAppointment);
      }
      
      // Fallback to localStorage
      let appointments = getStoredAppointments().filter(a => a.doctorId === doctorId);
      if (date) {
        appointments = appointments.filter(a => a.appointmentDate === date);
      }
      if (status) {
        appointments = appointments.filter(a => a.status === status);
      }
      return appointments.sort((a, b) => a.serialNumber - b.serialNumber);
    } catch (error: any) {
      console.error('[AppointmentService] Get doctor appointments error:', error);
      return [];
    }
  },

  /**
   * Get queue for a chamber on a specific date
   */
  async getQueue(chamberId: string, date: string): Promise<Appointment[]> {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:patients(id, user_id, profiles:user_id(name, phone))
          `)
          .eq('chamber_id', chamberId)
          .eq('appointment_date', date)
          .in('status', ['booked', 'confirmed', 'in_queue', 'in_progress'])
          .order('serial_number', { ascending: true });
        
        if (error) throw error;
        return (data || []).map(mapSupabaseAppointment);
      }
      
      // Fallback
      return getStoredAppointments()
        .filter(a => 
          a.chamberId === chamberId && 
          a.appointmentDate === date &&
          ['booked', 'confirmed', 'in_queue', 'in_progress'].includes(a.status)
        )
        .sort((a, b) => a.serialNumber - b.serialNumber);
    } catch (error: any) {
      console.error('[AppointmentService] Get queue error:', error);
      return [];
    }
  },

  /**
   * Update appointment status
   */
  async updateStatus(appointmentId: string, status: Appointment['status'], notes?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      
      if (isSupabaseConfigured) {
        const updates: any = { status, updated_at: now };
        if (notes) updates.notes = notes;
        
        const { error } = await supabase
          .from('appointments')
          .update(updates)
          .eq('id', appointmentId);
        
        if (error) throw error;
        return { success: true };
      }
      
      // Fallback
      const appointments = getStoredAppointments();
      const index = appointments.findIndex(a => a.id === appointmentId);
      if (index === -1) return { success: false, error: 'Appointment not found' };
      
      appointments[index] = {
        ...appointments[index],
        status,
        notes: notes || appointments[index].notes,
        updatedAt: now,
      };
      saveAppointments(appointments);
      
      return { success: true };
    } catch (error: any) {
      console.error('[AppointmentService] Update status error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Cancel an appointment
   */
  async cancelAppointment(appointmentId: string, cancelledBy: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('appointments')
          .update({
            status: 'cancelled',
            cancelled_by: cancelledBy,
            cancellation_reason: reason,
            updated_at: now,
          })
          .eq('id', appointmentId);
        
        if (error) throw error;
        return { success: true };
      }
      
      // Fallback
      const appointments = getStoredAppointments();
      const index = appointments.findIndex(a => a.id === appointmentId);
      if (index === -1) return { success: false, error: 'Appointment not found' };
      
      appointments[index] = {
        ...appointments[index],
        status: 'cancelled',
        cancelledBy,
        cancellationReason: reason,
        updatedAt: now,
      };
      saveAppointments(appointments);
      
      return { success: true };
    } catch (error: any) {
      console.error('[AppointmentService] Cancel error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get available slots for a doctor on a date
   */
  async getAvailableSlots(doctorId: string, chamberId: string, date: string, maxPatients: number = 30): Promise<number[]> {
    try {
      let bookedSerials: number[] = [];
      
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('appointments')
          .select('serial_number')
          .eq('doctor_id', doctorId)
          .eq('chamber_id', chamberId)
          .eq('appointment_date', date)
          .neq('status', 'cancelled');
        
        bookedSerials = (data || []).map(a => a.serial_number);
      } else {
        bookedSerials = getStoredAppointments()
          .filter(a => 
            a.doctorId === doctorId && 
            a.chamberId === chamberId && 
            a.appointmentDate === date &&
            a.status !== 'cancelled'
          )
          .map(a => a.serialNumber);
      }
      
      const bookedSet = new Set(bookedSerials);
      const availableSlots: number[] = [];
      
      for (let i = 1; i <= maxPatients; i++) {
        if (!bookedSet.has(i)) {
          availableSlots.push(i);
        }
      }
      
      return availableSlots;
    } catch (error: any) {
      console.error('[AppointmentService] Get available slots error:', error);
      return [];
    }
  },

  /**
   * Mark appointment as paid
   */
  async markAsPaid(appointmentId: string, paymentMethod: string): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('appointments')
          .update({
            is_paid: true,
            payment_method: paymentMethod,
            updated_at: now,
          })
          .eq('id', appointmentId);
        
        if (error) throw error;
        return { success: true };
      }
      
      // Fallback
      const appointments = getStoredAppointments();
      const index = appointments.findIndex(a => a.id === appointmentId);
      if (index === -1) return { success: false, error: 'Appointment not found' };
      
      appointments[index] = {
        ...appointments[index],
        isPaid: true,
        paymentMethod,
        updatedAt: now,
      };
      saveAppointments(appointments);
      
      return { success: true };
    } catch (error: any) {
      console.error('[AppointmentService] Mark as paid error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<Appointment | null> {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            doctor:doctors(id, specialties, profiles:user_id(name, avatar_url)),
            patient:patients(id, user_id, profiles:user_id(name, phone)),
            chamber:chambers(id, name, address)
          `)
          .eq('id', appointmentId)
          .single();
        
        if (error) throw error;
        return data ? mapSupabaseAppointment(data) : null;
      }
      
      // Fallback
      return getStoredAppointments().find(a => a.id === appointmentId) || null;
    } catch (error: any) {
      console.error('[AppointmentService] Get by ID error:', error);
      return null;
    }
  },

  /**
   * Subscribe to real-time queue updates
   */
  subscribeToQueue(chamberId: string, date: string, callback: (appointments: Appointment[]) => void) {
    if (!isSupabaseConfigured) {
      console.log('[AppointmentService] Supabase not configured, skipping realtime');
      return { unsubscribe: () => {} };
    }
    
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
        async () => {
          // Refetch queue on any change
          const queue = await this.getQueue(chamberId, date);
          callback(queue);
        }
      )
      .subscribe();
    
    return {
      unsubscribe: () => channel.unsubscribe(),
    };
  },
};

export default appointmentService;

