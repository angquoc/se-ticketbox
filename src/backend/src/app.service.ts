import { Injectable } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    status: 'ok' | 'error';
    latencyMs?: number;
    error?: string;
  };
}

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthStatus> {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    let dbStatus: HealthStatus['database'] = { status: 'ok' };

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus.latencyMs = Date.now() - start;
    } catch (error) {
      dbStatus = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return {
      status: dbStatus.status === 'ok' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime,
      database: dbStatus,
    };
  }
}
