'use client';
import { useState } from 'react';
import CameraScanner from '@/components/checkin/CameraScanner';
import HistoryView from '@/components/checkin/HistoryView';
import SuccessView from '@/components/checkin/SuccessView';
import FailureView from '@/components/checkin/FailureView';

export default function CheckinPage() {
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'settings'>('scan');
  const [scanResult, setScanResult] = useState<{
    id: string;
    gate: string;
    type?: string;
    time?: string;
    status: 'valid' | 'invalid';
    errorMsg?: string;
  } | null>(null);
  const [logs, setLogs] = useState(() => {
    const initialLogs = [
      { id: 'TCK-88902', time: '14:22:10', type: 'General Admission', status: 'valid' },
      { id: 'TCK-88901', time: '14:21:45', type: 'VIP Stage A', status: 'valid' },
      { id: 'TCK-88899', time: '14:18:30', type: 'Staff Only', status: 'error' },
      { id: 'TCK-88895', time: '14:15:12', type: 'General Admission', status: 'valid' },
    ];
    const types = ['General Admission', 'VIP Stage A', 'VIP Stage B', 'Staff Only', 'Press/Media'];
    let currentId = 88894;
    const baseTime = new Date();
    baseTime.setHours(14, 12, 0); // Start going backwards from 14:12:00
    
    for (let i = 0; i < 50; i++) {
      baseTime.setSeconds(baseTime.getSeconds() - Math.floor(Math.random() * 45) - 15);
      const timeStr = baseTime.toTimeString().split(' ')[0];
      const status = Math.random() > 0.15 ? 'valid' : 'error';
      const type = status === 'error' ? 'Staff Only' : types[Math.floor(Math.random() * types.length)];
      initialLogs.push({
        id: `TCK-${currentId--}`,
        time: timeStr,
        type: type,
        status: status,
      });
    }
    return initialLogs;
  });

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
                  onScanNext={() => setScanResult(null)}
                />
              ) : (
                <FailureView
                  ticketId={scanResult.id}
                  gate={scanResult.gate}
                  scanTime={scanResult.time || '12:00:00'}
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
                      CổNG HIệN TạI
                    </span>
                    <span className="text-[15px] font-bold text-white mt-1">
                      GATE C1 - VIP NORTH
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-medium text-white/40 tracking-wider uppercase">
                      LƯợT QUÉT
                    </span>
                    <span className="text-base font-extrabold text-success mt-0.5">
                      {(1240 + logs.length).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Scanner */}
                <CameraScanner
                  onViewHistory={() => setActiveTab('history')}
                  onScan={(ticket) => {
                    setScanResult(ticket);
                    const now = new Date();
                    const timeStr = ticket.time || now.toTimeString().split(' ')[0];
                    setLogs((prev) => {
                      // Avoid double adding identical scans at the same second
                      if (prev[0] && prev[0].id === ticket.id && prev[0].time === timeStr) {
                        return prev;
                      }
                      return [
                        {
                          id: ticket.id,
                          time: timeStr,
                          type: ticket.type || (ticket.status === 'valid' ? 'General Admission' : 'Staff Only'),
                          status: ticket.status
                        },
                        ...prev,
                      ];
                    });
                  }}
                />
              </>
            )}
          </main>
        )}

        {activeTab === 'history' && (
          <HistoryView logs={logs} />
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

            <div className="bg-card-dark border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-white/40 tracking-wider uppercase">
                  THIếT Bị SOÁT VÉ
                </span>
                <span className="text-[15px] font-bold text-white">
                  iPhone 15 Pro Max - Scanner 01
                </span>
              </div>
              <hr className="border-none border-t border-white/10" />
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-white/40 tracking-wider uppercase">
                  PHIÊN BảN ỨNG DụNG
                </span>
                <span className="text-[15px] font-bold text-white">
                  v1.4.2-pwa
                </span>
              </div>
            </div>
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