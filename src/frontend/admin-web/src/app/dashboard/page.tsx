'use client';
import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Data ──────────────────────────────────────────────────────────────
const revenueData30 = [
  { day: 'May 9',  value: 52000 },
  { day: 'May 12', value: 58000 },
  { day: 'May 15', value: 63000 },
  { day: 'May 18', value: 61000 },
  { day: 'May 21', value: 75000 },
  { day: 'May 24', value: 82000 },
  { day: 'May 27', value: 95000 },
  { day: 'May 30', value: 103000 },
  { day: 'Jun 2',  value: 112000 },
  { day: 'Jun 5',  value: 124592 },
];

const revenueData7 = [
  { day: 'May 30', value: 103000 },
  { day: 'May 31', value: 107000 },
  { day: 'Jun 1',  value: 109000 },
  { day: 'Jun 2',  value: 112000 },
  { day: 'Jun 3',  value: 116000 },
  { day: 'Jun 4',  value: 120000 },
  { day: 'Jun 5',  value: 124592 },
];

const revenueData24 = [
  { day: '6am',  value: 118000 },
  { day: '9am',  value: 120000 },
  { day: '12pm', value: 121500 },
  { day: '3pm',  value: 123000 },
  { day: '6pm',  value: 124000 },
  { day: '9pm',  value: 124592 },
];

const dataMap = { '30 Days': revenueData30, '7 Days': revenueData7, '24 Hours': revenueData24 };

const upcomingEvents = [
  { day: 12, name: 'Summer Music Festival', venue: 'San Francisco, CA', pct: 85, sold: '2.4k', total: '3k', bg: '#D0E1FB', textColor: '#54647A' },
  { day: 15, name: 'Tech Conference 2024', venue: 'Austin, TX',         pct: 62, sold: '620',  total: '1k', bg: '#E7E7F3', textColor: '#434654' },
  { day: 18, name: 'Standup Comedy Night', venue: 'New York, NY',       pct: 98, sold: '490',  total: '500', bg: '#E7E7F3', textColor: '#434654' },
  { day: 22, name: 'Food & Wine Expo',     venue: 'Chicago, IL',        pct: 45, sold: '900',  total: '2k', bg: '#E7E7F3', textColor: '#434654' },
];

// ── Stat Card ─────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  trend: string;
  trendColor: string;
  trendIcon: 'up' | 'down' | 'flat';
  icon: React.ReactNode;
}

function TrendArrowUp() {
  return (
    <svg width="13" height="8" viewBox="0 0 13 8" fill="none">
      <path d="M1 7L5 3L8 5.5L12 1" stroke="#1D52D7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrendArrowDown() {
  return (
    <svg width="13" height="8" viewBox="0 0 13 8" fill="none">
      <path d="M1 1L5 5L8 2.5L12 7" stroke="#BA1A1A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrendDash() {
  return <svg width="10" height="2" viewBox="0 0 10 2" fill="none"><line x1="0" y1="1" x2="10" y2="1" stroke="#434654" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

function StatCard({ label, value, trend, trendColor, trendIcon, icon }: StatCardProps) {
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

// ── Custom Tooltip ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
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

// ── Main Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeRange, setActiveRange] = useState<'30 Days' | '7 Days' | '24 Hours'>('30 Days');
  const chartData = dataMap[activeRange];

  const stats: StatCardProps[] = [
    {
      label: 'Total Revenue',
      value: '$124,592.00',
      trend: '+14.5% from last month',
      trendColor: '#1D52D7',
      trendIcon: 'up',
      icon: (
        <svg width="22" height="16" viewBox="0 0 24 18" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="22" height="14" rx="2" />
          <path d="M1 7h22" />
        </svg>
      ),
    },
    {
      label: 'Tickets Sold',
      value: '12,403',
      trend: '+8.2% from last month',
      trendColor: '#1D52D7',
      trendIcon: 'up',
      icon: (
        <svg width="20" height="16" viewBox="0 0 24 18" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9h20M9 1v16M15 1v16" />
          <rect x="2" y="1" width="20" height="16" rx="2" />
        </svg>
      ),
    },
    {
      label: 'Active Events',
      value: '42',
      trend: '— No change',
      trendColor: '#434654',
      trendIcon: 'flat',
      icon: (
        <svg width="18" height="20" viewBox="0 0 22 24" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="20" height="19" rx="2" />
          <path d="M16 2v4M6 2v4M1 10h20" />
        </svg>
      ),
    },
    {
      label: 'New Users',
      value: '892',
      trend: '-2.4% from last month',
      trendColor: '#BA1A1A',
      trendIcon: 'down',
      icon: (
        <svg width="22" height="16" viewBox="0 0 24 18" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 17v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 17v-1a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <line x1="19" y1="6" x2="23" y2="6" />
          <line x1="21" y1="4" x2="21" y2="8" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1600px' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{
            fontWeight: 700,
            fontSize: '30px',
            lineHeight: '36px',
            letterSpacing: '-0.6px',
            color: '#191B23',
            margin: 0,
          }}>Dashboard Overview</h1>
          <p style={{
            fontWeight: 400,
            fontSize: '14px',
            lineHeight: '20px',
            color: '#434654',
            margin: '4px 0 0',
          }}>Welcome back. Here is your summary for today.</p>
        </div>

        {/* Date range pills */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#FFFFFF',
          border: '1px solid #C3C5D7',
          borderRadius: '4px',
          padding: '4px',
        }}>
          {(['30 Days', '7 Days', '24 Hours'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                fontSize: '12px',
                lineHeight: '16px',
                background: activeRange === range ? '#E7E7F3' : 'transparent',
                color: activeRange === range ? '#191B23' : '#434654',
                transition: 'background 0.15s',
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat Cards Grid ── */}
      <div style={{ display: 'flex', gap: '27px', width: '100%' }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── Middle: Chart + Events ── */}
      <div style={{ display: 'flex', gap: '27px', alignItems: 'stretch' }}>

        {/* Revenue Trend Chart */}
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
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#003298" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#003298" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#E2E1ED" strokeDasharray="4 4" />
                <XAxis
                  dataKey="day"
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 12, fill: '#434654' }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tickFormatter={(v: number) => `${v / 1000}k`}
                  tick={{ fontFamily: 'var(--font-mono)', fontSize: 12, fill: '#434654' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  ticks={[0, 50000, 100000, 150000]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#003298"
                  strokeWidth={1.8}
                  fill="url(#revGrad)"
                  dot={{ r: 4, fill: '#FFFFFF', stroke: '#003298', strokeWidth: 1.8 }}
                  activeDot={{ r: 5, fill: '#003298', stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Events */}
        <div style={{
          width: '300px',
          flexShrink: 0,
          background: '#FFFFFF',
          border: '1px solid #C3C5D7',
          boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
          borderRadius: '8px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* Section header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '16px', lineHeight: '24px', color: '#191B23' }}>
              Upcoming Events
            </span>
            <a href="/events" style={{ fontWeight: 500, fontSize: '12px', lineHeight: '16px', color: '#003298', textDecoration: 'none' }}>
              View All
            </a>
          </div>

          {/* Event rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
            {upcomingEvents.map((ev, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  borderBottom: i < upcomingEvents.length - 1 ? '1px solid rgba(195,197,215,0.3)' : 'none',
                  borderRadius: '4px',
                }}
              >
                {/* Left: date badge + name/venue */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '2px',
                    background: ev.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontWeight: 600, fontSize: '20px', lineHeight: '28px', color: ev.textColor }}>
                      {ev.day}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#191B23',
                      margin: 0,
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                    }}>{ev.name}</p>
                    <p style={{
                      fontWeight: 400,
                      fontSize: '13px',
                      lineHeight: '18px',
                      color: '#434654',
                      margin: 0,
                    }}>{ev.venue}</p>
                  </div>
                </div>

                {/* Right: pct + sold */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, marginLeft: '8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 400,
                    fontSize: '13px',
                    lineHeight: '18px',
                    color: '#191B23',
                    whiteSpace: 'nowrap',
                  }}>{ev.pct}%</span>
                  <span style={{
                    fontWeight: 400,
                    fontSize: '13px',
                    lineHeight: '18px',
                    color: '#434654',
                    whiteSpace: 'nowrap',
                  }}>Sold</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 400,
                    fontSize: '13px',
                    lineHeight: '18px',
                    color: '#191B23',
                    whiteSpace: 'nowrap',
                  }}>{ev.sold}/{ev.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}