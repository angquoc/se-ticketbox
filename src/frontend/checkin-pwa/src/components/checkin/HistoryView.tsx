'use client';
import { useState, useEffect, useRef } from 'react';

interface ScanLog {
  id: string;
  time: string;
  type: string;
  status: string;
}

interface HistoryViewProps {
  logs: ScanLog[];
  pendingSyncCount?: number;
}

export default function HistoryView({ logs, pendingSyncCount = 0 }: HistoryViewProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPanelOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && visibleCount < logs.length && !isLoadingMore) {
          setIsLoadingMore(true);
          // 600ms artificial delay to give a premium, smooth transition feel
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + 20, logs.length));
            setIsLoadingMore(false);
          }, 600);
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [isPanelOpen, visibleCount, logs.length, isLoadingMore]);

  const openPanel = () => {
    setVisibleCount(20);
    setIsPanelOpen(true);
  };

  const renderScanCard = (scan: ScanLog, idx: number) => (
    <div key={idx} className="bg-card-dark border border-white/8 rounded-2xl p-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3.5">
        {/* Icon container */}
        <div className={`w-[38px] h-[38px] rounded-lg flex items-center justify-center border ${
          scan.status === 'valid'
            ? 'border-success/20 bg-success/5'
            : 'border-error/20 bg-error/5'
        }`}>
          {scan.status === 'valid' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-extrabold text-white tracking-wide">
            #{scan.id}
          </span>
          <span className="text-[11px] text-white/40 font-medium">
            {scan.time} • {scan.type}
          </span>
        </div>
      </div>

      {/* Status Text */}
      <div className={`text-[11px] font-extrabold tracking-wide text-right whitespace-pre-line leading-tight ${
        scan.status === 'valid' ? 'text-success' : 'text-error'
      }`}>
        {scan.status === 'valid' ? 'HỢP\nLỆ' : 'LỖI'}
      </div>
    </div>
  );

  return (
    <>
      <main className="flex-1 flex flex-col px-6 pb-6 gap-6 overflow-y-auto z-10">
        {/* Title & Subtitle */}
        <div className="my-3.5 mx-3.5">
          <h1 className="text-[28px] font-extrabold text-white tracking-tight">
            Lịch sử soát vé
          </h1>
          <p className="text-[13px] font-medium text-white/50 mt-1">
            Theo dõi và quản lý dữ liệu quét
          </p>
        </div>

        {/* Statistics Cards Row */}
        <div className="grid grid-cols-2 gap-3 mx-5 mt-5 mb-6">
          {/* Đã quét */}
          <div className="bg-card-dark border border-white/8 rounded-2xl py-4 px-5 flex flex-col gap-1.5 shadow-sm">
            <span className="text-[10px] font-semibold text-white/40 tracking-wider uppercase">
              ĐÃ QUÉT
            </span>
            <span className="text-xl font-extrabold text-white">
              {logs.length.toLocaleString()}
            </span>
          </div>

          {/* Chờ đồng bộ */}
          <div className="bg-card-dark border border-white/8 rounded-2xl py-4 px-5 flex flex-col gap-1.5 shadow-sm">
            <span className="text-[10px] font-semibold text-white/40 tracking-wider uppercase">
              CHỜ ĐỒNG BỘ
            </span>
            <span className={`text-xl font-extrabold ${pendingSyncCount > 0 ? 'text-amber-400' : 'text-success'}`}>
              {pendingSyncCount}
            </span>
          </div>
        </div>

        {/* Recent scans list */}
        <div className="flex flex-col gap-3 mx-3.5 mt-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-bold text-indigo-200 tracking-wide">
              Gần đây
            </span>
            <button
              onClick={openPanel}
              className="bg-none border-none text-[13px] font-semibold text-indigo-400 cursor-pointer hover:text-indigo-300 transition-colors duration-200 active:scale-95"
            >
              Xem tất cả
            </button>
          </div>

          {/* Scan Cards List (limited to 5) */}
          <div className="flex flex-col gap-2.5">
            {logs.slice(0, 5).map((scan, idx) => renderScanCard(scan, idx))}
          </div>
        </div>
      </main>

      {/* Slide-up Paginated Scrolling Panel */}
      <div className={`absolute inset-0 bg-[#121214] z-[1000] flex flex-col transition-transform duration-350 ease-[cubic-bezier(0.32,0.94,0.6,1)] overflow-hidden ${
        isPanelOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
      }`}>
        {/* Panel Header */}
        <div className="flex items-center justify-between py-5 px-6 border-b border-white/8 bg-zinc-950/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPanelOpen(false)}
              className="bg-white/6 border-none rounded-full w-11 h-11 flex items-center justify-center cursor-pointer text-white transition-all duration-200 hover:bg-white/10 active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <h2 className="text-18 font-extrabold text-white text-lg">
              Lịch sử quét
            </h2>
          </div>
          
          <span className="text-xs font-semibold text-white/40 bg-white/5 py-1 px-2.5 rounded-full border border-white/5">
            Tổng: {logs.length}
          </span>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto py-5 px-6 pb-10 flex flex-col gap-3">
          {/* Card list */}
          {logs.slice(0, visibleCount).map((scan, idx) => renderScanCard(scan, idx))}

          {/* Loader and sentinel */}
          <div ref={loaderRef} className="flex justify-center items-center py-5 min-h-[60px]">
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/10 border-t-indigo-400 rounded-full animate-spin" />
                <span className="text-[13px] text-white/50 font-medium">
                  Đang tải thêm...
                </span>
              </div>
            ) : (
              visibleCount >= logs.length && (
                <span className="text-xs text-white/30 font-medium">
                  Đã hiển thị tất cả {logs.length} lượt quét
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
