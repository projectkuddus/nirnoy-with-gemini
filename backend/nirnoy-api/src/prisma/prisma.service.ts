import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly isConfigured: boolean;

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');
    
    // Check if Prisma is configured
    const isConfigured = !!databaseUrl && databaseUrl.startsWith('postgresql://');

    super({
      datasources: {
        db: {
          url: databaseUrl || 'postgresql://dummy:dummy@localhost:5432/dummy',
        },
      },
      log: isConfigured ? [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ] : [],
    });

    this.isConfigured = isConfigured;

    if (isConfigured) {
      // Log warnings and errors
      this.$on('warn' as never, (e: any) => {
        this.logger.warn(e);
      });

      this.$on('error' as never, (e: any) => {
        this.logger.error(e);
      });
    }
  }

  async onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn('⚠️ Prisma not configured (DATABASE_URL not set) - using Supabase instead');
      return;
    }

    try {
      await this.$connect();
      this.logger.log('✅ Database connected with connection pooling enabled');
      this.logger.log(`📊 Using pgBouncer pooling mode (session pooling)`);
    } catch (error) {
      this.logger.warn(`⚠️ Prisma connection failed: ${error}. Falling back to Supabase.`);
    }
  }

  async onModuleDestroy() {
    if (this.isConfigured) {
      try {
        await this.$disconnect();
        this.logger.log('🔌 Database disconnected');
      } catch (error) {
        // Ignore disconnect errors
      }
    }
  }

  /**
   * Health check method to verify database connection
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured) {
      return false;
    }
    
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }
}
