import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis';

interface HealthStatusResponse {
  api?: 'ok';
  postgres?: 'ok';
  redis?: 'ok';
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  async checkAll(): Promise<HealthStatusResponse> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgresStatus(),
      this.checkRedisStatus(),
    ]);

    return {
      api: 'ok',
      postgres,
      redis,
    };
  }

  @Get('api')
  checkApi(): HealthStatusResponse {
    return {
      api: 'ok',
    };
  }

  @Get('postgres')
  async checkPostgres(): Promise<HealthStatusResponse> {
    const postgres = await this.checkPostgresStatus();

    return {
      postgres,
    };
  }

  @Get('redis')
  async checkRedis(): Promise<HealthStatusResponse> {
    const redis = await this.checkRedisStatus();

    return {
      redis,
    };
  }

  private async checkPostgresStatus(): Promise<'ok'> {
    try {
      return await this.prismaService.checkHealth();
    } catch {
      throw new ServiceUnavailableException({
        api: 'ok',
        postgres: 'down',
      });
    }
  }

  private async checkRedisStatus(): Promise<'ok'> {
    try {
      const response = await this.redisService.ping();

      if (response !== 'PONG') {
        throw new Error('Redis did not respond with PONG');
      }

      return 'ok';
    } catch {
      throw new ServiceUnavailableException({
        api: 'ok',
        redis: 'down',
      });
    }
  }
}
