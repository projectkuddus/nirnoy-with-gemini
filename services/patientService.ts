/**
 * NIRNOY PATIENT SERVICE
 * All patient data operations with Supabase
 * Designed for 1000+ users - NO localStorage
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================
// TYPES
// ============================================================

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  timesPerDay: number;
  timeSlots: string[];
  startDate: string;
  endDate?: string;
  prescribedBy?: string;
  notes?: string;
  isActive: boolean;
  reminderEnabled: boolean;
  createdAt: string;
}

export interface HealthRecord {
  id: string;
  patientId: string;
  recordType: string;
  title: string;
  description?: string;
  data: Record<string, any>;
  attachments: string[];
  recordedBy?: string;
  recordedAt: string;
}

export interface Quiz {
  id: string;
  slug: string;
  title: string;
  titleBn?: string;
  description?: string;
  category: string;
  icon: string;
  durationMinutes: number;
  frequency: string;
  pointsReward: number;
  isPremium: boolean;
  questions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  questionTextBn?: string;
  questionType: string;
  options: any[];
  orderIndex: number;
}

export interface QuizResponse {
  id: string;
  patientId: string;
  quizId: string;
  answers: any[];
  score: number;
  maxScore: number;
  percentage: number;
  insights?: string;
  completedAt: string;
}

export interface FoodScan {
  id: string;
  patientId: string;
  imageUrl?: string;
  foodItems: any[];
  analysisResult: string;
  healthWarnings: string[];
  caloriesEstimate?: number;
  isSafe: boolean;
  scannedAt: string;
}

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  category: string;
  message: string;
  status: string;
  createdAt: string;
}

// ============================================================
// PATIENT SERVICE
// ============================================================

export const patientService = {
  // MEDICATIONS
  async getMedications(patientId: string): Promise<Medication[]> {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        patientId: m.patient_id,
        name: m.name,
        genericName: m.generic_name,
        dosage: m.dosage,
        frequency: m.frequency,
        timesPerDay: m.times_per_day,
        timeSlots: m.time_slots || [],
        startDate: m.start_date,
        endDate: m.end_date,
        prescribedBy: m.prescribed_by,
        notes: m.notes,
        isActive: m.is_active,
        reminderEnabled: m.reminder_enabled,
        createdAt: m.created_at
      }));
    } catch (error) {
      console.error('[PatientService] getMedications error:', error);
      return [];
    }
  },

  async addMedication(patientId: string, medication: Partial<Medication>): Promise<Medication | null> {
    try {
      const { data, error } = await supabase
        .from('medications')
        .insert({
          patient_id: patientId,
          name: medication.name,
          generic_name: medication.genericName,
          dosage: medication.dosage,
          frequency: medication.frequency,
          times_per_day: medication.timesPerDay || 1,
          time_slots: medication.timeSlots || [],
          start_date: medication.startDate || new Date().toISOString().split('T')[0],
          end_date: medication.endDate,
          prescribed_by: medication.prescribedBy,
          notes: medication.notes,
          is_active: true,
          reminder_enabled: medication.reminderEnabled ?? true
        })
        .select()
        .single();

      if (error) throw error;
      
      return data ? {
        id: data.id,
        patientId: data.patient_id,
        name: data.name,
        genericName: data.generic_name,
        dosage: data.dosage,
        frequency: data.frequency,
        timesPerDay: data.times_per_day,
        timeSlots: data.time_slots || [],
        startDate: data.start_date,
        endDate: data.end_date,
        prescribedBy: data.prescribed_by,
        notes: data.notes,
        isActive: data.is_active,
        reminderEnabled: data.reminder_enabled,
        createdAt: data.created_at
      } : null;
    } catch (error) {
      console.error('[PatientService] addMedication error:', error);
      return null;
    }
  },

  async updateMedication(medicationId: string, updates: Partial<Medication>): Promise<boolean> {
    try {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.dosage) dbUpdates.dosage = updates.dosage;
      if (updates.frequency) dbUpdates.frequency = updates.frequency;
      if (updates.timeSlots) dbUpdates.time_slots = updates.timeSlots;
      if (updates.endDate) dbUpdates.end_date = updates.endDate;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.reminderEnabled !== undefined) dbUpdates.reminder_enabled = updates.reminderEnabled;

      const { error } = await supabase
        .from('medications')
        .update(dbUpdates)
        .eq('id', medicationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[PatientService] updateMedication error:', error);
      return false;
    }
  },

  async deleteMedication(medicationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', medicationId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[PatientService] deleteMedication error:', error);
      return false;
    }
  },

  // HEALTH RECORDS
  async getHealthRecords(patientId: string, recordType?: string): Promise<HealthRecord[]> {
    try {
      let query = supabase
        .from('health_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false });

      if (recordType) query = query.eq('record_type', recordType);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(r => ({
        id: r.id,
        patientId: r.patient_id,
        recordType: r.record_type,
        title: r.title,
        description: r.description,
        data: r.data,
        attachments: r.attachments || [],
        recordedBy: r.recorded_by,
        recordedAt: r.recorded_at
      }));
    } catch (error) {
      console.error('[PatientService] getHealthRecords error:', error);
      return [];
    }
  },

  async addHealthRecord(patientId: string, record: Partial<HealthRecord>): Promise<HealthRecord | null> {
    try {
      const { data, error } = await supabase
        .from('health_records')
        .insert({
          patient_id: patientId,
          record_type: record.recordType,
          title: record.title,
          description: record.description,
          data: record.data || {},
          attachments: record.attachments || [],
          recorded_by: record.recordedBy,
          recorded_at: record.recordedAt || new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      return data ? {
        id: data.id,
        patientId: data.patient_id,
        recordType: data.record_type,
        title: data.title,
        description: data.description,
        data: data.data,
        attachments: data.attachments || [],
        recordedBy: data.recorded_by,
        recordedAt: data.recorded_at
      } : null;
    } catch (error) {
      console.error('[PatientService] addHealthRecord error:', error);
      return null;
    }
  },

  // QUIZZES
  async getQuizzes(isPremium?: boolean): Promise<Quiz[]> {
    try {
      let query = supabase
        .from('quizzes')
        .select('*')
        .eq('is_active', true)
        .order('category');

      if (isPremium === false) query = query.eq('is_premium', false);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(q => ({
        id: q.id,
        slug: q.slug,
        title: q.title,
        titleBn: q.title_bn,
        description: q.description,
        category: q.category,
        icon: q.icon,
        durationMinutes: q.duration_minutes,
        frequency: q.frequency,
        pointsReward: q.points_reward,
        isPremium: q.is_premium
      }));
    } catch (error) {
      console.error('[PatientService] getQuizzes error:', error);
      return [];
    }
  },

  async getQuizWithQuestions(quizId: string): Promise<Quiz | null> {
    try {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError || !quiz) return null;

      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');

      return {
        id: quiz.id,
        slug: quiz.slug,
        title: quiz.title,
        titleBn: quiz.title_bn,
        description: quiz.description,
        category: quiz.category,
        icon: quiz.icon,
        durationMinutes: quiz.duration_minutes,
        frequency: quiz.frequency,
        pointsReward: quiz.points_reward,
        isPremium: quiz.is_premium,
        questions: (questions || []).map(q => ({
          id: q.id,
          questionText: q.question_text,
          questionTextBn: q.question_text_bn,
          questionType: q.question_type,
          options: q.options || [],
          orderIndex: q.order_index
        }))
      };
    } catch (error) {
      console.error('[PatientService] getQuizWithQuestions error:', error);
      return null;
    }
  },

  async submitQuizResponse(patientId: string, response: Partial<QuizResponse>): Promise<QuizResponse | null> {
    try {
      const { data, error } = await supabase
        .from('quiz_responses')
        .insert({
          patient_id: patientId,
          quiz_id: response.quizId,
          answers: response.answers || [],
          score: response.score || 0,
          max_score: response.maxScore || 0,
          percentage: response.percentage || 0,
          insights: response.insights
        })
        .select()
        .single();

      if (error) throw error;

      return data ? {
        id: data.id,
        patientId: data.patient_id,
        quizId: data.quiz_id,
        answers: data.answers,
        score: data.score,
        maxScore: data.max_score,
        percentage: data.percentage,
        insights: data.insights,
        completedAt: data.completed_at
      } : null;
    } catch (error) {
      console.error('[PatientService] submitQuizResponse error:', error);
      return null;
    }
  },

  async getQuizResponses(patientId: string): Promise<QuizResponse[]> {
    try {
      const { data, error } = await supabase
        .from('quiz_responses')
        .select('*')
        .eq('patient_id', patientId)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(r => ({
        id: r.id,
        patientId: r.patient_id,
        quizId: r.quiz_id,
        answers: r.answers,
        score: r.score,
        maxScore: r.max_score,
        percentage: r.percentage,
        insights: r.insights,
        completedAt: r.completed_at
      }));
    } catch (error) {
      console.error('[PatientService] getQuizResponses error:', error);
      return [];
    }
  },

  // FOOD SCANS
  async saveFoodScan(patientId: string, scan: Partial<FoodScan>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('food_scans')
        .insert({
          patient_id: patientId,
          image_url: scan.imageUrl,
          food_items: scan.foodItems || [],
          analysis_result: scan.analysisResult,
          health_warnings: scan.healthWarnings || [],
          calories_estimate: scan.caloriesEstimate,
          is_safe: scan.isSafe
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('[PatientService] saveFoodScan error:', error);
      return null;
    }
  },

  async getFoodScans(patientId: string, limit = 20): Promise<FoodScan[]> {
    try {
      const { data, error } = await supabase
        .from('food_scans')
        .select('*')
        .eq('patient_id', patientId)
        .order('scanned_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(s => ({
        id: s.id,
        patientId: s.patient_id,
        imageUrl: s.image_url,
        foodItems: s.food_items || [],
        analysisResult: s.analysis_result,
        healthWarnings: s.health_warnings || [],
        caloriesEstimate: s.calories_estimate,
        isSafe: s.is_safe,
        scannedAt: s.scanned_at
      }));
    } catch (error) {
      console.error('[PatientService] getFoodScans error:', error);
      return [];
    }
  },

  // FEEDBACK
  async submitFeedback(userId: string, userName: string, feedback: { category: string; message: string }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('feedbacks')
        .insert({
          user_id: userId,
          user_name: userName,
          category: feedback.category,
          message: feedback.message
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[PatientService] submitFeedback error:', error);
      return false;
    }
  },

  // AI CONVERSATION SAVE
  async saveAIConversation(patientId: string, messages: any[], summary?: string, symptoms?: string[], specialties?: string[]): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          patient_id: patientId,
          messages: messages,
          summary: summary,
          detected_symptoms: symptoms || [],
          suggested_specialties: specialties || [],
          started_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('[PatientService] saveAIConversation error:', error);
      return null;
    }
  },

  // PROFILE UPDATE
  async updatePatientProfile(profileId: string, updates: any): Promise<boolean> {
    try {
      // Update profiles table
      const profileUpdates: any = {};
      if (updates.name) profileUpdates.name = updates.name;
      if (updates.email) profileUpdates.email = updates.email;
      if (updates.dateOfBirth) profileUpdates.date_of_birth = updates.dateOfBirth;
      if (updates.gender) profileUpdates.gender = updates.gender;
      if (updates.bloodGroup) profileUpdates.blood_group = updates.bloodGroup;
      if (updates.avatarUrl) profileUpdates.avatar_url = updates.avatarUrl;

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', profileId);
        if (error) throw error;
      }

      // Update patients table
      const patientUpdates: any = {};
      if (updates.heightCm !== undefined) patientUpdates.height_cm = updates.heightCm;
      if (updates.weightKg !== undefined) patientUpdates.weight_kg = updates.weightKg;
      if (updates.chronicConditions) patientUpdates.chronic_conditions = updates.chronicConditions;
      if (updates.allergies) patientUpdates.allergies = updates.allergies;
      if (updates.pastSurgeries) patientUpdates.past_surgeries = updates.pastSurgeries;
      if (updates.vaccinations) patientUpdates.vaccinations = updates.vaccinations;
      if (updates.familyHistory) patientUpdates.family_history = updates.familyHistory;
      if (updates.emergencyContactName) patientUpdates.emergency_contact_name = updates.emergencyContactName;
      if (updates.emergencyContactPhone) patientUpdates.emergency_contact_phone = updates.emergencyContactPhone;
      if (updates.emergencyContactRelation) patientUpdates.emergency_contact_relation = updates.emergencyContactRelation;

      if (Object.keys(patientUpdates).length > 0) {
        const { error } = await supabase
          .from('patients')
          .update(patientUpdates)
          .eq('profile_id', profileId);
        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('[PatientService] updatePatientProfile error:', error);
      return false;
    }
  }
};

export default patientService;
