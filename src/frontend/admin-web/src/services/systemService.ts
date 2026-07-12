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
  const res = await apiClient.get<SystemHealthStatus>('/admin/system-health');
  return res.data;
}
