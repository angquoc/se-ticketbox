'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CameraScanner from '@/components/checkin/CameraScanner';
import HistoryView from '@/components/checkin/HistoryView';
import SuccessView from '@/components/checkin/SuccessView';
import FailureView from '@/components/checkin/FailureView';
import { useOfflineCheckin, type ScanResult } from '@/hooks/useOfflineCheckin';
import { isAuthenticated, getStoredUser, getStoredGate, clearSession } from '@/services/authService';

export default function CheckinPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'settings'>('scan');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const {
    isOnline,
    pendingSyncCount,
    isSyncing,
    logs,
    handleScan,
    triggerSync,
  } = useOfflineCheckin();

  // ── Protected route ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    }
  }, [router]);

  const user = getStoredUser();
  const gate = getStoredGate();

  // ── Handle QR scan callback ──────────────────────────────────────────────
  const onQrDetected = async (rawQr: string) => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const result = await handleScan(rawQr);
      setScanResult(result);
    } finally {
      setIsScanning(false);
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

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
    <div className="min-h-screen flex flex-col items-center font-sans text-white">
      <div className={`w-full max-w-[390px] flex flex-col min-h-[100dvh] relative pb-24 box-border overflow-hidden transition-all duration-300 ${
        scanResult
          ? (scanResult.status === 'valid'
              ? 'bg-gradient-to-b from-success to-emerald-800'
              : 'bg-gradient-to-b from-error to-red-800')
          : 'bg-transparent'
      }`}>

        {/* ── Header ── */}
        <header className={`flex-shrink-0 relative z-10 flex items-center justify-between p-5 border-b transition-all duration-300 ${
          scanResult
            ? 'bg-transparent border-white/15'
            : 'bg-zinc-950/80 backdrop-blur-md border-white/10'
        }`}>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={scanResult ? '#FFFFFF' : 'var(--color-brand)'} strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-300">
              {scanResult ? (
                <>
                  <line x1="6" y1="20" x2="6" y2="14" />
                  <line x1="12" y1="20" x2="12" y2="8" />
                  <line x1="18" y1="20" x2="18" y2="3" />
                </>
              ) : (
                <>
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </>
              )}
            </svg>
            <span className="font-extrabold text-[15px] tracking-[1.5px] text-white">
              TICKETSCAN
            </span>
          </div>

          {/* Online/Offline + Pending sync badge */}
          <div className="flex items-center gap-2">
            {pendingSyncCount > 0 && !scanResult && (
              <button
                onClick={() => void triggerSync()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full px-2.5 py-1 transition-all active:scale-95 disabled:opacity-60"
                title="Đồng bộ ngay"
              >
                {isSyncing ? (
                  <div className="w-2.5 h-2.5 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-3.1" />
                  </svg>
                )}
                <span className="text-[10px] font-bold text-amber-400">{pendingSyncCount}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                isOnline ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-red-400 shadow-[0_0_6px_#f87171]'
              }`} />
              <span className={`text-[10px] font-bold tracking-wide ${
                isOnline ? 'text-green-400' : 'text-red-400'
              }`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </header>

        {/* ── Body content based on active tab ── */}
        {activeTab === 'scan' && (
          <main className="flex-1 flex flex-col px-6 pb-6 gap-6 overflow-y-auto">
            {scanResult ? (
              scanResult.status === 'valid' ? (
                <SuccessView
                  ticketId={scanResult.id}
                  gate={scanResult.gate}
                  ticketType={scanResult.type || 'General Admission'}
                  isOffline={scanResult.isOffline}
                  onScanNext={() => setScanResult(null)}
                />
              ) : (
                <FailureView
                  ticketId={scanResult.id}
                  gate={scanResult.gate}
                  scanTime={scanResult.time || ''}
                  errorMsg={scanResult.errorMsg || 'Lỗi soát vé'}
                  onScanNext={() => setScanResult(null)}
                />
              )
            ) : (
              <>
                {/* Cổng hiện tại & Lượt quét card */}
                <div className="relative z-10 bg-card-dark border border-white/10 rounded-2xl py-4 px-5 flex justify-between items-center mx-5 mt-2.5 mb-5 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                      CỔNG HIỆN TẠI
                    </span>
                    <span className="text-[15px] font-bold text-white mt-1">
                      {gate || 'Chưa chọn cổng'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                      LƯỢT QUÉT
                    </span>
                    <span className="text-base font-extrabold text-success mt-0.5">
                      {logs.length.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Scanner */}
                <CameraScanner
                  onViewHistory={() => setActiveTab('history')}
                  onScan={onQrDetected}
                />
              </>
            )}
          </main>
        )}

        {activeTab === 'history' && (
          <HistoryView logs={logs} pendingSyncCount={pendingSyncCount} />
        )}

        {activeTab === 'settings' && (
          <main className="flex-1 flex flex-col px-6 pb-6 gap-6 overflow-y-auto z-10">
            {/* Title & Subtitle */}
            <div className="my-3.5 mx-0">
              <h1 className="text-[28px] font-extrabold text-white tracking-tight">
                Cài đặt
              </h1>
              <p className="text-[13px] font-medium text-white/50 mt-1">
                Quản lý cấu hình ứng dụng soát vé
              </p>
            </div>

            {/* Staff Info card */}
            <div className="bg-card-dark border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-white/40 tracking-wider uppercase">
                  NHÂN VIÊN
                </span>
                <span className="text-[15px] font-bold text-white">
                  {user?.name || user?.email || 'Không xác định'}
                </span>
                {user?.email && user?.name && (
                  <span className="text-[12px] text-white/40">{user.email}</span>
                )}
              </div>
              <hr className="border-none border-t border-white/10" />
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-white/40 tracking-wider uppercase">
                  CỔNG HIỆN TẠI
                </span>
                <span className="text-[15px] font-bold text-white">
                  {gate || 'Chưa chọn cổng'}
                </span>
              </div>
              <hr className="border-none border-t border-white/10" />
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-white/40 tracking-wider uppercase">
                  PHIÊN BẢN ỨNG DỤNG
                </span>
                <span className="text-[15px] font-bold text-white">
                  v4.2.0-pwa
                </span>
              </div>
            </div>

            {/* Sync info card */}
            <div className="bg-card-dark border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-white/40 tracking-wider uppercase">
                    CHỜ ĐỒNG BỘ
                  </span>
                  <span className={`text-[15px] font-bold ${pendingSyncCount > 0 ? 'text-amber-400' : 'text-success'}`}>
                    {pendingSyncCount} bản ghi
                  </span>
                </div>
                {pendingSyncCount > 0 && isOnline && (
                  <button
                    onClick={() => void triggerSync()}
                    disabled={isSyncing}
                    className="flex items-center gap-2 bg-brand/15 border border-brand/30 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-brand transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <div className="w-3.5 h-3.5 border border-brand border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 .49-3.1" />
                      </svg>
                    )}
                    {isSyncing ? 'Đang sync...' : 'Đồng bộ ngay'}
                  </button>
                )}
              </div>
            </div>

            {/* Logout */}
            <button
              id="logout-btn"
              onClick={handleLogout}
              className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all active:scale-95 mt-auto"
              style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)' }}
            >
              Đăng xuất
            </button>
          </main>
        )}

        {/* ── Fixed Bottom Navigation Bar ── */}
        <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] h-[76px] flex justify-around items-center px-6 pb-3 box-border z-[100] border-t transition-all duration-300 ${
          scanResult
            ? 'bg-transparent border-white/15'
            : 'bg-zinc-950/80 backdrop-blur-md border-white/5'
        }`}>
          {/* QR Tab */}
          <button
            id="tab-scan"
            onClick={() => {
              setScanResult(null);
              setActiveTab('scan');
            }}
            className={`border-none rounded-2xl w-[46px] h-[46px] flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
              !scanResult && activeTab === 'scan'
                ? 'bg-brand text-white shadow-md'
                : scanResult
                  ? 'text-white/60'
                  : 'text-white/40 hover:text-white'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>

          {/* History Tab */}
          <button
            id="tab-history"
            onClick={() => {
              setScanResult(null);
              setActiveTab('history');
            }}
            className={`border-none rounded-2xl w-[46px] h-[46px] flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
              !scanResult && activeTab === 'history'
                ? 'bg-brand text-white shadow-md'
                : scanResult
                  ? 'text-white/60'
                  : 'text-white/40 hover:text-white'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

          {/* Settings Tab */}
          <button
            id="tab-settings"
            onClick={() => {
              setScanResult(null);
              setActiveTab('settings');
            }}
            className={`border-none rounded-2xl w-[46px] h-[46px] flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 ${
              !scanResult && activeTab === 'settings'
                ? 'bg-brand text-white shadow-md'
                : scanResult
                  ? 'text-white/60'
                  : 'text-white/40 hover:text-white'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
}
