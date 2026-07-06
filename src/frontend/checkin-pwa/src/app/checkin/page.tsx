'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import CameraScanner from '@/components/checkin/CameraScanner';
import { useGateConfig } from '@/contexts/GateConfigContext';
import { parseQrPayload } from '@/lib/qr-utils';
import { saveOfflineRecord, getAllOfflineRecords, deleteOfflineRecord } from '@/lib/offline-storage';

type CheckinResult = {
  id: string;
  ticketType: string;
  ticketId: string;
  time: string;
  success: boolean;
  message?: string;
};

type OnlineStatus = 'online' | 'offline' | 'syncing';

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown';
  let deviceId = localStorage.getItem('tb_device_id');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('tb_device_id', deviceId);
  }
  return deviceId;
}

export default function CheckinPage() {
  const { config: gateConfig, isConfigured, setGateConfig, clearGateConfig } = useGateConfig();
  const [setupGateInput, setSetupGateInput] = useState('');
  const [logs, setLogs] = useState<CheckinResult[]>([]);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>('online');
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const processingRef = useRef(false);
  const deviceIdRef = useRef<string>('');

  useEffect(() => {
    deviceIdRef.current = getDeviceId();
    checkPendingCount();
  }, []);

  // Monitor online/offline
  useEffect(() => {
    const onOnline = () => {
      setOnlineStatus('online');
      triggerSync();
    };
    const onOffline = () => setOnlineStatus('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    setOnlineStatus(navigator.onLine ? 'online' : 'offline');
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  async function checkPendingCount() {
    try {
      const records = await getAllOfflineRecords();
      setPendingCount(records.length);
    } catch {
      setPendingCount(0);
    }
  }

  async function triggerSync() {
    if (isSyncing) return;
    const records = await getAllOfflineRecords();
    if (records.length === 0) return;

    setIsSyncing(true);
    setOnlineStatus('syncing');

    try {
      const response = await fetch('/api/checkin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tb_token') ?? ''}`,
        },
        body: JSON.stringify({ records }),
      });

      if (response.ok) {
        const data = await response.json();
        for (const result of data.results ?? []) {
          if (result.success || result.conflict) {
            await deleteOfflineRecord(result.offlineEventId);
          }
        }
        await checkPendingCount();
      }
    } catch {
      // offline — will retry later
    } finally {
      setIsSyncing(false);
      setOnlineStatus(navigator.onLine ? 'online' : 'offline');
    }
  }

  const handleQrScanned = useCallback(
    async (qrPayload: string) => {
      if (processingRef.current) return;
      if (!isConfigured || !gateConfig) return;

      processingRef.current = true;

      try {
        const parsed = parseQrPayload(qrPayload);

        if (!parsed) {
          showResult({ id: '0', ticketType: '', ticketId: '', time: now(), success: false, message: 'QR không hợp lệ (format lỗi)' });
          return;
        }

        const { ticketId, rawToken, gateId } = parsed;

        // Gate mismatch check (offline-first)
        if (gateId && gateId !== gateConfig.gateId) {
          showResult({
            id: ticketId,
            ticketType: '',
            ticketId,
            time: now(),
            success: false,
            message: `Sai cổng: vé này thuộc ${gateId}, bạn đang ở ${gateConfig.gateId}`,
          });
          return;
        }

        // Online check-in
        if (navigator.onLine) {
          await doOnlineCheckin(ticketId, rawToken, gateId);
        } else {
          await doOfflineCheckin(ticketId, rawToken, gateId);
        }
      } finally {
        setTimeout(() => { processingRef.current = false; }, 1500);
      }
    },
    [isConfigured, gateConfig],
  );

  async function doOnlineCheckin(ticketId: string, token: string, gateId: string) {
    try {
      const response = await fetch('/api/checkin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tb_token') ?? ''}`,
        },
        body: JSON.stringify({
          ticketId,
          token,
          deviceId: deviceIdRef.current,
          gateId: gateConfig?.gateId ?? gateId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showResult({
          id: ticketId,
          ticketType: data.ticketTypeName ?? '',
          ticketId,
          time: now(),
          success: true,
        });
      } else {
        showResult({
          id: ticketId,
          ticketType: '',
          ticketId,
          time: now(),
          success: false,
          message: data.message ?? 'Check-in thất bại',
        });
      }
    } catch {
      // Fallback to offline on network error
      await doOfflineCheckin(ticketId, token, gateId);
    }
  }

  async function doOfflineCheckin(ticketId: string, token: string, gateId: string) {
    const offlineEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      ticketId,
      token,
      gateId: gateConfig?.gateId ?? gateId,
      deviceId: deviceIdRef.current,
      offlineEventId,
      scannedAt: new Date().toISOString(),
    };

    await saveOfflineRecord(record);
    setPendingCount((c) => c + 1);

    showResult({
      id: ticketId,
      ticketType: '',
      ticketId,
      time: now(),
      success: true,
      message: 'Đã lưu offline — sẽ đồng bộ khi có mạng',
    });
  }

  function showResult(result: CheckinResult) {
    setLastResult(result);
    setLogs((prev) => [result, ...prev].slice(0, 20));
    setTimeout(() => setLastResult(null), 5000);
  }

  function now() {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // ─── Gate Setup Screen ───────────────────────────────────────────────────────
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0b1120' }}>
        <header className="flex-shrink-0 px-5 pt-12 pb-5 text-center"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h1 className="text-xl font-bold text-white tracking-wide">Cài đặt Cổng</h1>
          <p className="text-xs text-slate-400 mt-1">Chọn cổng check-in cho thiết bị này</p>
        </header>

        <main className="flex-1 flex flex-col px-5 py-6 gap-6">
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-white font-semibold text-sm mb-4">Cổng Check-in</h2>
            <div className="flex flex-col gap-3">
              {['GATE-A', 'GATE-B', 'GATE-C', 'GATE-D', 'GATE-E'].map((gate) => (
                <button
                  key={gate}
                  onClick={() => setGateConfig({ gateId: gate })}
                  className="w-full py-3 px-4 rounded-xl text-left text-sm font-medium transition-all active:scale-95"
                  style={{
                    background: 'rgba(99,102,241,0.15)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#a5b4fc',
                  }}
                >
                  {gate}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <input
                type="text"
                placeholder="Hoặc nhập tên cổng khác..."
                value={setupGateInput}
                onChange={(e) => setSetupGateInput(e.target.value)}
                className="w-full py-3 px-4 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              {setupGateInput.trim() && (
                <button
                  onClick={() => {
                    if (setupGateInput.trim()) {
                      setGateConfig({ gateId: setupGateInput.trim().toUpperCase() });
                    }
                  }}
                  className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-white active:scale-95 transition-all"
                  style={{ background: '#4f46e5' }}
                >
                  Xác nhận: {setupGateInput.trim().toUpperCase()}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-slate-500 text-xs leading-relaxed">
              Thiết bị check-in cần được gán vào một cổng. Mỗi cổng chỉ chấp nhận vé có mã QR chứa đúng tên cổng đó.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ─── Main Check-in Screen ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b1120' }}>
      {/* Header */}
      <header className="flex-shrink-0 px-5 pt-12 pb-4 text-center"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <span className="text-green-400 text-xs font-medium">{gateConfig?.gateId}</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide flex-1 text-center">Check-in</h1>
          <button
            onClick={clearGateConfig}
            className="text-slate-600 text-xs hover:text-slate-400 transition-colors"
          >
            Đổi cổng
          </button>
        </div>

        {/* Online status + pending badge */}
        <div className="flex items-center justify-center gap-3 mt-2">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: onlineStatus === 'online' ? '#22c55e' : onlineStatus === 'syncing' ? '#f59e0b' : '#ef4444',
                boxShadow: onlineStatus === 'online' ? '0 0 6px #22c55e' : 'none',
              }}
            />
            <span className="text-xs" style={{
              color: onlineStatus === 'online' ? '#4ade80' : onlineStatus === 'syncing' ? '#fbbf24' : '#f87171',
            }}>
              {onlineStatus === 'online' ? 'Trực tuyến' : onlineStatus === 'syncing' ? 'Đang đồng bộ...' : 'Offline'}
            </span>
          </div>
          {pendingCount > 0 && (
            <button
              onClick={triggerSync}
              disabled={!navigator.onLine || isSyncing}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              {pendingCount} chờ sync
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col px-5 py-4 gap-4 overflow-y-auto">

        {/* Last result banner */}
        {lastResult && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: lastResult.success
                ? 'rgba(34,197,94,0.15)'
                : 'rgba(239,68,68,0.15)',
              border: `1px solid ${lastResult.success ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              {lastResult.success ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`font-semibold text-sm ${lastResult.success ? 'text-green-300' : 'text-red-300'}`}>
                {lastResult.success ? 'Check-in thành công' : 'Check-in thất bại'}
              </span>
              <span className="text-slate-400 text-xs ml-auto">{lastResult.time}</span>
            </div>
            {lastResult.ticketType && (
              <p className="text-green-200 text-xs ml-7">{lastResult.ticketType}</p>
            )}
            {lastResult.message && (
              <p className={`text-xs ml-7 mt-0.5 ${lastResult.success ? 'text-green-300' : 'text-red-300'}`}>
                {lastResult.message}
              </p>
            )}
          </div>
        )}

        {/* Scanner — pass gate-aware handler */}
        <CameraScanner onScan={handleQrScanned} />

        {/* Recent checkins */}
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-white font-semibold text-sm">Lịch sử gần đây</h2>
            {logs.length > 0 && (
              <button onClick={() => setLogs([])} className="ml-auto text-slate-600 text-xs hover:text-slate-400">
                Xoá
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-5">
              Chưa có lượt check-in nào
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {logs.map((log) => (
                <div key={`${log.id}-${log.time}`}
                  className="flex justify-between items-center px-3 py-2 rounded-xl"
                  style={{
                    background: log.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${log.success ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                  }}
                >
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${log.success ? 'text-green-300' : 'text-red-300'}`}>
                      {log.success ? 'Thành công' : log.message ?? 'Thất bại'}
                    </span>
                    {log.ticketType && (
                      <span className="text-slate-500 text-xs">{log.ticketType}</span>
                    )}
                  </div>
                  <span className="text-slate-500 text-xs">{log.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 py-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-slate-600 text-xs">
          TicketBox Check-in · {gateConfig?.gateId} · Offline-ready
        </p>
      </footer>
    </div>
  );
}
