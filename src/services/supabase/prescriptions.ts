/**
 * Prescriptions Service
 * Handles prescription management and medicine tracking
 */

import { supabase, isSupabaseConfigured } from '../supabaseAuth';

// Types
export interface PrescribedMedicine {
  id: string;
  name: string;
  generic_name?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instruction?: string;
  instruction_bn?: string;
  times_per_day: number;
  time_slots?: string[];
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  diagnosis?: string;
  diagnosis_bn?: string;
  medicines: PrescribedMedicine[];
  advice: string[];
  follow_up_date?: string;
  duration_days?: number;
  pdf_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Joined data
  doctors?: {
    id: string;
    profile_id: string;
    specialties: string[];
    profiles?: {
      name: string;
      avatar_url: string;
    };
  };
}

export interface PrescriptionEnriched {
  id: string;
  appointmentId?: string;
  doctorId: string;
  doctorName: string;
  doctorNameBn?: string;
  doctorSpecialty: string;
  doctorImage?: string;
  chamberName?: string;
  date: string;
  diagnosis?: string;
  diagnosisBn?: string;
  medicines: {
    id: string;
    name: string;
    genericName?: string;
    dosage: string;
    frequency: string;
    duration: string;
    instruction?: string;
    instructionBn?: string;
    remainingDays?: number;
    startDate?: string;
    endDate?: string;
    reminder?: boolean;
    reminderTimes?: string[];
  }[];
  advice?: string[];
  followUpDate?: string;
  fileUrl?: string;
  isActive: boolean;
}

export class PrescriptionsService {
  /**
   * Get patient's prescriptions
   */
  static async getPatientPrescriptions(
    patientId: string,
    options?: {
      activeOnly?: boolean;
      doctorId?: string;
      limit?: number;
    }
  ): Promise<PrescriptionEnriched[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('prescriptions')
      .select(`
        *,
        doctors (
          id,
          profile_id,
          specialties,
          profiles (
            name,
            avatar_url
          )
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (options?.activeOnly) {
      query = query.eq('is_active', true);
    }

    if (options?.doctorId) {
      query = query.eq('doctor_id', options.doctorId);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching prescriptions:', error);
      return [];
    }

    return (data || []).map(this.enrichPrescription);
  }

  /**
   * Enrich prescription with calculated fields
   */
  static enrichPrescription(prescription: Prescription): PrescriptionEnriched {
    const today = new Date();
    
    return {
      id: prescription.id,
      appointmentId: prescription.appointment_id,
      doctorId: prescription.doctor_id,
      doctorName: prescription.doctors?.profiles?.name || 'Unknown',
      doctorSpecialty: prescription.doctors?.specialties?.[0] || 'General',
      doctorImage: prescription.doctors?.profiles?.avatar_url,
      date: prescription.created_at,
      diagnosis: prescription.diagnosis,
      diagnosisBn: prescription.diagnosis_bn,
      medicines: (prescription.medicines || []).map(med => {
        // Calculate remaining days
        let remainingDays: number | undefined;
        if (med.end_date) {
          const endDate = new Date(med.end_date);
          remainingDays = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        } else if (med.start_date && med.duration) {
          const startDate = new Date(med.start_date);
          const durationDays = parseInt(med.duration) || 0;
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + durationDays);
          remainingDays = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        }

        return {
          id: med.id,
          name: med.name,
          genericName: med.generic_name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instruction: med.instruction,
          instructionBn: med.instruction_bn,
          remainingDays,
          startDate: med.start_date,
          endDate: med.end_date,
          reminder: false, // TODO: Fetch from medications table
          reminderTimes: med.time_slots,
        };
      }),
      advice: prescription.advice || [],
      followUpDate: prescription.follow_up_date,
      fileUrl: prescription.pdf_url,
      isActive: prescription.is_active,
    };
  }

  /**
   * Get active medicines across all prescriptions
   */
  static async getActiveMedicines(patientId: string): Promise<PrescribedMedicine[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('prescriptions')
      .select('medicines')
      .eq('patient_id', patientId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching active medicines:', error);
      return [];
    }

    const allMedicines: PrescribedMedicine[] = [];
    const today = new Date();

    data?.forEach(prescription => {
      (prescription.medicines as PrescribedMedicine[] || []).forEach(med => {
        // Check if medicine is still active
        if (med.end_date) {
          const endDate = new Date(med.end_date);
          if (endDate < today) return;
        }
        
        allMedicines.push(med);
      });
    });

    return allMedicines;
  }

  /**
   * Mark prescription as completed
   */
  static async markComplete(prescriptionId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('prescriptions')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prescriptionId);

    if (error) {
      console.error('Error marking prescription complete:', error);
      return false;
    }

    return true;
  }

  /**
   * Get prescription by ID
   */
  static async getPrescriptionById(prescriptionId: string): Promise<PrescriptionEnriched | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        doctors (
          id,
          profile_id,
          specialties,
          profiles (
            name,
            avatar_url
          )
        )
      `)
      .eq('id', prescriptionId)
      .single();

    if (error) {
      console.error('Error fetching prescription:', error);
      return null;
    }

    return data ? this.enrichPrescription(data) : null;
  }

  /**
   * Get prescriptions needing follow-up
   */
  static async getUpcomingFollowUps(
    patientId: string,
    days: number = 7
  ): Promise<PrescriptionEnriched[]> {
    if (!isSupabaseConfigured()) return [];

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        doctors (
          id,
          profile_id,
          specialties,
          profiles (
            name,
            avatar_url
          )
        )
      `)
      .eq('patient_id', patientId)
      .not('follow_up_date', 'is', null)
      .gte('follow_up_date', today.toISOString().split('T')[0])
      .lte('follow_up_date', futureDate.toISOString().split('T')[0])
      .order('follow_up_date', { ascending: true });

    if (error) {
      console.error('Error fetching follow-ups:', error);
      return [];
    }

    return (data || []).map(this.enrichPrescription);
  }

  /**
   * Get medicines running low (< 3 days remaining)
   */
  static async getMedicinesNeedingRefill(patientId: string): Promise<PrescribedMedicine[]> {
    const activeMedicines = await this.getActiveMedicines(patientId);
    const today = new Date();

    return activeMedicines.filter(med => {
      if (!med.end_date && !med.start_date) return false;
      
      let endDate: Date;
      if (med.end_date) {
        endDate = new Date(med.end_date);
      } else if (med.start_date) {
        const startDate = new Date(med.start_date);
        const durationDays = parseInt(med.duration) || 0;
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + durationDays);
      } else {
        return false;
      }

      const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return remainingDays <= 3 && remainingDays >= 0;
    });
  }
}

export default PrescriptionsService;

