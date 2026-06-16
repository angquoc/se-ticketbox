// src/components/revenue/RevenueFilterBar.tsx
'use client';

import { RevenueFilters, PaymentMethod } from '@/types/revenue';

interface Props {
  filters: RevenueFilters;
  onChange: (f: RevenueFilters) => void;
  onApply: () => void;
}

const EVENTS = [
  { value: 'all', label: 'All Events' },
  { value: 'summer-music-2024', label: 'Summer Music Fest 2024' },
  { value: 'tech-conference', label: 'Tech Conference Alpha' },
  { value: 'local-food-wine', label: 'Local Food & Wine' },
];

const METHODS: PaymentMethod[] = ['All Methods', 'VNPAY', 'MoMo', 'MOCK'];

const selectStyle: React.CSSProperties = {
  height: '34px',
  border: '1px solid #C3C5D7',
  borderRadius: '4px',
  padding: '0 28px 0 10px',
  fontSize: '13px',
  color: '#191B23',
  background: '#FFFFFF',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  appearance: 'none' as const,
  cursor: 'pointer',
  boxSizing: 'border-box' as const,
  minWidth: '130px',
};

const inputStyle: React.CSSProperties = {
  height: '34px',
  border: '1px solid #C3C5D7',
  borderRadius: '4px',
  padding: '0 10px',
  fontSize: '13px',
  color: '#191B23',
  background: '#FFFFFF',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  boxSizing: 'border-box' as const,
  width: '130px',
};

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {children}
      <span style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#6B7280' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>
  );
}

export default function RevenueFilterBar({ filters, onChange, onApply }: Props) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      borderRadius: '8px',
      boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
      padding: '20px',
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
    }}>
      {/* Event */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', fontWeight: 500, color: '#434654', letterSpacing: '0.3px' }}>Event</label>
        <SelectWrapper>
          <select
            value={filters.event}
            onChange={e => onChange({ ...filters, event: e.target.value })}
            style={selectStyle}
          >
            {EVENTS.map(ev => (
              <option key={ev.value} value={ev.value}>{ev.label}</option>
            ))}
          </select>
        </SelectWrapper>
      </div>

      {/* Date Range */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', fontWeight: 500, color: '#434654', letterSpacing: '0.3px' }}>Date Range</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
            style={inputStyle}
          />
          <span style={{ fontSize: '12px', color: '#6B7280' }}>–</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => onChange({ ...filters, dateTo: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Payment Method */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', fontWeight: 500, color: '#434654', letterSpacing: '0.3px' }}>Payment Method</label>
        <SelectWrapper>
          <select
            value={filters.method}
            onChange={e => onChange({ ...filters, method: e.target.value as PaymentMethod })}
            style={{ ...selectStyle, minWidth: '120px' }}
          >
            {METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </SelectWrapper>
      </div>

      {/* Apply */}
      <button
        onClick={onApply}
        style={{
          height: '34px',
          padding: '0 20px',
          border: '1px solid #C3C5D7',
          borderRadius: '4px',
          background: '#FFFFFF',
          color: '#191B23',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          alignSelf: 'flex-end',
        }}
      >
        Apply Filters
      </button>
    </div>
  );
}
