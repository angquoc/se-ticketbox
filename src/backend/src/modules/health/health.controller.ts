import {
  Controller,
  Get,
  Post,
  ServiceUnavailableException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

function findBackendDir(): string {
  let currentDir = __dirname;
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return path.resolve(__dirname, '../../..');
}

function findSeedTestPath(backendDir: string): string {
  const candidates = [
    path.join(backendDir, '../../data/seed/seed-test.ts'), // local monorepo
    path.join(backendDir, '../data/seed/seed-test.ts'), // docker-relative
    '/data/seed/seed-test.ts', // docker volume mount
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      `seed-test.ts not found. Tried: ${candidates.join(', ')}`,
    );
  }
  return found;
}

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

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetDatabase() {
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_RESET !== 'true'
    ) {
      throw new ForbiddenException(
        'Không được phép reset DB ở môi trường production',
      );
    }
    try {
      // Clear Redis cache
      await this.redisService.flushall();

      // Run seed script via child_process
      const execAsync = promisify(exec);

      const backendDir = findBackendDir();
      const seedPath = findSeedTestPath(backendDir);
      const nodePath = path.join(backendDir, 'node_modules');
      await execAsync(
        `npx ts-node -T --project tsconfig.json -r tsconfig-paths/register "${seedPath}"`,
        {
          cwd: backendDir,
          env: {
            ...process.env,
            NODE_PATH: nodePath,
          },
        },
      );

      // Re-seed Redis stock after flush — design seeds stock at ticket-type create,
      // but seed-test writes via Prisma only. Without this, lazy ensureRedisStock
      // races under concurrent POST /orders (TC-T4-05).
      const ticketTypes = await this.prismaService.ticketType.findMany({
        select: {
          id: true,
          totalQty: true,
          soldQty: true,
          reservedQty: true,
        },
      });
      await Promise.all(
        ticketTypes.map((tt) =>
          this.redisService.seedStock(
            tt.id,
            tt.totalQty - tt.soldQty - tt.reservedQty,
          ),
        ),
      );

      return {
        status: 'success',
        message:
          'Database and Redis cache reset successfully with test seed data.',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Reset database failed',
        error: errorMessage,
      });
    }
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
