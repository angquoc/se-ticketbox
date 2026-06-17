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
}

export default function HistoryView({ logs }: HistoryViewProps) {
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
    <div key={idx} style={{
      background: '#1C1C1E',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Icon container */}
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          border: scan.status === 'valid' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
          background: scan.status === 'valid' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {scan.status === 'valid' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.3px' }}>
            #{scan.id}
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            {scan.time} • {scan.type}
          </span>
        </div>
      </div>

      {/* Status Text */}
      <div style={{
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.5px',
        color: scan.status === 'valid' ? '#10B981' : '#EF4444',
        textAlign: 'right',
        whiteSpace: 'pre-line',
        lineHeight: '1.2',
      }}>
        {scan.status === 'valid' ? 'HỢP\nLỆ' : 'LỖI'}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <main className="flex-1 flex flex-col px-6 pb-6 gap-6 overflow-y-auto" style={{ zIndex: 10 }}>
        {/* Title & Subtitle */}
        <div style={{ margin: '15px 15px 10px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            Lịch sử soát vé
          </h1>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            Theo dõi và quản lý dữ liệu quét
          </p>
        </div>

        {/* Statistics Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '20px 20px 25px' }}>
          {/* Đã quét */}
          <div style={{
            background: '#1C1C1E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px' }}>
              ĐÃ QUÉT
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>
              {(1240 + logs.length).toLocaleString()}
            </span>
          </div>

          {/* Chờ đồng bộ */}
          <div style={{
            background: '#1C1C1E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px' }}>
              CHỜ ĐỒNG BỘ
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
              0
            </span>
          </div>
        </div>

        {/* Recent scans list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '10px 15px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#c5c9f5ff', letterSpacing: '0.5px' }}>
              Gần đây
            </span>
            <button 
              onClick={openPanel}
              style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#818cf8', cursor: 'pointer' }}
            >
              Xem tất cả
            </button>
          </div>

          {/* Scan Cards List (limited to 5) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {logs.slice(0, 5).map((scan, idx) => renderScanCard(scan, idx))}
          </div>
        </div>
      </main>

      {/* Slide-up Paginated Scrolling Panel */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#121214',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        transform: isPanelOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 350ms cubic-bezier(0.32, 0.94, 0.6, 1)',
        pointerEvents: isPanelOpen ? 'auto' : 'none',
        overflow: 'hidden',
      }}>
        {/* Panel Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(18, 18, 20, 0.95)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setIsPanelOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#FFFFFF',
                transition: 'background 200ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
              Lịch sử quét
            </h2>
          </div>
          
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.4)',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px 10px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}>
            Tổng: {logs.length}
          </span>
        </div>

        {/* Scrollable Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Card list */}
          {logs.slice(0, visibleCount).map((scan, idx) => renderScanCard(scan, idx))}

          {/* Loader and sentinel */}
          <div ref={loaderRef} style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px 0',
            minHeight: '60px',
          }}>
            {isLoadingMore ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  borderTop: '2px solid #818cf8',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>
                  Đang tải thêm...
                </span>
              </div>
            ) : (
              visibleCount >= logs.length && (
                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.3)', fontWeight: 500 }}>
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
