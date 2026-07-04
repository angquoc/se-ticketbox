import React from 'react';

interface QuickStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

export default function QuickStatCard({ icon, label, value }: QuickStatCardProps) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #C3C5D7',
        borderRadius: '8px',
        padding: '16px 20px',
        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#434654',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            display: 'block',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#191B23',
            letterSpacing: '-0.3px',
            display: 'block',
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          background: '#DCE1FF',
          borderRadius: '6px',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
    </div>
  );
}

