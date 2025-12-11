/**
 * Patient-Doctor Connections Service
 * Handles relationships between patients and their doctors
 */

import { supabase, isSupabaseConfigured } from '../supabaseAuth';

// Types
export interface PatientDoctorConnection {
  id: string;
  patient_id: string;
  doctor_id: string;
  is_favorite: boolean;
  is_primary: boolean;
  first_visit_date: string;
  last_visit_date?: string;
  total_visits: number;
  doctor_notes?: string;
  doctor_notes_date?: string;
  can_message: boolean;
  shared_records: boolean;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  updated_at: string;
  
  // Joined doctor data
  doctors?: {
    id: string;
    profile_id: string;
    specialties: string[];
    qualifications: string[];
    institution: string;
    consultation_fee: number;
    rating: number;
    bio: string;
    profiles?: {
      id: string;
      name: string;
      phone: string;
      email: string;
      avatar_url: string;
    };
  };
}

export interface DoctorConnectionEnriched {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorNameBn?: string;
  doctorSpecialty: string;
  doctorSpecialtyBn?: string;
  doctorImage?: string;
  doctorPhone?: string;
  doctorEmail?: string;
  isFavorite: boolean;
  isPrimary: boolean;
  firstVisitDate: string;
  lastVisitDate: string;
  totalVisits: number;
  upcomingAppointments: number;
  activePrescriptions: number;
  sharedRecords: number;
  doctorNotes?: string;
  lastNotesDate?: string;
  canMessage: boolean;
  unreadMessages?: number;
  chambers: {
    id: string;
    name: string;
    address: string;
    phone?: string;
  }[];
}

export class PatientDoctorConnectionsService {
  /**
   * Get all connections for a patient with enriched data
   */
  static async getPatientConnections(patientId: string): Promise<DoctorConnectionEnriched[]> {
    if (!isSupabaseConfigured()) return [];

    const { data: connections, error } = await supabase
      .from('patient_doctor_connections')
      .select(`
        *,
        doctors (
          id,
          profile_id,
          specialties,
          qualifications,
          institution,
          consultation_fee,
          rating,
          bio,
          profiles (
            id,
            name,
            phone,
            email,
            avatar_url
          )
        )
      `)
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('is_primary', { ascending: false })
      .order('is_favorite', { ascending: false })
      .order('last_visit_date', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      return [];
    }

    if (!connections) return [];

    // Enrich with additional data
    const enrichedConnections: DoctorConnectionEnriched[] = await Promise.all(
      connections.map(async (conn) => {
        const doctorProfile = conn.doctors?.profiles;
        
        // Get upcoming appointments count
        const { count: upcomingCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patientId)
          .eq('doctor_id', conn.doctor_id)
          .gte('scheduled_date', new Date().toISOString().split('T')[0])
          .neq('status', 'cancelled');

        // Get active prescriptions count
        const { count: prescriptionCount } = await supabase
          .from('prescriptions')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patientId)
          .eq('doctor_id', conn.doctor_id)
          .eq('is_active', true);

        // Get shared records count
        const { count: recordsCount } = await supabase
          .from('patient_documents')
          .select('*', { count: 'exact', head: true })
          .eq('patient_id', patientId)
          .eq('doctor_id', conn.doctor_id);

        // Get unread messages count
        let unreadMessages = 0;
        if (conn.can_message) {
          const { count } = await supabase
            .from('patient_messages')
            .select('*', { count: 'exact', head: true })
            .eq('connection_id', conn.id)
            .eq('sender_type', 'doctor')
            .eq('is_read', false);
          unreadMessages = count || 0;
        }

        // Get chambers
        const { data: chambers } = await supabase
          .from('chambers')
          .select('id, name, address, phone')
          .eq('doctor_id', conn.doctor_id);

        return {
          id: conn.id,
          doctorId: conn.doctor_id,
          doctorName: doctorProfile?.name || 'Unknown',
          doctorSpecialty: conn.doctors?.specialties?.[0] || 'General',
          doctorImage: doctorProfile?.avatar_url,
          doctorPhone: doctorProfile?.phone,
          doctorEmail: doctorProfile?.email,
          isFavorite: conn.is_favorite,
          isPrimary: conn.is_primary,
          firstVisitDate: conn.first_visit_date,
          lastVisitDate: conn.last_visit_date || conn.first_visit_date,
          totalVisits: conn.total_visits,
          upcomingAppointments: upcomingCount || 0,
          activePrescriptions: prescriptionCount || 0,
          sharedRecords: recordsCount || 0,
          doctorNotes: conn.doctor_notes,
          lastNotesDate: conn.doctor_notes_date,
          canMessage: conn.can_message,
          unreadMessages,
          chambers: chambers || [],
        };
      })
    );

    return enrichedConnections;
  }

  /**
   * Toggle favorite status
   */
  static async toggleFavorite(connectionId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    // Get current status
    const { data: current } = await supabase
      .from('patient_doctor_connections')
      .select('is_favorite')
      .eq('id', connectionId)
      .single();

    if (!current) return false;

    const { error } = await supabase
      .from('patient_doctor_connections')
      .update({ 
        is_favorite: !current.is_favorite,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }

    return true;
  }

  /**
   * Set as primary doctor
   */
  static async setPrimaryDoctor(patientId: string, doctorId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    // Remove primary from all other doctors
    await supabase
      .from('patient_doctor_connections')
      .update({ is_primary: false })
      .eq('patient_id', patientId);

    // Set this doctor as primary
    const { error } = await supabase
      .from('patient_doctor_connections')
      .update({ 
        is_primary: true,
        updated_at: new Date().toISOString(),
      })
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId);

    if (error) {
      console.error('Error setting primary doctor:', error);
      return false;
    }

    return true;
  }

  /**
   * Remove connection (set to inactive)
   */
  static async removeConnection(connectionId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('patient_doctor_connections')
      .update({ 
        status: 'inactive',
        is_primary: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) {
      console.error('Error removing connection:', error);
      return false;
    }

    return true;
  }

  /**
   * Toggle shared records
   */
  static async toggleSharedRecords(connectionId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { data: current } = await supabase
      .from('patient_doctor_connections')
      .select('shared_records')
      .eq('id', connectionId)
      .single();

    if (!current) return false;

    const { error } = await supabase
      .from('patient_doctor_connections')
      .update({ 
        shared_records: !current.shared_records,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) {
      console.error('Error toggling shared records:', error);
      return false;
    }

    return true;
  }

  /**
   * Get primary doctor for a patient
   */
  static async getPrimaryDoctor(patientId: string): Promise<DoctorConnectionEnriched | null> {
    if (!isSupabaseConfigured()) return null;

    const connections = await this.getPatientConnections(patientId);
    return connections.find(c => c.isPrimary) || null;
  }

  /**
   * Get favorite doctors for a patient
   */
  static async getFavoriteDoctors(patientId: string): Promise<DoctorConnectionEnriched[]> {
    if (!isSupabaseConfigured()) return [];

    const connections = await this.getPatientConnections(patientId);
    return connections.filter(c => c.isFavorite);
  }

  /**
   * Check if patient has connection with doctor
   */
  static async hasConnection(patientId: string, doctorId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { count } = await supabase
      .from('patient_doctor_connections')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .eq('status', 'active');

    return (count || 0) > 0;
  }
}

export default PatientDoctorConnectionsService;

