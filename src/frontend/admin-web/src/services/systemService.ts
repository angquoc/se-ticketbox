import { apiClient } from '@/lib/apiClient';

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

export async function getSystemHealth(): Promise<SystemHealthStatus> {
  try {
    const startReq = Date.now();
    const [appHealthRes, redisRes] = await Promise.allSettled([
      apiClient.get<any>('/health'),
      apiClient.get<any>('/health/redis'),
    ]);
    const reqLatency = Date.now() - startReq;

    const appData = appHealthRes.status === 'fulfilled' ? appHealthRes.value.data : null;
    const redisData = redisRes.status === 'fulfilled' ? redisRes.value.data : null;

    const apiOk = appData?.status === 'ok';
    const pgOk = appData?.database?.status === 'ok';
    const redisOk = redisData?.redis === 'ok';

    const status: 'healthy' | 'degraded' | 'down' = 
      (apiOk && pgOk && redisOk) ? 'healthy' :
      (apiOk) ? 'degraded' : 'down';
      
    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        api: { status: apiOk ? 'up' : 'down', latencyMs: apiOk ? reqLatency : undefined },
        postgres: { status: pgOk ? 'up' : 'down', latencyMs: pgOk ? appData?.database?.latencyMs : undefined },
        redis: { status: redisOk ? 'up' : 'down', latencyMs: redisOk ? reqLatency : undefined },
        bullmq: { status: redisOk ? 'up' : 'down', latencyMs: redisOk ? reqLatency : undefined },
      },
      uptime: { apiSeconds: appData?.uptime || 0, processUptimeSeconds: 0 }
    };
  } catch (error: any) {
    return {
      status: 'down',
      timestamp: new Date().toISOString(),
      services: {
        api: { status: 'down' },
        postgres: { status: 'down' },
        redis: { status: 'down' },
        bullmq: { status: 'down' },
      },
      uptime: { apiSeconds: 0, processUptimeSeconds: 0 }
    };
  }
}
