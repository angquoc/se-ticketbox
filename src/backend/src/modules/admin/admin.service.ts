import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { Prisma, Role } from '@prisma/client';

export interface UserListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListItem {
  id: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  role: Role;
  createdAt: Date;
  _count: { orders: number; tickets: number };
}

export interface ListUsersResponse {
  users: UserListItem[];
  meta: UserListMeta;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  services: {
    api: { status: 'up' | 'down'; latencyMs?: number; error?: string };
    postgres: { status: 'up' | 'down'; latencyMs?: number; error?: string };
    redis: { status: 'up' | 'down'; latencyMs?: number; error?: string };
    bullmq: { status: 'up' | 'down'; latencyMs?: number; error?: string };
  };
  uptime: { apiSeconds: number; processUptimeSeconds: number };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * GET /admin/users
   * ADMIN only. Paginated user list with optional search by email/name and role filter.
   */
  async listUsers(query: ListUsersQueryDto): Promise<ListUsersResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      where.OR = [
        { email: { contains: searchLower, mode: 'insensitive' } },
        { fullName: { contains: searchLower, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          role: true,
          createdAt: true,
          _count: {
            select: { orders: true, tickets: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * GET /admin/system-health
   * ADMIN only. Aggregated health status of all subsystems.
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const [postgresResult, redisResult, bullmqResult] =
      await Promise.allSettled([
        this.checkPostgresHealth(),
        this.checkRedisHealth(),
        this.checkBullmqHealth(),
      ]);

    const toResult = <T extends { status: 'up' | 'down' }>(
      r: PromiseSettledResult<T>,
      fallback: T,
    ) => (r.status === 'fulfilled' ? r.value : fallback);

    const postgres = toResult(postgresResult, {
      status: 'down',
      error: 'Health check failed',
    });
    const redis = toResult(redisResult, {
      status: 'down',
      error: 'Health check failed',
    });
    const bullmq = toResult(bullmqResult, {
      status: 'down',
      error: 'Health check failed',
    });

    const allUp =
      postgres.status === 'up' &&
      redis.status === 'up' &&
      bullmq.status === 'up';
    const allDown =
      postgres.status === 'down' &&
      redis.status === 'down' &&
      bullmq.status === 'down';

    return {
      status: allUp ? 'healthy' : allDown ? 'down' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        api: { status: 'up' },
        postgres,
        redis,
        bullmq,
      },
      uptime: {
        apiSeconds: Math.floor(process.uptime()),
        processUptimeSeconds: Math.floor(process.uptime()),
      },
    };
  }

  private async checkPostgresHealth(): Promise<{
    status: 'up' | 'down';
    latencyMs?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.prisma.checkHealth();
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: 'down',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async checkRedisHealth(): Promise<{
    status: 'up' | 'down';
    latencyMs?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const response = await this.redisService.ping();
      if (response !== 'PONG') throw new Error('Unexpected response');
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: 'down',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  private async checkBullmqHealth(): Promise<{
    status: 'up' | 'down';
    latencyMs?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      // Check Redis connection for BullMQ health (BullMQ uses Redis as its backend)
      const response = await this.redisService.ping();
      if (response !== 'PONG')
        throw new Error('BullMQ Redis backend unreachable');
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: 'down',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
