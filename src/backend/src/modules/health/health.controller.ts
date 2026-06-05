import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../redis';

@Controller('health')
export class HealthController {
  constructor(private readonly redisService: RedisService) {}

  @Get('redis')
  async checkRedis() {
    const response = await this.redisService.ping();

    if (response !== 'PONG') {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'redis',
        message: 'Redis did not respond with PONG',
      });
    }

    return {
      status: 'ok',
      service: 'redis',
      message: 'Redis connection is healthy',
    };
  }
}
