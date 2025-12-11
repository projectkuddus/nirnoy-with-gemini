import { supabase } from '../supabaseAuth';

// ============ TYPES ============
export interface Notification {
  id: string;
  user_id: string;
  type: 'appointment' | 'medication' | 'health_alert' | 'message' | 'system' | 'reminder' | 'family';
  title: string;
  title_bn?: string;
  message: string;
  message_bn?: string;
  created_at: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  action_label?: string;
  metadata?: {
    appointment_id?: string;
    doctor_name?: string;
    medicine_id?: string;
    family_member_id?: string;
    sender_id?: string;
    [key: string]: any;
  };
}

export interface AppointmentReminder {
  id: string;
  appointment_id: string;
  patient_id: string;
  type: 'before_1_day' | 'before_2_hours' | 'before_30_min' | 'queue_update';
  scheduled_for: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  channels: ('in_app' | 'sms' | 'email' | 'push')[];
  appointment_details?: {
    doctor_name: string;
    specialty: string;
    chamber_name: string;
    date: string;
    time: string;
    serial_number?: number;
  };
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  appointment_before_1_day: boolean;
  appointment_before_2_hours: boolean;
  appointment_before_30_min: boolean;
  queue_updates: boolean;
  medication_reminders: boolean;
  medication_refill: boolean;
  medication_missed: boolean;
  channels_in_app: boolean;
  channels_sms: boolean;
  channels_email: boolean;
  channels_push: boolean;
}

// ============ SERVICE ============
export const NotificationsService = {
  // Get all notifications for a user
  async getNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting notifications:', error);
      return [];
    }

    return data || [];
  },

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  },

  // Create notification
  async createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification | null> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data as Notification;
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  },

  // Mark all as read
  async markAllAsRead(userId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  },

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  },

  // Get appointment reminders for a patient
  async getAppointmentReminders(patientId: string): Promise<AppointmentReminder[]> {
    const { data, error } = await supabase
      .from('appointment_reminders')
      .select('*')
      .eq('patient_id', patientId)
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Error getting appointment reminders:', error);
      return [];
    }

    return data || [];
  },

  // Create appointment reminder
  async createAppointmentReminder(reminder: Omit<AppointmentReminder, 'id'>): Promise<AppointmentReminder | null> {
    const { data, error } = await supabase
      .from('appointment_reminders')
      .insert(reminder)
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment reminder:', error);
      return null;
    }

    return data as AppointmentReminder;
  },

  // Schedule reminders for an appointment
  async scheduleAppointmentReminders(
    appointmentId: string,
    patientId: string,
    appointmentDetails: AppointmentReminder['appointment_details'],
    appointmentDateTime: Date,
    preferences?: NotificationPreferences
  ): Promise<void> {
    const reminders: Omit<AppointmentReminder, 'id'>[] = [];
    
    // 1 day before
    if (!preferences || preferences.appointment_before_1_day) {
      const oneDayBefore = new Date(appointmentDateTime);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      if (oneDayBefore > new Date()) {
        reminders.push({
          appointment_id: appointmentId,
          patient_id: patientId,
          type: 'before_1_day',
          scheduled_for: oneDayBefore.toISOString(),
          status: 'pending',
          channels: ['in_app', 'sms'],
          appointment_details: appointmentDetails,
        });
      }
    }

    // 2 hours before
    if (!preferences || preferences.appointment_before_2_hours) {
      const twoHoursBefore = new Date(appointmentDateTime);
      twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);
      if (twoHoursBefore > new Date()) {
        reminders.push({
          appointment_id: appointmentId,
          patient_id: patientId,
          type: 'before_2_hours',
          scheduled_for: twoHoursBefore.toISOString(),
          status: 'pending',
          channels: ['in_app', 'push'],
          appointment_details: appointmentDetails,
        });
      }
    }

    // 30 minutes before
    if (!preferences || preferences.appointment_before_30_min) {
      const thirtyMinBefore = new Date(appointmentDateTime);
      thirtyMinBefore.setMinutes(thirtyMinBefore.getMinutes() - 30);
      if (thirtyMinBefore > new Date()) {
        reminders.push({
          appointment_id: appointmentId,
          patient_id: patientId,
          type: 'before_30_min',
          scheduled_for: thirtyMinBefore.toISOString(),
          status: 'pending',
          channels: ['in_app', 'push'],
          appointment_details: appointmentDetails,
        });
      }
    }

    // Insert all reminders
    if (reminders.length > 0) {
      await supabase.from('appointment_reminders').insert(reminders);
    }
  },

  // Get notification preferences
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is okay
      console.error('Error getting preferences:', error);
      return null;
    }

    if (!data) {
      // Create default preferences
      const defaults: Omit<NotificationPreferences, 'id'> = {
        user_id: userId,
        appointment_before_1_day: true,
        appointment_before_2_hours: true,
        appointment_before_30_min: false,
        queue_updates: true,
        medication_reminders: true,
        medication_refill: true,
        medication_missed: true,
        channels_in_app: true,
        channels_sms: true,
        channels_email: false,
        channels_push: true,
      };

      const { data: created } = await supabase
        .from('notification_preferences')
        .insert(defaults)
        .select()
        .single();

      return created as NotificationPreferences;
    }

    return data as NotificationPreferences;
  },

  // Update preferences
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    await supabase
      .from('notification_preferences')
      .update(preferences)
      .eq('user_id', userId);
  },

  // Subscribe to new notifications
  subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
  ) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNotification(payload.new as Notification);
        }
      )
      .subscribe();
  },

  // Unsubscribe
  async unsubscribeFromNotifications(userId: string) {
    await supabase.removeChannel(
      supabase.channel(`notifications:${userId}`)
    );
  },
};

export default NotificationsService;

