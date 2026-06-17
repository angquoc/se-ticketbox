'use client';

interface FailureViewProps {
  ticketId: string;
  gate: string;
  scanTime: string;
  errorMsg: string;
  onScanNext: () => void;
}

export default function FailureView({ ticketId, gate, scanTime, errorMsg, onScanNext }: FailureViewProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: '20px',
      paddingBottom: '20px',
      flex: 1,
      width: '100%',
    }}>
      {/* White circle with cross */}
      <div style={{
        width: '130px',
        height: '130px',
        borderRadius: '50%',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        marginBottom: '28px',
      }}>
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>

      {/* KHÔNG HỢP LỆ text */}
      <h2 style={{
        fontSize: '34px',
        fontWeight: 900,
        color: '#FFFFFF',
        letterSpacing: '1.5px',
        marginBottom: '32px',
        textAlign: 'center',
      }}>
        KHÔNG HỢP LỆ
      </h2>

      {/* Details Card */}
      <div style={{
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        padding: '24px 20px',
        marginBottom: '40px',
        boxSizing: 'border-box',
      }}>
        {/* Ticket ID */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.65)', letterSpacing: '1px' }}>
            MÃ VÉ
          </span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px', letterSpacing: '0.5px' }}>
            {ticketId}
          </span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.15)', marginBottom: '20px' }} />

        {/* Details columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.65)', letterSpacing: '1px' }}>
              CỔNG
            </span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px' }}>
              {gate}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.65)', letterSpacing: '1px' }}>
              THỜI GIAN QUÉT
            </span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px' }}>
              {scanTime}
            </span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.15)', marginBottom: '20px' }} />

        {/* Error message and Guidance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.65)', letterSpacing: '1px' }}>
            THÔNG BÁO LỖI
          </span>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFE4E6', lineHeight: '1.4' }}>
            {errorMsg}
          </span>
          <p style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#FFFFFF',
            margin: '12px 0 0',
            lineHeight: '1.4',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '10px 14px',
            borderRadius: '10px',
          }}>
            Vui lòng hướng dẫn khách hàng tới quầy hỗ trợ.
          </p>
        </div>
      </div>

      {/* Tiếp tục button */}
      <button
        onClick={onScanNext}
        style={{
          width: '100%',
          height: '56px',
          backgroundColor: '#FFFFFF',
          border: 'none',
          borderRadius: '16px',
          color: '#EF4444',
          fontSize: '15px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          transition: 'transform 150ms, opacity 150ms',
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {/* Scan SVG icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        Tiếp tục
      </button>
    </div>
  );
}
