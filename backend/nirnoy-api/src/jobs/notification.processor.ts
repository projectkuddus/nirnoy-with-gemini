import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService, NotificationPayload } from '../notifications/notifications.service';

export interface NotificationJobData {
  type: 'sms' | 'email' | 'push';
  recipient: string;
  template: string;
  data: Record<string, any>;
  language?: 'bn' | 'en';
}

export interface ReminderJobData {
  appointmentId: string;
  type: '24h' | '1h' | '15m';
}

@Processor('notifications')
export class NotificationJobProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationJobProcessor.name);

  constructor(private notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<any> {
    this.logger.log(`Processing notification job ${job.id}: ${job.name}`);

    try {
      switch (job.name) {
        case 'send-sms':
          return await this.processSMS(job.data);
        case 'send-email':
          return await this.processEmail(job.data);
        case 'send-push':
          return await this.processPush(job.data);
        case 'appointment-confirmation':
          return await this.processAppointmentConfirmation(job.data);
        case 'queue-update':
          return await this.processQueueUpdate(job.data);
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
          return { success: false, error: 'Unknown job type' };
      }
    } catch (error) {
      this.logger.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  }

  private async processSMS(data: NotificationJobData) {
    return await this.notificationsService.send({
      type: 'sms',
      recipient: data.recipient,
      template: data.template as any,
      data: data.data,
      language: data.language || 'bn',
    });
  }

  private async processEmail(data: NotificationJobData) {
    return await this.notificationsService.send({
      type: 'email',
      recipient: data.recipient,
      template: data.template as any,
      data: data.data,
      language: data.language || 'bn',
    });
  }

  private async processPush(data: NotificationJobData) {
    return await this.notificationsService.send({
      type: 'push',
      recipient: data.recipient,
      template: data.template as any,
      data: data.data,
      language: data.language || 'bn',
    });
  }

  private async processAppointmentConfirmation(data: any) {
    // Send both SMS and Email for appointment confirmation
    const results: Array<{ success: boolean; messageId?: string; error?: string }> = [];
    
    if (data.phone) {
      results.push(await this.notificationsService.send({
        type: 'sms',
        recipient: data.phone,
        template: 'appointment_confirmed',
        data: data,
        language: 'bn',
      }));
    }
    
    if (data.email) {
      results.push(await this.notificationsService.send({
        type: 'email',
        recipient: data.email,
        template: 'appointment_confirmed',
        data: data,
        language: 'bn',
      }));
    }
    
    return { success: true, results };
  }

  private async processQueueUpdate(data: any) {
    return await this.notificationsService.send({
      type: 'sms',
      recipient: data.phone,
      template: data.patientsAhead === 0 ? 'queue_your_turn' : 'queue_turn_soon',
      data: { patientsAhead: data.patientsAhead },
      language: 'bn',
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }
}

