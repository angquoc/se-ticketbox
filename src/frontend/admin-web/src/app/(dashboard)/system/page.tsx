'use client';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Spinner from '@/components/ui/Spinner';

export default function SystemHealthPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { health, loading, lastUpdated, refresh } = useSystemHealth();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  if (authLoading || !isAdmin) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={32} />
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
  };

  const getStatusColor = (status?: string) => {
    if (status === 'up' || status === 'healthy') return '#16A34A'; // Green
    if (status === 'degraded') return '#D97706'; // Amber
    return '#DC2626'; // Red
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontWeight: 700,
            fontSize: '30px',
            lineHeight: '36px',
            letterSpacing: '-0.6px',
            color: '#191B23',
            margin: 0,
          }}>System Health</h1>
          <p style={{
            fontWeight: 400,
            fontSize: '14px',
            lineHeight: '20px',
            color: '#434654',
            margin: '4px 0 0',
          }}>Monitor the real-time status of backend services and infrastructure.</p>
        </div>
        <button
          onClick={refresh}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', border: '1px solid var(--color-border)',
            borderRadius: '4px', background: 'var(--color-bg-white)',
            cursor: 'pointer', fontSize: '14px', fontWeight: 500,
            color: 'var(--color-text-primary)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Refresh
        </button>
      </div>

      {loading && !health ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px' }}>
          <Spinner size={32} />
        </div>
      ) : health ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Overall Status */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '24px', borderRadius: '8px', border: '1px solid var(--color-border)',
            background: 'var(--color-bg-white)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%',
                background: getStatusColor(health.status),
                boxShadow: `0 0 8px ${getStatusColor(health.status)}`
              }}></div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                  System is {health.status}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Last updated: {lastUpdated?.toLocaleTimeString()}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Uptime</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                {formatUptime(health.uptime.processUptimeSeconds)}
              </div>
            </div>
          </div>

          {/* Subsystems */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* API Node */}
            <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-white)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>API Server</h3>
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: health.services.api.status === 'up' ? '#DCFCE7' : '#FEE2E2', color: health.services.api.status === 'up' ? '#166534' : '#991B1B' }}>
                  {health.services.api.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Latency</span>
                <span style={{ fontWeight: 500 }}>{health.services.api.latencyMs ? `${health.services.api.latencyMs}ms` : '—'}</span>
              </div>
              {health.services.api.error && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#DC2626' }}>{health.services.api.error}</div>
              )}
            </div>

            {/* PostgreSQL */}
            <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-white)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>PostgreSQL</h3>
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: health.services.postgres.status === 'up' ? '#DCFCE7' : '#FEE2E2', color: health.services.postgres.status === 'up' ? '#166534' : '#991B1B' }}>
                  {health.services.postgres.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Latency</span>
                <span style={{ fontWeight: 500 }}>{health.services.postgres.latencyMs ? `${health.services.postgres.latencyMs}ms` : '—'}</span>
              </div>
              {health.services.postgres.error && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#DC2626' }}>{health.services.postgres.error}</div>
              )}
            </div>

            {/* Redis */}
            <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-white)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Redis Cache</h3>
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: health.services.redis.status === 'up' ? '#DCFCE7' : '#FEE2E2', color: health.services.redis.status === 'up' ? '#166534' : '#991B1B' }}>
                  {health.services.redis.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Latency</span>
                <span style={{ fontWeight: 500 }}>{health.services.redis.latencyMs ? `${health.services.redis.latencyMs}ms` : '—'}</span>
              </div>
              {health.services.redis.error && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#DC2626' }}>{health.services.redis.error}</div>
              )}
            </div>

            {/* BullMQ */}
            <div style={{ padding: '20px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-white)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Background Workers (BullMQ)</h3>
                <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: health.services.bullmq.status === 'up' ? '#DCFCE7' : '#FEE2E2', color: health.services.bullmq.status === 'up' ? '#166534' : '#991B1B' }}>
                  {health.services.bullmq.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Latency</span>
                <span style={{ fontWeight: 500 }}>{health.services.bullmq.latencyMs ? `${health.services.bullmq.latencyMs}ms` : '—'}</span>
              </div>
              {health.services.bullmq.error && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#DC2626' }}>{health.services.bullmq.error}</div>
              )}
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}
