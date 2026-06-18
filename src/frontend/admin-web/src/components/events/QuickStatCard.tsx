import React from 'react';

interface QuickStatCardProps {
  icon: string;
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
        padding: '20px',
        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <p
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#434654',
          margin: '0 0 8px',
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
        }}
      >
        {icon} {label}
      </p>
      <p
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#191B23',
          margin: 0,
          letterSpacing: '-0.3px',
        }}
      >
        {value}
      </p>
    </div>
  );
}
