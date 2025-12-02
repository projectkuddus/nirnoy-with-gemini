import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationJobProcessor } from './notification.processor';
import { ReminderJobProcessor } from './reminder.processor';
import { JobsService } from './jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    // Configure BullMQ with Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', undefined),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
    }),
    
    // Register queues
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'appointments' },
      { name: 'reminders' },
    ),
    
    NotificationsModule,
  ],
  providers: [NotificationJobProcessor, ReminderJobProcessor, JobsService],
  exports: [JobsService, BullModule],
})
export class JobsModule {}

