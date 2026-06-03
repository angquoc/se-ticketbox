'use client';
import { useState } from 'react';
import CameraScanner from '@/components/checkin/CameraScanner';

interface CheckinLog {
  id: string;
  ticketId: string;
  name: string;
  time: string;
  status: 'success' | 'error';
}

export default function CheckinPage() {
  const [logs, setLogs] = useState<CheckinLog[]>([]);

  const handleScan = (data: string) => {
    console.log('[Checkin] Scanned:', data);
    // Tuần 2 sẽ xử lý QR thật ở đây
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      
      {/* Header */}
      <header className="bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-6 border-b border-slate-700">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">📷 Check-in</h1>
          <p className="text-xs text-slate-400 mt-1">Quét mã QR soát vé</p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 overflow-y-auto">
        <CameraScanner onScan={handleScan} />

        {/* Recent checkins */}
        <div className="mt-8 bg-slate-900/50 rounded-xl p-4 border border-slate-700">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span>📋</span> Lịch sử gần đây
          </h2>
          
          {logs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">
              Chưa có lượt check-in nào
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg text-sm ${
                    log.status === 'success'
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  <div className="font-medium">{log.name}</div>
                  <div className="text-xs opacity-80">{log.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-700 px-4 py-3 text-xs text-slate-500 text-center">
        TicketBox Check-in v1.0 • Offline-ready
      </footer>
    </div>
  );
}