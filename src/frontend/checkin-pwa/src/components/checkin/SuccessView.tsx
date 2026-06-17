'use client';

interface SuccessViewProps {
  ticketId: string;
  gate: string;
  ticketType: string;
  onScanNext: () => void;
}

export default function SuccessView({ ticketId, gate, ticketType, onScanNext }: SuccessViewProps) {
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
      {/* White circle with checkmark */}
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
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* HỢP LỆ text */}
      <h2 style={{
        fontSize: '34px',
        fontWeight: 900,
        color: '#FFFFFF',
        letterSpacing: '1.5px',
        marginBottom: '32px',
        textAlign: 'center',
      }}>
        HỢP LỆ
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
              LOẠI VÉ
            </span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '6px', lineHeight: '1.2' }}>
              {ticketType}
            </span>
          </div>
        </div>
      </div>

      {/* QUÉT TIẾP THEO button */}
      <button
        onClick={onScanNext}
        style={{
          width: '100%',
          height: '56px',
          backgroundColor: '#FFFFFF',
          border: 'none',
          borderRadius: '16px',
          color: '#10B981',
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
