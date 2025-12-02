import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AdminModule } from './admin/admin.module';
import { QueueModule } from './queue/queue.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { JobsModule } from './jobs/jobs.module';
import { VoiceModule } from './voice/voice.module';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Rate limiting - protects against DDoS and abuse
    // Default: 100 requests per minute per IP
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000,  // 1 second
            limit: 10,  // 10 requests per second
          },
          {
            name: 'medium',
            ttl: 10000, // 10 seconds
            limit: 50,  // 50 requests per 10 seconds
          },
          {
            name: 'long',
            ttl: 60000, // 1 minute
            limit: config.get('RATE_LIMIT_MAX') || 100, // 100 requests per minute
          },
        ],
      }),
    }),
    
    // Core modules
    PrismaModule,
    SupabaseModule,  // Supabase client for database operations
    AuthModule,
    DoctorsModule,
    AppointmentsModule,
    AdminModule,
    QueueModule,
    NotificationsModule,
    AiModule,
    JobsModule,  // BullMQ background jobs (SMS, notifications)
    VoiceModule, // Voice relay for Gemini Live API
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Enable rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
