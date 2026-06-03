'use client';
import { useState } from 'react';
import CameraScanner from '@/components/checkin/CameraScanner';

export default function CheckinPage() {
  const [logs] = useState<{ id: string; name: string; time: string }[]>([]);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0b1120' }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 px-5 pt-12 pb-5 text-center"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h1 className="text-xl font-bold text-white tracking-wide">Check-in</h1>
        <p className="text-xs text-slate-400 mt-1">Quét mã QR soát vé</p>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col px-5 py-6 gap-6 overflow-y-auto">

        {/* Scanner */}
        <CameraScanner />

        {/* Recent checkins */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            {/* List SVG icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="text-white font-semibold text-sm">Lịch sử gần đây</h2>
          </div>

          {logs.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-5">
              Chưa có lượt check-in nào
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex justify-between items-center px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  <span className="text-green-300 text-sm font-medium">{log.name}</span>
                  <span className="text-slate-400 text-xs">{log.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 py-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-slate-600 text-xs">TicketBox Check-in v1.0 · Offline-ready</p>
      </footer>
    </div>
  );
}