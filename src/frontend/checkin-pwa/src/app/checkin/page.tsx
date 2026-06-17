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
    let baseTime = new Date();
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
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        color: '#FFFFFF',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '390px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        position: 'relative',
        paddingBottom: '96px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: scanResult
          ? (scanResult.status === 'valid'
              ? 'linear-gradient(180deg, #10B981 0%, #059669 100%)'
              : 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)')
          : 'transparent',
        transition: 'background 300ms ease',
      }}>

        {/* ── Header ── */}
        <header
          className="flex-shrink-0 relative z-10"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 20px 20px',
            background: scanResult ? 'transparent' : 'rgba(18, 18, 20, 0.85)',
            backdropFilter: scanResult ? 'none' : 'blur(10px)',
            WebkitBackdropFilter: scanResult ? 'none' : 'blur(10px)',
            borderBottom: scanResult ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255,255,255,0.08)',
            zIndex: 10,
            transition: 'background 300ms ease, border-bottom 300ms ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={scanResult ? '#FFFFFF' : '#7C5CFC'} strokeWidth="2.5" strokeLinecap="round" style={{ transition: 'stroke 300ms' }}>
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
            <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '1.5px', color: '#FFFFFF' }}>
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
                <div className="relative z-10" style={{
                  background: '#1C1C1E',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  margin: '10px 20px 20px',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px' }}>
                      CỔNG HIỆN TẠI
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>
                      GATE C1 - VIP NORTH
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px' }}>
                      LƯỢT QUÉT
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
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
          <main className="flex-1 flex flex-col px-6 pb-6 gap-6 overflow-y-auto" style={{ zIndex: 10 }}>
            {/* Title & Subtitle */}
            <div style={{ margin: '15px 0 10px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                Cài đặt
              </h1>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                Quản lý cấu hình ứng dụng soát vé
              </p>
            </div>

            <div style={{
              background: '#1C1C1E',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px' }}>
                  THIẾT BỊ SOÁT VÉ
                </span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                  iPhone 15 Pro Max - Scanner 01
                </span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px' }}>
                  PHIÊN BẢN ỨNG DỤNG
                </span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                  v1.4.2-pwa
                </span>
              </div>
            </div>
          </main>
        )}

        {/* ── Fixed Bottom Navigation Bar ── */}
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '390px',
          height: '76px',
          background: scanResult ? 'transparent' : 'rgba(18, 18, 20, 0.85)',
          backdropFilter: scanResult ? 'none' : 'blur(10px)',
          WebkitBackdropFilter: scanResult ? 'none' : 'blur(10px)',
          borderTop: scanResult ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 24px 12px',
          boxSizing: 'border-box',
          zIndex: 100,
          transition: 'background 300ms ease, border-top 300ms ease',
        }}>
          {/* QR Tab */}
          <button
            onClick={() => {
              setScanResult(null);
              setActiveTab('scan');
            }}
            style={{
              background: !scanResult && activeTab === 'scan' ? '#6366f1' : 'none',
              border: 'none',
              borderRadius: '16px',
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeTab === 'scan' ? '#FFFFFF' : (scanResult ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)'),
              cursor: 'pointer',
              transition: 'background 200ms, color 200ms',
            }}
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
            style={{
              background: !scanResult && activeTab === 'history' ? '#6366f1' : 'none',
              border: 'none',
              borderRadius: '16px',
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeTab === 'history' ? '#FFFFFF' : (scanResult ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)'),
              cursor: 'pointer',
              transition: 'background 200ms, color 200ms',
            }}
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
            style={{
              background: !scanResult && activeTab === 'settings' ? '#6366f1' : 'none',
              border: 'none',
              borderRadius: '16px',
              width: '46px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeTab === 'settings' ? '#FFFFFF' : (scanResult ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)'),
              cursor: 'pointer',
              transition: 'background 200ms, color 200ms',
            }}
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