import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface AppointmentNotificationData {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  doctorName: string;
  date: string;
  time: string;
  serial: number;
  chamberName: string;
  address: string;
  fee: number;
}

export interface QueueNotificationData {
  appointmentId: string;
  phone: string;
  patientsAhead: number;
}

export interface DelayNotificationData {
  chamberId: string;
  phones: string[];
  delayMinutes: number;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
    @InjectQueue('reminders') private reminderQueue: Queue,
  ) {}

  /**
   * Queue appointment confirmation notification
   */
  async queueAppointmentConfirmation(data: AppointmentNotificationData) {
    this.logger.log(`Queuing appointment confirmation for ${data.patientName}`);
    
    await this.notificationQueue.add('appointment-confirmation', {
      ...data,
      phone: data.patientPhone,
      email: data.patientEmail,
    }, {
      priority: 1, // High priority
    });

    // Schedule 24h reminder
    const appointmentTime = new Date(`${data.date} ${data.time}`);
    const reminder24h = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
    
    if (reminder24h > new Date()) {
      await this.reminderQueue.add('appointment-reminder', {
        appointmentId: data.appointmentId,
        type: '24h',
        phone: data.patientPhone,
        doctorName: data.doctorName,
        time: data.time,
        address: data.address,
      }, {
        delay: reminder24h.getTime() - Date.now(),
        jobId: `reminder-24h-${data.appointmentId}`,
      });
    }

    // Schedule 1h reminder
    const reminder1h = new Date(appointmentTime.getTime() - 60 * 60 * 1000);
    if (reminder1h > new Date()) {
      await this.reminderQueue.add('appointment-reminder', {
        appointmentId: data.appointmentId,
        type: '1h',
        phone: data.patientPhone,
        serial: data.serial,
      }, {
        delay: reminder1h.getTime() - Date.now(),
        jobId: `reminder-1h-${data.appointmentId}`,
      });
    }

    return { success: true };
  }

  /**
   * Queue queue position update notification
   */
  async queueQueueUpdate(data: QueueNotificationData) {
    this.logger.log(`Queuing queue update: ${data.patientsAhead} ahead`);
    
    await this.notificationQueue.add('queue-update', data, {
      priority: data.patientsAhead <= 3 ? 1 : 2, // High priority if turn is soon
    });

    return { success: true };
  }

  /**
   * Queue delay notification for all patients at a chamber
   */
  async queueDelayNotification(data: DelayNotificationData) {
    this.logger.log(`Queuing delay notification for chamber ${data.chamberId}`);
    
    for (const phone of data.phones) {
      await this.notificationQueue.add('send-sms', {
        recipient: phone,
        template: 'queue_delay',
        data: { delayMinutes: data.delayMinutes },
        language: 'bn',
      });
    }

    return { success: true };
  }

  /**
   * Queue custom SMS notification
   */
  async queueSMS(phone: string, template: string, data: Record<string, any>, language: 'bn' | 'en' = 'bn') {
    await this.notificationQueue.add('send-sms', {
      recipient: phone,
      template,
      data,
      language,
    });
    return { success: true };
  }

  /**
   * Queue custom Email notification
   */
  async queueEmail(email: string, template: string, data: Record<string, any>, language: 'bn' | 'en' = 'bn') {
    await this.notificationQueue.add('send-email', {
      recipient: email,
      template,
      data,
      language,
    });
    return { success: true };
  }

  /**
   * Cancel scheduled reminders for an appointment
   */
  async cancelAppointmentReminders(appointmentId: string) {
    try {
      await this.reminderQueue.remove(`reminder-24h-${appointmentId}`);
      await this.reminderQueue.remove(`reminder-1h-${appointmentId}`);
      this.logger.log(`Cancelled reminders for appointment ${appointmentId}`);
    } catch (error) {
      this.logger.warn(`Could not cancel reminders: ${error.message}`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [notifCounts, reminderCounts] = await Promise.all([
      this.notificationQueue.getJobCounts(),
      this.reminderQueue.getJobCounts(),
    ]);

    return {
      notifications: notifCounts,
      reminders: reminderCounts,
    };
  }
}

