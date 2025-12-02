import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';

export interface ReminderJobData {
  appointmentId: string;
  type: '24h' | '1h' | '15m';
  phone: string;
  doctorName?: string;
  time?: string;
  serial?: number;
  address?: string;
}

@Processor('reminders')
export class ReminderJobProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderJobProcessor.name);

  constructor(private notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<ReminderJobData>): Promise<any> {
    this.logger.log(`Processing reminder job ${job.id}: ${job.data.type} for appointment ${job.data.appointmentId}`);

    try {
      const { type, phone, doctorName, time, serial, address } = job.data;

      let template: string;
      let data: Record<string, any>;

      switch (type) {
        case '24h':
          template = 'appointment_reminder_24h';
          data = { doctorName, time, address };
          break;
        case '1h':
          template = 'appointment_reminder_1h';
          data = { serial };
          break;
        case '15m':
          template = 'appointment_reminder_1h'; // Reuse 1h template
          data = { serial };
          break;
        default:
          throw new Error(`Unknown reminder type: ${type}`);
      }

      const result = await this.notificationsService.send({
        type: 'sms',
        recipient: phone,
        template: template as any,
        data,
        language: 'bn',
      });

      return result;
    } catch (error) {
      this.logger.error(`Reminder job ${job.id} failed:`, error);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Reminder ${job.id} sent successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Reminder ${job.id} failed: ${error.message}`);
  }
}

