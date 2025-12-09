/**
 * Supabase Database Types
 * Auto-generated from Supabase schema
 * Update this file when database schema changes
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // Users & Authentication
      users: {
        Row: {
          id: string;
          email: string | null;
          phone: string;
          name: string;
          name_bn: string | null;
          role: 'patient' | 'doctor' | 'admin';
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          last_active: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          email?: string | null;
          phone: string;
          name: string;
          name_bn?: string | null;
          role: 'patient' | 'doctor' | 'admin';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_active?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          phone?: string;
          name?: string;
          name_bn?: string | null;
          role?: 'patient' | 'doctor' | 'admin';
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_active?: string | null;
          metadata?: Json | null;
        };
      };

      // Patients
      patients: {
        Row: {
          id: string;
          user_id: string;
          date_of_birth: string | null;
          gender: 'male' | 'female' | 'other' | null;
          blood_group: string | null;
          height_cm: number | null;
          weight_kg: number | null;
          emergency_contact: string | null;
          emergency_relation: string | null;
          address: string | null;
          city: string | null;
          district: string | null;
          nid_number: string | null;
          family_members: Json | null;
          health_conditions: Json | null;
          allergies: Json | null;
          medications: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date_of_birth?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          blood_group?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          emergency_contact?: string | null;
          emergency_relation?: string | null;
          address?: string | null;
          city?: string | null;
          district?: string | null;
          nid_number?: string | null;
          family_members?: Json | null;
          health_conditions?: Json | null;
          allergies?: Json | null;
          medications?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date_of_birth?: string | null;
          gender?: 'male' | 'female' | 'other' | null;
          blood_group?: string | null;
          height_cm?: number | null;
          weight_kg?: number | null;
          emergency_contact?: string | null;
          emergency_relation?: string | null;
          address?: string | null;
          city?: string | null;
          district?: string | null;
          nid_number?: string | null;
          family_members?: Json | null;
          health_conditions?: Json | null;
          allergies?: Json | null;
          medications?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Doctors
      doctors: {
        Row: {
          id: string;
          user_id: string;
          bmdc_number: string;
          nid_number: string;
          degrees: Json;
          specializations: Json;
          experience_years: number;
          bio: string | null;
          bio_bn: string | null;
          profile_image_url: string | null;
          consultation_fee: number;
          rating: number;
          total_reviews: number;
          total_patients: number;
          is_verified: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bmdc_number: string;
          nid_number: string;
          degrees: Json;
          specializations: Json;
          experience_years: number;
          bio?: string | null;
          bio_bn?: string | null;
          profile_image_url?: string | null;
          consultation_fee?: number;
          rating?: number;
          total_reviews?: number;
          total_patients?: number;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bmdc_number?: string;
          nid_number?: string;
          degrees?: Json;
          specializations?: Json;
          experience_years?: number;
          bio?: string | null;
          bio_bn?: string | null;
          profile_image_url?: string | null;
          consultation_fee?: number;
          rating?: number;
          total_reviews?: number;
          total_patients?: number;
          is_verified?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Appointments
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          chamber_id: string | null;
          date: string;
          time: string;
          serial_number: number;
          status: 'scheduled' | 'confirmed' | 'in_queue' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
          visit_type: 'new' | 'follow_up' | 'report_review';
          fee: number;
          is_paid: boolean;
          payment_method: string | null;
          payment_id: string | null;
          intake_form: Json | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          chamber_id?: string | null;
          date: string;
          time: string;
          serial_number: number;
          status?: 'scheduled' | 'confirmed' | 'in_queue' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
          visit_type?: 'new' | 'follow_up' | 'report_review';
          fee: number;
          is_paid?: boolean;
          payment_method?: string | null;
          payment_id?: string | null;
          intake_form?: Json | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          chamber_id?: string | null;
          date?: string;
          time?: string;
          serial_number?: number;
          status?: 'scheduled' | 'confirmed' | 'in_queue' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
          visit_type?: 'new' | 'follow_up' | 'report_review';
          fee?: number;
          is_paid?: boolean;
          payment_method?: string | null;
          payment_id?: string | null;
          intake_form?: Json | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };

      // Queue Management
      queue_entries: {
        Row: {
          id: string;
          appointment_id: string;
          doctor_id: string;
          current_serial: number;
          total_in_queue: number;
          estimated_wait_time: number | null;
          delay_minutes: number;
          doctor_message: string | null;
          status: 'waiting' | 'next' | 'current' | 'completed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          doctor_id: string;
          current_serial: number;
          total_in_queue: number;
          estimated_wait_time?: number | null;
          delay_minutes?: number;
          doctor_message?: string | null;
          status?: 'waiting' | 'next' | 'current' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          doctor_id?: string;
          current_serial?: number;
          total_in_queue?: number;
          estimated_wait_time?: number | null;
          delay_minutes?: number;
          doctor_message?: string | null;
          status?: 'waiting' | 'next' | 'current' | 'completed';
          created_at?: string;
          updated_at?: string;
        };
      };

      // Health Records
      health_records: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string | null;
          appointment_id: string | null;
          record_type: 'consultation' | 'diagnosis' | 'prescription' | 'lab_report' | 'imaging' | 'vital_signs' | 'symptom' | 'medication';
          title: string;
          description: string | null;
          data: Json;
          body_region: string | null;
          severity: 'mild' | 'moderate' | 'severe' | 'critical' | null;
          is_emergency: boolean;
          tags: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id?: string | null;
          appointment_id?: string | null;
          record_type: 'consultation' | 'diagnosis' | 'prescription' | 'lab_report' | 'imaging' | 'vital_signs' | 'symptom' | 'medication';
          title: string;
          description?: string | null;
          data: Json;
          body_region?: string | null;
          severity?: 'mild' | 'moderate' | 'severe' | 'critical' | null;
          is_emergency?: boolean;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string | null;
          appointment_id?: string | null;
          record_type?: 'consultation' | 'diagnosis' | 'prescription' | 'lab_report' | 'imaging' | 'vital_signs' | 'symptom' | 'medication';
          title?: string;
          description?: string | null;
          data?: Json;
          body_region?: string | null;
          severity?: 'mild' | 'moderate' | 'severe' | 'critical' | null;
          is_emergency?: boolean;
          tags?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // AI Conversations
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          conversation_type: 'patient_health' | 'doctor_assistant' | 'general';
          context: Json | null;
          messages: Json;
          summary: string | null;
          insights: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_type: 'patient_health' | 'doctor_assistant' | 'general';
          context?: Json | null;
          messages: Json;
          summary?: string | null;
          insights?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_type?: 'patient_health' | 'doctor_assistant' | 'general';
          context?: Json | null;
          messages?: Json;
          summary?: string | null;
          insights?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // AI Insights & Predictions
      ai_insights: {
        Row: {
          id: string;
          patient_id: string | null;
          doctor_id: string | null;
          location: string | null;
          insight_type: 'risk_prediction' | 'health_trend' | 'pattern_detection' | 'recommendation' | 'pandemic_alert';
          title: string;
          description: string;
          data: Json;
          confidence_score: number;
          severity: 'low' | 'medium' | 'high' | 'critical';
          is_actionable: boolean;
          action_items: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          doctor_id?: string | null;
          location?: string | null;
          insight_type: 'risk_prediction' | 'health_trend' | 'pattern_detection' | 'recommendation' | 'pandemic_alert';
          title: string;
          description: string;
          data: Json;
          confidence_score: number;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          is_actionable?: boolean;
          action_items?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string | null;
          doctor_id?: string | null;
          location?: string | null;
          insight_type?: 'risk_prediction' | 'health_trend' | 'pattern_detection' | 'recommendation' | 'pandemic_alert';
          title?: string;
          description?: string;
          data?: Json;
          confidence_score?: number;
          severity?: 'low' | 'medium' | 'high' | 'critical';
          is_actionable?: boolean;
          action_items?: Json | null;
          created_at?: string;
        };
      };

      // Prescriptions
      prescriptions: {
        Row: {
          id: string;
          appointment_id: string;
          doctor_id: string;
          patient_id: string;
          medications: Json;
          instructions: string | null;
          follow_up_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          doctor_id: string;
          patient_id: string;
          medications: Json;
          instructions?: string | null;
          follow_up_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          appointment_id?: string;
          doctor_id?: string;
          patient_id?: string;
          medications?: Json;
          instructions?: string | null;
          follow_up_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Chambers
      chambers: {
        Row: {
          id: string;
          doctor_id: string;
          name: string;
          address: string;
          area: string;
          city: string;
          phone: string | null;
          consultation_fee: number;
          follow_up_fee: number;
          schedule: Json;
          facilities: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          doctor_id: string;
          name: string;
          address: string;
          area: string;
          city: string;
          phone?: string | null;
          consultation_fee: number;
          follow_up_fee: number;
          schedule: Json;
          facilities?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          doctor_id?: string;
          name?: string;
          address?: string;
          area?: string;
          city?: string;
          phone?: string | null;
          consultation_fee?: number;
          follow_up_fee?: number;
          schedule?: Json;
          facilities?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };

      // Notifications
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'appointment' | 'queue' | 'prescription' | 'health_alert' | 'system';
          title: string;
          message: string;
          data: Json | null;
          is_read: boolean;
          channels: string[]; // ['sms', 'email', 'push']
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'appointment' | 'queue' | 'prescription' | 'health_alert' | 'system';
          title: string;
          message: string;
          data?: Json | null;
          is_read?: boolean;
          channels?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'appointment' | 'queue' | 'prescription' | 'health_alert' | 'system';
          title?: string;
          message?: string;
          data?: Json | null;
          is_read?: boolean;
          channels?: string[];
          created_at?: string;
        };
      };

      // Analytics & Aggregations (for health trends, location-based insights)
      health_analytics: {
        Row: {
          id: string;
          location: string;
          date: string;
          metric_type: 'symptom' | 'diagnosis' | 'medication' | 'vital_sign';
          metric_name: string;
          value: number;
          count: number;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          location: string;
          date: string;
          metric_type: 'symptom' | 'diagnosis' | 'medication' | 'vital_sign';
          metric_name: string;
          value: number;
          count: number;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          location?: string;
          date?: string;
          metric_type?: 'symptom' | 'diagnosis' | 'medication' | 'vital_sign';
          metric_name?: string;
          value?: number;
          count?: number;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

