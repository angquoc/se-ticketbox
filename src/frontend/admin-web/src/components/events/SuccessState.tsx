import React from 'react';

export default function SuccessState() {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: '16px', minHeight: '400px',
      }}
    >
      <div
        style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p style={{ fontSize: '18px', fontWeight: 600, color: '#191B23', margin: 0 }}>Event Created!</p>
      <p style={{ fontSize: '13px', color: '#434654', margin: 0 }}>Redirecting to event list…</p>
    </div>
  );
}
