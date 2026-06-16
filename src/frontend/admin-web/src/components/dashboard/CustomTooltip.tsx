import React from 'react';

export default function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      borderRadius: '6px',
      padding: '8px 12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <p style={{ fontSize: '12px', color: '#434654', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: '14px', fontWeight: 600, color: '#191B23', margin: 0 }}>
        ${(payload[0].value / 1000).toFixed(0)}k
      </p>
    </div>
  );
}
