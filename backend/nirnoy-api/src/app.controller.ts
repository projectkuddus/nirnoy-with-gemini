import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    version: string;
    services: {
      supabase: { status: string; details?: any };
      prisma: { status: string; details?: any };
    };
  }> {
    const [supabaseHealth, prismaHealth] = await Promise.all([
      this.supabase.healthCheck(),
      this.checkPrisma(),
    ]);

    const isHealthy = supabaseHealth.status === 'healthy';

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        supabase: supabaseHealth,
        prisma: prismaHealth,
      },
    };
  }

  private async checkPrisma(): Promise<{ status: string; details?: any }> {
    try {
      // Try a simple query to check connection
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', details: { connected: true } };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: { error: 'Prisma not configured (using Supabase instead)' } 
      };
    }
  }
}
