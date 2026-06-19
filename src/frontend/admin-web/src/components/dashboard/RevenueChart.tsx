import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import CustomTooltip from './CustomTooltip';

interface RevenueChartProps {
  data: any[];
  activeRange: string;
}

export default function RevenueChart({ data, activeRange }: RevenueChartProps) {
  return (
    <div style={{
      flex: '1 1 0',
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
      borderRadius: '8px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      minWidth: 0,
    }}>
      {/* Chart header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '16px', lineHeight: '24px', color: '#191B23' }}>
          Revenue Trend ({activeRange})
        </span>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#434654', display: 'flex', alignItems: 'center' }}>
          <svg width="16" height="4" viewBox="0 0 16 4" fill="none">
            <circle cx="2" cy="2" r="2" fill="#434654" />
            <circle cx="8" cy="2" r="2" fill="#434654" />
            <circle cx="14" cy="2" r="2" fill="#434654" />
          </svg>
        </button>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: '260px' }}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#003298" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#003298" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E2E1ED" strokeDasharray="4 4" />
            <XAxis dataKey="day" tick={{ fontFamily: 'var(--font-mono)', fontSize: 12, fill: '#434654' }} axisLine={false} tickLine={false} dy={8} />
            <YAxis 
              tickFormatter={(v: number) => {
                if (v >= 1_000_000_000) {
                  return `${(v / 1_000_000_000).toFixed(1).replace('.0', '')}B`;
                }
                if (v >= 1_000_000) {
                  return `${(v / 1_000_000).toFixed(0)}M`;
                }
                if (v >= 1_000) {
                  return `${(v / 1_000).toFixed(0)}k`;
                }
                return v.toString();
              }} 
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 12, fill: '#434654' }} 
              axisLine={false} 
              tickLine={false} 
              width={64} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone" dataKey="value" stroke="#003298" strokeWidth={1.8} fill="url(#revGrad)"
              dot={{ r: 4, fill: '#FFFFFF', stroke: '#003298', strokeWidth: 1.8 }}
              activeDot={{ r: 5, fill: '#003298', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
