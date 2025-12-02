import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Service for Backend
 * 
 * Uses service_role key for admin operations (bypasses RLS)
 * This should ONLY be used on the backend, never expose service_role to frontend
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabaseAdmin: SupabaseClient;
  private supabasePublic: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl) {
      this.logger.warn('SUPABASE_URL not configured');
    }

    // Admin client (bypasses RLS) - for backend operations
    this.supabaseAdmin = createClient(
      supabaseUrl || '',
      supabaseServiceRoleKey || supabaseAnonKey || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Public client (respects RLS) - for user-scoped operations
    this.supabasePublic = createClient(
      supabaseUrl || '',
      supabaseAnonKey || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  async onModuleInit() {
    await this.checkConnection();
  }

  /**
   * Check database connection
   */
  async checkConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        this.logger.error(`Supabase connection error: ${error.message}`);
        return false;
      }
      
      this.logger.log('✅ Supabase connection successful');
      return true;
    } catch (error) {
      this.logger.error(`Supabase connection failed: ${error}`);
      return false;
    }
  }

  /**
   * Get admin client (bypasses RLS)
   * Use for: background jobs, admin operations, service-to-service
   */
  get admin(): SupabaseClient {
    return this.supabaseAdmin;
  }

  /**
   * Get public client (respects RLS)
   * Use for: operations on behalf of a specific user
   */
  get public(): SupabaseClient {
    return this.supabasePublic;
  }

  /**
   * Get client with user's JWT (for user-scoped RLS)
   */
  getClientForUser(accessToken: string): SupabaseClient {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    return createClient(supabaseUrl || '', supabaseAnonKey || '', {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  // ===========================================
  // PROFILE OPERATIONS
  // ===========================================

  async getProfileByPhone(phone: string) {
    const { data, error } = await this.supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error && error.code !== 'PGRST116') {
      this.logger.error(`Error getting profile: ${error.message}`);
      throw error;
    }
    return data;
  }

  async getProfileById(userId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      this.logger.error(`Error getting profile: ${error.message}`);
      throw error;
    }
    return data;
  }

  async createOrUpdateProfile(userId: string, profileData: any) {
    const { data, error } = await this.supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error upserting profile: ${error.message}`);
      throw error;
    }
    return data;
  }

  // ===========================================
  // DOCTOR OPERATIONS
  // ===========================================

  async getDoctors(options?: {
    specialty?: string;
    area?: string;
    limit?: number;
    offset?: number;
    verified?: boolean;
  }) {
    let query = this.supabaseAdmin
      .from('doctors')
      .select(`
        *,
        profile:profiles(*),
        chambers(*, schedules(*))
      `);

    if (options?.verified !== undefined) {
      query = query.eq('is_verified', options.verified);
    } else {
      query = query.eq('is_verified', true);
    }

    if (options?.specialty) {
      query = query.contains('specialties', [options.specialty]);
    }

    if (options?.area) {
      query = query.eq('chambers.area', options.area);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Error getting doctors: ${error.message}`);
      throw error;
    }
    return data;
  }

  async getDoctorById(doctorId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('doctors')
      .select(`
        *,
        profile:profiles(*),
        chambers(*, schedules(*))
      `)
      .eq('id', doctorId)
      .single();

    if (error) {
      this.logger.error(`Error getting doctor: ${error.message}`);
      throw error;
    }
    return data;
  }

  // ===========================================
  // APPOINTMENT OPERATIONS (with transaction safety)
  // ===========================================

  async createAppointment(appointmentData: {
    patient_id: string;
    doctor_id: string;
    chamber_id: string;
    appointment_date: string;
    appointment_time: string;
    visit_type: string;
    fee: number;
    chief_complaint?: string;
    symptoms?: string[];
  }) {
    // Get next serial number atomically
    const { data: existingAppts, error: countError } = await this.supabaseAdmin
      .from('appointments')
      .select('serial_number')
      .eq('doctor_id', appointmentData.doctor_id)
      .eq('chamber_id', appointmentData.chamber_id)
      .eq('appointment_date', appointmentData.appointment_date)
      .neq('status', 'cancelled')
      .order('serial_number', { ascending: false })
      .limit(1);

    if (countError) {
      this.logger.error(`Error checking existing appointments: ${countError.message}`);
      throw countError;
    }

    const nextSerial = existingAppts && existingAppts.length > 0 
      ? existingAppts[0].serial_number + 1 
      : 1;

    // Check if slot is already booked (double-booking prevention)
    const { data: conflicting, error: conflictError } = await this.supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('doctor_id', appointmentData.doctor_id)
      .eq('chamber_id', appointmentData.chamber_id)
      .eq('appointment_date', appointmentData.appointment_date)
      .eq('appointment_time', appointmentData.appointment_time)
      .in('status', ['booked', 'confirmed', 'in_queue', 'in_progress'])
      .limit(1);

    if (conflictError) {
      throw conflictError;
    }

    if (conflicting && conflicting.length > 0) {
      throw new Error('এই সময়টি ইতিমধ্যে বুক হয়ে গেছে। অন্য সময় বেছে নিন।');
    }

    // Create appointment
    const { data, error } = await this.supabaseAdmin
      .from('appointments')
      .insert({
        ...appointmentData,
        serial_number: nextSerial,
        status: 'booked',
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (race condition)
      if (error.code === '23505') {
        throw new Error('সময়টি ইতিমধ্যে বুক হয়ে গেছে। অন্য সময় বেছে নিন।');
      }
      this.logger.error(`Error creating appointment: ${error.message}`);
      throw error;
    }

    return data;
  }

  async getAppointmentById(appointmentId: string) {
    const { data, error } = await this.supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctor:doctors(*, profile:profiles(*)),
        patient:patients(*, profile:profiles(*)),
        chamber:chambers(*)
      `)
      .eq('id', appointmentId)
      .single();

    if (error) {
      this.logger.error(`Error getting appointment: ${error.message}`);
      throw error;
    }
    return data;
  }

  async updateAppointmentStatus(appointmentId: string, status: string, notes?: string) {
    const updates: any = { 
      status, 
      updated_at: new Date().toISOString() 
    };
    
    if (notes) updates.notes = notes;

    const { data, error } = await this.supabaseAdmin
      .from('appointments')
      .update(updates)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating appointment: ${error.message}`);
      throw error;
    }
    return data;
  }

  // ===========================================
  // NOTIFICATIONS
  // ===========================================

  async createNotification(notification: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    const { data, error } = await this.supabaseAdmin
      .from('notifications')
      .insert({
        ...notification,
        is_read: false,
        sent_via: ['app'],
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating notification: ${error.message}`);
      throw error;
    }
    return data;
  }

  // ===========================================
  // AI CONVERSATIONS
  // ===========================================

  async saveAiConversation(conversation: {
    user_id?: string;
    conversation_type: string;
    messages: any[];
    context?: any;
    is_anonymous?: boolean;
  }) {
    const { data, error } = await this.supabaseAdmin
      .from('ai_conversations')
      .insert({
        ...conversation,
        messages: JSON.stringify(conversation.messages),
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error saving AI conversation: ${error.message}`);
      throw error;
    }
    return data;
  }

  // ===========================================
  // FEEDBACK
  // ===========================================

  async submitFeedback(feedback: {
    user_id?: string;
    type: string;
    mood?: string;
    message: string;
    email?: string;
    phone?: string;
    page?: string;
  }) {
    const { data, error } = await this.supabaseAdmin
      .from('feedback')
      .insert({
        ...feedback,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Error submitting feedback: ${error.message}`);
      throw error;
    }
    return data;
  }

  // ===========================================
  // HEALTH CHECK
  // ===========================================

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const { data, error } = await this.supabaseAdmin
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        return {
          status: 'unhealthy',
          details: { error: error.message },
        };
      }

      return {
        status: 'healthy',
        details: { connected: true },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: String(error) },
      };
    }
  }
}

