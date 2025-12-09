import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

type Insight = Database['public']['Tables']['ai_insights']['Row'];
type InsightInsert = Database['public']['Tables']['ai_insights']['Insert'];

export class AIInsightService {
  /**
   * Create AI insight
   */
  static async create(insight: InsightInsert): Promise<Insight | null> {
    const { data, error } = await supabase
      .from('ai_insights')
      .insert(insight)
      .select()
      .single();

    if (error) {
      console.error('Error creating insight:', error);
      return null;
    }

    return data;
  }

  /**
   * Get insights for patient
   */
  static async getByPatient(patientId: string, limit = 50) {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching patient insights:', error);
      return [];
    }

    return data;
  }

  /**
   * Get location-based health insights (for pandemic prediction, regional health trends)
   */
  static async getByLocation(
    location: string,
    insightType?: Insight['insight_type'],
    days = 30
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from('ai_insights')
      .select('*')
      .eq('location', location)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (insightType) {
      query = query.eq('insight_type', insightType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching location insights:', error);
      return [];
    }

    return data;
  }

  /**
   * Get critical insights (high severity)
   */
  static async getCritical(limit = 20) {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .in('severity', ['high', 'critical'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching critical insights:', error);
      return [];
    }

    return data;
  }

  /**
   * Get pandemic alerts
   */
  static async getPandemicAlerts(location?: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from('ai_insights')
      .select('*')
      .eq('insight_type', 'pandemic_alert')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (location) {
      query = query.eq('location', location);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching pandemic alerts:', error);
      return [];
    }

    return data;
  }
}

