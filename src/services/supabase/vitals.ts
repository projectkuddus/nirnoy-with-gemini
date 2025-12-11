/**
 * Vital Signs Service
 * Handles patient vital sign tracking and history
 */

import { supabase, isSupabaseConfigured } from '../supabaseAuth';

// Types
export interface VitalSign {
  id: string;
  patient_id: string;
  vital_type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'blood_sugar' | 'weight' | 'spo2' | 'respiratory_rate' | 'height';
  value: number;
  secondary_value?: number;
  unit: string;
  measured_at: string;
  source: 'manual' | 'device' | 'lab' | 'doctor';
  notes?: string;
  recorded_by?: string;
  appointment_id?: string;
  created_at: string;
}

export interface VitalSignInsert {
  patient_id: string;
  vital_type: VitalSign['vital_type'];
  value: number;
  secondary_value?: number;
  unit: string;
  measured_at?: string;
  source?: VitalSign['source'];
  notes?: string;
  recorded_by?: string;
  appointment_id?: string;
}

// Normal ranges for vitals
export const VITAL_NORMAL_RANGES: Record<VitalSign['vital_type'], { min: number; max: number; unit: string }> = {
  blood_pressure: { min: 90, max: 120, unit: 'mmHg (systolic)' },
  heart_rate: { min: 60, max: 100, unit: 'bpm' },
  temperature: { min: 97, max: 99, unit: '°F' },
  blood_sugar: { min: 70, max: 100, unit: 'mg/dL (fasting)' },
  weight: { min: 0, max: 999, unit: 'kg' },
  spo2: { min: 95, max: 100, unit: '%' },
  respiratory_rate: { min: 12, max: 20, unit: 'breaths/min' },
  height: { min: 0, max: 300, unit: 'cm' },
};

export class VitalsService {
  /**
   * Add a new vital sign record
   */
  static async addVital(vital: VitalSignInsert): Promise<VitalSign | null> {
    if (!isSupabaseConfigured()) {
      console.error('Supabase not configured');
      return null;
    }

    const { data, error } = await supabase
      .from('vital_signs')
      .insert({
        ...vital,
        measured_at: vital.measured_at || new Date().toISOString(),
        source: vital.source || 'manual',
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding vital:', error);
      return null;
    }

    return data;
  }

  /**
   * Get patient's vital history
   */
  static async getPatientVitals(
    patientId: string,
    options?: {
      type?: VitalSign['vital_type'];
      limit?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<VitalSign[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('vital_signs')
      .select('*')
      .eq('patient_id', patientId)
      .order('measured_at', { ascending: false });

    if (options?.type) {
      query = query.eq('vital_type', options.type);
    }

    if (options?.startDate) {
      query = query.gte('measured_at', options.startDate);
    }

    if (options?.endDate) {
      query = query.lte('measured_at', options.endDate);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vitals:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get latest vital for each type
   */
  static async getLatestVitals(patientId: string): Promise<Record<string, VitalSign>> {
    if (!isSupabaseConfigured()) return {};

    const vitalTypes: VitalSign['vital_type'][] = [
      'blood_pressure', 'heart_rate', 'temperature', 'blood_sugar', 
      'weight', 'spo2', 'respiratory_rate'
    ];

    const latestVitals: Record<string, VitalSign> = {};

    // Fetch latest of each type in parallel
    const promises = vitalTypes.map(async (type) => {
      const { data } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', patientId)
        .eq('vital_type', type)
        .order('measured_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        latestVitals[type] = data;
      }
    });

    await Promise.all(promises);
    return latestVitals;
  }

  /**
   * Get vital trends for a specific type
   */
  static async getVitalTrend(
    patientId: string,
    vitalType: VitalSign['vital_type'],
    days: number = 30
  ): Promise<VitalSign[]> {
    if (!isSupabaseConfigured()) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('patient_id', patientId)
      .eq('vital_type', vitalType)
      .gte('measured_at', startDate.toISOString())
      .order('measured_at', { ascending: true });

    if (error) {
      console.error('Error fetching vital trend:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if vital is within normal range
   */
  static isNormal(vitalType: VitalSign['vital_type'], value: number): boolean {
    const range = VITAL_NORMAL_RANGES[vitalType];
    if (!range) return true;
    return value >= range.min && value <= range.max;
  }

  /**
   * Get vital status (low, normal, high)
   */
  static getVitalStatus(vitalType: VitalSign['vital_type'], value: number): 'low' | 'normal' | 'high' {
    const range = VITAL_NORMAL_RANGES[vitalType];
    if (!range) return 'normal';
    
    if (value < range.min) return 'low';
    if (value > range.max) return 'high';
    return 'normal';
  }

  /**
   * Delete a vital record
   */
  static async deleteVital(vitalId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('vital_signs')
      .delete()
      .eq('id', vitalId);

    if (error) {
      console.error('Error deleting vital:', error);
      return false;
    }

    return true;
  }
}

export default VitalsService;

