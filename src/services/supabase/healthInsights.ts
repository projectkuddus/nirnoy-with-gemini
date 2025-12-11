/**
 * Health Insights Service
 * AI-generated personalized health insights for patients
 * Uses Gemini 3 Pro for intelligent health analysis
 */

import { supabase, isSupabaseConfigured } from '../supabaseAuth';

// Types
export interface HealthInsight {
  id: string;
  patient_id: string;
  insight_type: 'info' | 'warning' | 'success' | 'alert';
  category: 'general' | 'vitals' | 'medication' | 'lifestyle' | 'appointment' | 'diet' | 'exercise';
  title: string;
  title_bn?: string;
  description: string;
  description_bn?: string;
  action_label?: string;
  action_label_bn?: string;
  action_url?: string;
  priority: number;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at?: string;
  created_at: string;
}

export interface HealthInsightInput {
  patient_id: string;
  insight_type: 'info' | 'warning' | 'success' | 'alert';
  category: 'general' | 'vitals' | 'medication' | 'lifestyle' | 'appointment' | 'diet' | 'exercise';
  title: string;
  title_bn?: string;
  description: string;
  description_bn?: string;
  action_label?: string;
  action_label_bn?: string;
  action_url?: string;
  priority?: number;
  expires_at?: string;
}

// Insight templates for common scenarios
export const INSIGHT_TEMPLATES = {
  vitals: {
    high_bp: {
      insight_type: 'warning' as const,
      category: 'vitals' as const,
      title: 'High Blood Pressure Detected',
      title_bn: 'উচ্চ রক্তচাপ সনাক্ত হয়েছে',
      description: 'Your recent blood pressure readings show elevated levels. Consider reducing salt intake and consulting your doctor.',
      description_bn: 'আপনার সাম্প্রতিক রক্তচাপ উচ্চ মাত্রায় রয়েছে। লবণ খাওয়া কমান এবং ডাক্তারের পরামর্শ নিন।',
      action_label: 'Find Cardiologist',
      action_label_bn: 'হৃদরোগ বিশেষজ্ঞ খুঁজুন',
      action_url: '/doctors?specialty=Cardiology',
      priority: 80,
    },
    low_bp: {
      insight_type: 'warning' as const,
      category: 'vitals' as const,
      title: 'Low Blood Pressure Detected',
      title_bn: 'নিম্ন রক্তচাপ সনাক্ত হয়েছে',
      description: 'Your recent blood pressure readings are below normal. Stay hydrated and avoid standing up quickly.',
      description_bn: 'আপনার সাম্প্রতিক রক্তচাপ স্বাভাবিকের নিচে। পর্যাপ্ত পানি পান করুন এবং দ্রুত উঠে দাঁড়ানো এড়িয়ে চলুন।',
      priority: 70,
    },
    high_sugar: {
      insight_type: 'alert' as const,
      category: 'vitals' as const,
      title: 'Blood Sugar Level High',
      title_bn: 'রক্তে শর্করার মাত্রা বেশি',
      description: 'Your blood sugar is above normal range. Monitor your diet and consult with a diabetologist.',
      description_bn: 'আপনার রক্তে শর্করার মাত্রা স্বাভাবিকের উপরে। খাদ্যাভ্যাস পর্যবেক্ষণ করুন এবং ডায়াবেটিস বিশেষজ্ঞের পরামর্শ নিন।',
      action_label: 'Find Diabetologist',
      action_label_bn: 'ডায়াবেটিস বিশেষজ্ঞ খুঁজুন',
      action_url: '/doctors?specialty=Endocrinology',
      priority: 90,
    },
    weight_gain: {
      insight_type: 'info' as const,
      category: 'vitals' as const,
      title: 'Weight Increase Noticed',
      title_bn: 'ওজন বৃদ্ধি লক্ষ্য করা গেছে',
      description: 'Your weight has increased over the past month. Consider reviewing your diet and exercise routine.',
      description_bn: 'গত মাসে আপনার ওজন বৃদ্ধি পেয়েছে। আপনার খাদ্যাভ্যাস এবং ব্যায়াম পর্যালোচনা করুন।',
      priority: 40,
    },
  },
  medication: {
    missed_dose: {
      insight_type: 'warning' as const,
      category: 'medication' as const,
      title: 'Medication Dose Missed',
      title_bn: 'ওষুধের ডোজ মিস হয়েছে',
      description: 'You missed taking your medication today. Maintain regular dosing for best results.',
      description_bn: 'আজ আপনার ওষুধ খাওয়া মিস হয়েছে। সেরা ফলাফলের জন্য নিয়মিত ওষুধ সেবন করুন।',
      action_label: 'Set Reminder',
      action_label_bn: 'রিমাইন্ডার সেট করুন',
      action_url: '/patient-dashboard?tab=medication',
      priority: 60,
    },
    refill_needed: {
      insight_type: 'info' as const,
      category: 'medication' as const,
      title: 'Medicine Refill Reminder',
      title_bn: 'ওষুধ রিফিল করার সময়',
      description: 'Your medication supply is running low. Order refill soon to avoid running out.',
      description_bn: 'আপনার ওষুধের মজুত শেষ হয়ে আসছে। শেষ হওয়ার আগে রিফিল করুন।',
      priority: 50,
    },
  },
  appointment: {
    upcoming: {
      insight_type: 'info' as const,
      category: 'appointment' as const,
      title: 'Upcoming Appointment Reminder',
      title_bn: 'আসন্ন অ্যাপয়েন্টমেন্ট',
      description: 'You have a doctor appointment scheduled soon. Prepare any questions you want to discuss.',
      description_bn: 'শীঘ্রই আপনার ডাক্তারের অ্যাপয়েন্টমেন্ট আছে। আলোচনার জন্য প্রশ্ন প্রস্তুত রাখুন।',
      action_label: 'View Appointments',
      action_label_bn: 'অ্যাপয়েন্টমেন্ট দেখুন',
      action_url: '/patient-dashboard?tab=appointments',
      priority: 55,
    },
    follow_up_due: {
      insight_type: 'warning' as const,
      category: 'appointment' as const,
      title: 'Follow-up Visit Due',
      title_bn: 'ফলো-আপ ভিজিট বাকি',
      description: 'Your follow-up visit date has passed. Schedule an appointment with your doctor.',
      description_bn: 'আপনার ফলো-আপ ভিজিটের তারিখ পার হয়ে গেছে। ডাক্তারের সাথে অ্যাপয়েন্টমেন্ট নিন।',
      action_label: 'Book Now',
      action_label_bn: 'এখনই বুক করুন',
      action_url: '/doctors',
      priority: 65,
    },
  },
  lifestyle: {
    exercise_goal: {
      insight_type: 'success' as const,
      category: 'lifestyle' as const,
      title: 'Exercise Goal Achieved!',
      title_bn: 'ব্যায়ামের লক্ষ্য অর্জিত!',
      description: 'Great job! You achieved your weekly exercise goal. Keep up the good work!',
      description_bn: 'চমৎকার! আপনি সাপ্তাহিক ব্যায়ামের লক্ষ্য পূরণ করেছেন। এভাবে চালিয়ে যান!',
      priority: 30,
    },
    hydration: {
      insight_type: 'info' as const,
      category: 'lifestyle' as const,
      title: 'Stay Hydrated',
      title_bn: 'পর্যাপ্ত পানি পান করুন',
      description: 'Remember to drink at least 8 glasses of water daily for optimal health.',
      description_bn: 'সুস্বাস্থ্যের জন্য প্রতিদিন কমপক্ষে ৮ গ্লাস পানি পান করুন।',
      priority: 20,
    },
  },
  general: {
    profile_incomplete: {
      insight_type: 'info' as const,
      category: 'general' as const,
      title: 'Complete Your Profile',
      title_bn: 'প্রোফাইল সম্পূর্ণ করুন',
      description: 'Adding more health information helps us provide better personalized recommendations.',
      description_bn: 'আরও স্বাস্থ্য তথ্য যোগ করলে আমরা আপনাকে আরও ভালো পরামর্শ দিতে পারব।',
      action_label: 'Update Profile',
      action_label_bn: 'প্রোফাইল আপডেট করুন',
      action_url: '/patient-dashboard?tab=profile',
      priority: 25,
    },
    health_checkup: {
      insight_type: 'info' as const,
      category: 'general' as const,
      title: 'Annual Health Checkup Reminder',
      title_bn: 'বার্ষিক স্বাস্থ্য পরীক্ষার সময়',
      description: 'It has been over a year since your last comprehensive health checkup. Schedule one soon.',
      description_bn: 'আপনার শেষ সম্পূর্ণ স্বাস্থ্য পরীক্ষার এক বছর পার হয়েছে। শীঘ্রই পরীক্ষা করুন।',
      action_label: 'Find Doctor',
      action_label_bn: 'ডাক্তার খুঁজুন',
      action_url: '/doctors?specialty=Medicine',
      priority: 35,
    },
  },
};

export class HealthInsightsService {
  /**
   * Get insights for a patient
   */
  static async getPatientInsights(
    patientId: string,
    options?: {
      unreadOnly?: boolean;
      categories?: string[];
      limit?: number;
    }
  ): Promise<HealthInsight[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('health_insights')
      .select('*')
      .eq('patient_id', patientId)
      .eq('is_dismissed', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (options?.categories && options.categories.length > 0) {
      query = query.in('category', options.categories);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching insights:', error);
      return [];
    }

    // Filter out expired insights
    const now = new Date();
    return (data || []).filter(insight => 
      !insight.expires_at || new Date(insight.expires_at) > now
    );
  }

  /**
   * Create a new insight
   */
  static async createInsight(input: HealthInsightInput): Promise<HealthInsight | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('health_insights')
      .insert({
        ...input,
        priority: input.priority ?? 50,
        is_read: false,
        is_dismissed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating insight:', error);
      return null;
    }

    return data;
  }

  /**
   * Create insight from template
   */
  static async createFromTemplate(
    patientId: string,
    category: keyof typeof INSIGHT_TEMPLATES,
    templateKey: string,
    customizations?: Partial<HealthInsightInput>
  ): Promise<HealthInsight | null> {
    const categoryTemplates = INSIGHT_TEMPLATES[category];
    const template = (categoryTemplates as any)[templateKey];
    
    if (!template) {
      console.error(`Template not found: ${category}.${templateKey}`);
      return null;
    }

    return this.createInsight({
      patient_id: patientId,
      ...template,
      ...customizations,
    });
  }

  /**
   * Mark insight as read
   */
  static async markAsRead(insightId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('health_insights')
      .update({ is_read: true })
      .eq('id', insightId);

    if (error) {
      console.error('Error marking insight as read:', error);
      return false;
    }

    return true;
  }

  /**
   * Mark all insights as read for patient
   */
  static async markAllAsRead(patientId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('health_insights')
      .update({ is_read: true })
      .eq('patient_id', patientId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all insights as read:', error);
      return false;
    }

    return true;
  }

  /**
   * Dismiss an insight
   */
  static async dismissInsight(insightId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const { error } = await supabase
      .from('health_insights')
      .update({ is_dismissed: true })
      .eq('id', insightId);

    if (error) {
      console.error('Error dismissing insight:', error);
      return false;
    }

    return true;
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(patientId: string): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    const { count, error } = await supabase
      .from('health_insights')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('is_read', false)
      .eq('is_dismissed', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Generate insights based on patient data
   * This is called periodically or when new data is recorded
   */
  static async generateInsightsForPatient(
    patientId: string,
    context: {
      vitals?: any[];
      goals?: any[];
      appointments?: any[];
      prescriptions?: any[];
      profile?: any;
    }
  ): Promise<HealthInsight[]> {
    const generatedInsights: HealthInsight[] = [];

    // Analyze vitals for anomalies
    if (context.vitals && context.vitals.length > 0) {
      const latestBP = context.vitals.find(v => v.vital_type === 'blood_pressure');
      if (latestBP) {
        const systolic = latestBP.value;
        const diastolic = latestBP.secondary_value;
        
        if (systolic > 140 || diastolic > 90) {
          const insight = await this.createFromTemplate(patientId, 'vitals', 'high_bp');
          if (insight) generatedInsights.push(insight);
        } else if (systolic < 90 || diastolic < 60) {
          const insight = await this.createFromTemplate(patientId, 'vitals', 'low_bp');
          if (insight) generatedInsights.push(insight);
        }
      }

      const latestSugar = context.vitals.find(v => v.vital_type === 'blood_sugar');
      if (latestSugar && latestSugar.value > 200) {
        const insight = await this.createFromTemplate(patientId, 'vitals', 'high_sugar');
        if (insight) generatedInsights.push(insight);
      }
    }

    // Check for upcoming appointments
    if (context.appointments && context.appointments.length > 0) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const upcomingTomorrow = context.appointments.find(a => {
        const aptDate = new Date(a.scheduled_date);
        return aptDate.toDateString() === tomorrow.toDateString();
      });

      if (upcomingTomorrow) {
        const insight = await this.createFromTemplate(patientId, 'appointment', 'upcoming', {
          description: `You have an appointment with Dr. ${upcomingTomorrow.doctor_name || 'your doctor'} tomorrow.`,
          description_bn: `আগামীকাল Dr. ${upcomingTomorrow.doctor_name || 'আপনার ডাক্তার'} এর সাথে আপনার অ্যাপয়েন্টমেন্ট আছে।`,
        });
        if (insight) generatedInsights.push(insight);
      }
    }

    // Check for follow-up reminders from prescriptions
    if (context.prescriptions && context.prescriptions.length > 0) {
      const overduePrescriptions = context.prescriptions.filter(p => {
        if (!p.follow_up_date) return false;
        const followUpDate = new Date(p.follow_up_date);
        return followUpDate < new Date() && p.is_active;
      });

      if (overduePrescriptions.length > 0) {
        const insight = await this.createFromTemplate(patientId, 'appointment', 'follow_up_due');
        if (insight) generatedInsights.push(insight);
      }
    }

    // Check profile completeness
    if (context.profile) {
      const missingFields = [];
      if (!context.profile.dateOfBirth) missingFields.push('date of birth');
      if (!context.profile.bloodGroup) missingFields.push('blood group');
      if (!context.profile.emergencyContactPhone) missingFields.push('emergency contact');
      if (!context.profile.heightCm || !context.profile.weightKg) missingFields.push('height/weight');

      if (missingFields.length >= 2) {
        const insight = await this.createFromTemplate(patientId, 'general', 'profile_incomplete', {
          description: `Your profile is missing: ${missingFields.join(', ')}. Complete it for better health recommendations.`,
          description_bn: `আপনার প্রোফাইলে নেই: ${missingFields.join(', ')}। ভালো স্বাস্থ্য পরামর্শের জন্য সম্পূর্ণ করুন।`,
        });
        if (insight) generatedInsights.push(insight);
      }
    }

    // Check for goal achievements
    if (context.goals && context.goals.length > 0) {
      const achievedGoals = context.goals.filter(g => 
        g.is_active && g.current_value >= g.target_value
      );

      for (const goal of achievedGoals) {
        const insight = await this.createInsight({
          patient_id: patientId,
          insight_type: 'success',
          category: 'lifestyle',
          title: `Goal Achieved: ${goal.title}`,
          title_bn: `লক্ষ্য অর্জিত: ${goal.title_bn || goal.title}`,
          description: `Congratulations! You've achieved your ${goal.goal_type} goal!`,
          description_bn: `অভিনন্দন! আপনি ${goal.goal_type} লক্ষ্য অর্জন করেছেন!`,
          priority: 35,
        });
        if (insight) generatedInsights.push(insight);
      }
    }

    return generatedInsights;
  }

  /**
   * Delete expired insights (cleanup)
   */
  static async cleanupExpiredInsights(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    const { data, error } = await supabase
      .from('health_insights')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Error cleaning up insights:', error);
      return 0;
    }

    return data?.length || 0;
  }
}

export default HealthInsightsService;

