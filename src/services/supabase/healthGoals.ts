/**
 * Health Goals Service
 * Handles patient health goals and progress tracking
 */

import { supabase, isSupabaseConfigured } from '../supabaseAuth';

// Types
export interface HealthGoal {
  id: string;
  patient_id: string;
  goal_type: 'weight' | 'steps' | 'water' | 'sleep' | 'exercise' | 'medication' | 'custom';
  title: string;
  title_bn?: string;
  description?: string;
  target_value: number;
  current_value: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date?: string;
  streak_count: number;
  best_streak: number;
  last_updated_at: string;
  is_active: boolean;
  is_completed: boolean;
  created_at: string;
}

export interface HealthGoalInsert {
  patient_id: string;
  goal_type: HealthGoal['goal_type'];
  title: string;
  title_bn?: string;
  description?: string;
  target_value: number;
  unit: string;
  frequency?: HealthGoal['frequency'];
  start_date?: string;
  end_date?: string;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  patient_id: string;
  progress_date: string;
  value: number;
  notes?: string;
  created_at: string;
}

// Preset goal templates
export const GOAL_TEMPLATES: Record<HealthGoal['goal_type'], { title: string; title_bn: string; unit: string; defaultTarget: number }> = {
  weight: { title: 'Weight Loss', title_bn: 'ওজন কমানো', unit: 'kg', defaultTarget: 5 },
  steps: { title: 'Daily Steps', title_bn: 'দৈনিক পদক্ষেপ', unit: 'steps', defaultTarget: 10000 },
  water: { title: 'Water Intake', title_bn: 'পানি পান', unit: 'glasses', defaultTarget: 8 },
  sleep: { title: 'Sleep Hours', title_bn: 'ঘুম', unit: 'hours', defaultTarget: 8 },
  exercise: { title: 'Exercise', title_bn: 'ব্যায়াম', unit: 'minutes', defaultTarget: 30 },
  medication: { title: 'Medication Adherence', title_bn: 'ওষুধ খাওয়া', unit: '%', defaultTarget: 100 },
  custom: { title: 'Custom Goal', title_bn: 'নিজস্ব লক্ষ্য', unit: '', defaultTarget: 0 },
};

export class HealthGoalsService {
  /**
   * Create a new health goal
   */
  static async createGoal(goal: HealthGoalInsert): Promise<HealthGoal | null> {
    if (!isSupabaseConfigured()) {
      console.error('Supabase not configured');
      return null;
    }

    const template = GOAL_TEMPLATES[goal.goal_type];

    const { data, error } = await supabase
      .from('health_goals')
      .insert({
        ...goal,
        title: goal.title || template.title,
        title_bn: goal.title_bn || template.title_bn,
        current_value: 0,
        streak_count: 0,
        best_streak: 0,
        start_date: goal.start_date || new Date().toISOString().split('T')[0],
        frequency: goal.frequency || 'daily',
        is_active: true,
        is_completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return null;
    }

    return data;
  }

  /**
   * Get patient's active goals
   */
  static async getPatientGoals(
    patientId: string,
    options?: {
      activeOnly?: boolean;
      goalType?: HealthGoal['goal_type'];
    }
  ): Promise<HealthGoal[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('health_goals')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (options?.activeOnly !== false) {
      query = query.eq('is_active', true);
    }

    if (options?.goalType) {
      query = query.eq('goal_type', options.goalType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching goals:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update goal progress
   */
  static async updateProgress(
    goalId: string,
    patientId: string,
    value: number,
    notes?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const today = new Date().toISOString().split('T')[0];

    // Upsert progress for today
    const { error: progressError } = await supabase
      .from('goal_progress')
      .upsert({
        goal_id: goalId,
        patient_id: patientId,
        progress_date: today,
        value,
        notes,
      }, {
        onConflict: 'goal_id,progress_date',
      });

    if (progressError) {
      console.error('Error updating progress:', progressError);
      return false;
    }

    // Update goal's current value and streak
    const { data: goal } = await supabase
      .from('health_goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (goal) {
      // Calculate new current value based on goal type
      let newCurrentValue = value;
      if (goal.frequency === 'daily') {
        // For daily goals, sum up progress
        const { data: progress } = await supabase
          .from('goal_progress')
          .select('value')
          .eq('goal_id', goalId)
          .order('progress_date', { ascending: false })
          .limit(7);

        if (progress) {
          newCurrentValue = progress.reduce((sum, p) => sum + p.value, 0) / progress.length;
        }
      }

      // Calculate streak
      const { data: recentProgress } = await supabase
        .from('goal_progress')
        .select('progress_date, value')
        .eq('goal_id', goalId)
        .order('progress_date', { ascending: false })
        .limit(30);

      let streak = 0;
      if (recentProgress && recentProgress.length > 0) {
        const sortedProgress = recentProgress.sort((a, b) => 
          new Date(b.progress_date).getTime() - new Date(a.progress_date).getTime()
        );
        
        // Check consecutive days
        let checkDate = new Date();
        for (const p of sortedProgress) {
          const progressDate = new Date(p.progress_date);
          const dayDiff = Math.floor((checkDate.getTime() - progressDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (dayDiff <= 1 && p.value >= goal.target_value) {
            streak++;
            checkDate = progressDate;
          } else {
            break;
          }
        }
      }

      // Update goal
      const isCompleted = newCurrentValue >= goal.target_value;
      await supabase
        .from('health_goals')
        .update({
          current_value: newCurrentValue,
          streak_count: streak,
          best_streak: Math.max(streak, goal.best_streak),
          last_updated_at: new Date().toISOString(),
          is_completed: isCompleted,
        })
        .eq('id', goalId);
    }

    return true;
  }

  /**
   * Get goal progress history
   */
  static async getGoalProgress(
    goalId: string,
    days: number = 30
  ): Promise<GoalProgress[]> {
    if (!isSupabaseConfigured()) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('goal_progress')
      .select('*')
      .eq('goal_id', goalId)
      .gte('progress_date', startDate.toISOString().split('T')[0])
      .order('progress_date', { ascending: true });

    if (error) {
      console.error('Error fetching goal progress:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Calculate goal completion percentage
   */
  static calculateProgress(goal: HealthGoal): number {
    if (goal.target_value === 0) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  }

  /**
   * Deactivate a goal
   */
  static async deactivateGoal(goalId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('health_goals')
      .update({ is_active: false })
      .eq('id', goalId);

    if (error) {
      console.error('Error deactivating goal:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(goalId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('health_goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      console.error('Error deleting goal:', error);
      return false;
    }

    return true;
  }
}

export default HealthGoalsService;

