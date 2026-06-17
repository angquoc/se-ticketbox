import React from 'react';

export interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  trendColor: string;
  trendIcon: 'up' | 'down' | 'flat';
  icon: React.ReactNode;
}

export function TrendArrowUp() {
  return (
    <svg width="13" height="8" viewBox="0 0 13 8" fill="none">
      <path d="M1 7L5 3L8 5.5L12 1" stroke="#1D52D7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function TrendArrowDown() {
  return (
    <svg width="13" height="8" viewBox="0 0 13 8" fill="none">
      <path d="M1 1L5 5L8 2.5L12 7" stroke="#BA1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function TrendDash() {
  return (
    <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
      <line x1="0" y1="1" x2="10" y2="1" stroke="#434654" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function StatCard({ label, value, trend, trendColor, trendIcon, icon }: StatCardProps) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      flex: 1,
      minWidth: 0,
    }}>
      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          fontWeight: 500,
          fontSize: '12px',
          lineHeight: '16px',
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: '#434654',
        }}>{label}</span>
        <div style={{ background: '#DCE1FF', borderRadius: '6px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      </div>
      {/* Value + trend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{
          fontWeight: 600,
          fontSize: '24px',
          lineHeight: '32px',
          letterSpacing: '-0.24px',
          color: '#191B23',
        }}>{value}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {trendIcon === 'up' && <TrendArrowUp />}
          {trendIcon === 'down' && <TrendArrowDown />}
          {trendIcon === 'flat' && <TrendDash />}
          <span style={{ fontSize: '13px', lineHeight: '18px', color: trendColor }}>{trend}</span>
        </div>
      </div>
    </div>
  );
}
