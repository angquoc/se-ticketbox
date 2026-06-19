// src/components/revenue/RevenueFilterBar.tsx
'use client';

import { RevenueFilters, PaymentMethod } from '@/types/revenue';
import type { Concert } from '@/types/api';

interface Props {
  filters: RevenueFilters;
  onChange: (f: RevenueFilters) => void;
  onApply: () => void;
  onReset?: () => void;
  concerts?: Concert[];
}

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
  minWidth: '160px',
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
  width: '135px',
};

function SelectWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {children}
      <span style={{ position: 'absolute', right: '8px', pointerEvents: 'none', color: '#6B7280', display: 'flex', alignItems: 'center' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>
  );
}

export default function RevenueFilterBar({ filters, onChange, onApply, onReset, concerts = [] }: Props) {
  const eventOptions = [
    { value: 'all', label: 'All Events' },
    ...concerts.map((c) => ({ value: c.title, label: c.title })),
  ];
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      borderRadius: '8px',
      boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
      padding: '16px 20px',
      display: 'flex',
      gap: '16px',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
    }}>
      {/* Event */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#434654', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Event</label>
        <SelectWrapper>
          <select
            value={filters.event}
            onChange={e => onChange({ ...filters, event: e.target.value })}
            style={selectStyle}
          >
            {eventOptions.map(ev => (
              <option key={ev.value} value={ev.value}>{ev.label}</option>
            ))}
          </select>
        </SelectWrapper>
      </div>

      {/* Date Range */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#434654', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Date Range</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => onChange({ ...filters, dateFrom: e.target.value })}
            style={inputStyle}
          >
          </input>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>–</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => onChange({ ...filters, dateTo: e.target.value })}
            style={inputStyle}
          >
          </input>
        </div>
      </div>

      {/* Payment Method */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#434654', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Payment Method</label>
        <SelectWrapper>
          <select
            value={filters.method}
            onChange={e => onChange({ ...filters, method: e.target.value as PaymentMethod })}
            style={{ ...selectStyle, minWidth: '130px' }}
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
          padding: '0 16px',
          border: 'none',
          borderRadius: '4px',
          background: '#003298',
          color: '#FFFFFF',
          fontSize: '12px',
          lineHeight: '16px',
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          alignSelf: 'flex-end',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#002270'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#003298'; }}
      >
        Apply Filters
      </button>

      {onReset && (
        <button
          onClick={onReset}
          style={{
            height: '34px',
            padding: '0 14px',
            border: '1px solid #C3C5D7',
            borderRadius: '4px',
            background: 'transparent',
            color: '#434654',
            fontSize: '12px',
            lineHeight: '16px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            alignSelf: 'flex-end',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#191B23'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#434654'; }}
        >
          Reset
        </button>
      )}
    </div>
  );
}
