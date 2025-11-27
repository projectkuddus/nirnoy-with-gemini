import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type HealthRecord = Database['public']['Tables']['health_records']['Row'];
type HealthRecordInsert = Database['public']['Tables']['health_records']['Insert'];

export class HealthRecordService {
  /**
   * Create health record
   */
  static async create(record: HealthRecordInsert): Promise<HealthRecord | null> {
    const { data, error } = await supabase
      .from('health_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error creating health record:', error);
      return null;
    }

    return data;
  }

  /**
   * Get patient health records with filters
   */
  static async getByPatient(
    patientId: string,
    filters?: {
      recordType?: HealthRecord['record_type'];
      bodyRegion?: string;
      severity?: HealthRecord['severity'];
      limit?: number;
      offset?: number;
    }
  ) {
    let query = supabase
      .from('health_records')
      .select('*, doctors(*), appointments(*)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (filters?.recordType) {
      query = query.eq('record_type', filters.recordType);
    }

    if (filters?.bodyRegion) {
      query = query.eq('body_region', filters.bodyRegion);
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    query = query
      .limit(filters?.limit || 100)
      .range(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 100) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching health records:', error);
      return [];
    }

    return data;
  }

  /**
   * Get health records by body region (for body map visualization)
   */
  static async getByBodyRegion(patientId: string) {
    const { data, error } = await supabase
      .from('health_records')
      .select('body_region, severity, record_type, created_at')
      .eq('patient_id', patientId)
      .not('body_region', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching body region records:', error);
      return [];
    }

    // Group by body region
    const grouped = data.reduce((acc, record) => {
      const region = record.body_region || 'unknown';
      if (!acc[region]) {
        acc[region] = [];
      }
      acc[region].push(record);
      return acc;
    }, {} as Record<string, typeof data>);

    return grouped;
  }

  /**
   * Get health trends over time
   */
  static async getHealthTrends(patientId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('health_records')
      .select('record_type, severity, created_at')
      .eq('patient_id', patientId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching health trends:', error);
      return [];
    }

    return data;
  }
}

