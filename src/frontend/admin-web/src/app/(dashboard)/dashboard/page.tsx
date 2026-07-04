'use client';
import { useState } from 'react';
import StatCard, { StatCardProps } from '@/components/dashboard/StatCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import UpcomingEvents from '@/components/dashboard/UpcomingEvents';
import { useDashboardData } from '@/hooks/useDashboardData';

// Helper to format trend text based on range
function getTrendText(change: number, rangeLabel: string) {
  const period = rangeLabel === '30 Days' ? 'last month' : rangeLabel === '7 Days' ? 'last week' : 'yesterday';
  if (change > 0) {
    return `+${change}% from ${period}`;
  }
  if (change < 0) {
    return `${change}% from ${period}`;
  }
  return '— No change';
}

function getTrendIcon(change: number): 'up' | 'down' | 'flat' {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'flat';
}

function getTrendColor(change: number): string {
  if (change > 0) return '#1D52D7';
  if (change < 0) return '#BA1A1A';
  return '#434654';
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeRange, setActiveRange] = useState<'30 Days' | '7 Days' | '24 Hours'>('30 Days');
  
  const {
    loading,
    totals,
    upcomingEventsList,
    chartData,
    revenueChange,
    ticketsChange,
    eventsChange,
  } = useDashboardData(activeRange);

  // Format total revenue as VND
  const formattedRevenue = loading
    ? '...'
    : new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(totals.totalRevenue);

  const formattedTickets = loading
    ? '...'
    : new Intl.NumberFormat('en-US').format(totals.ticketsSold);

  const formattedEvents = loading ? '...' : totals.activeEvents.toString();
  const formattedUsers = loading ? '...' : new Intl.NumberFormat('en-US').format(totals.newUsers);

  const stats: StatCardProps[] = [
    {
      label: 'Total Revenue',
      value: formattedRevenue,
      trend: getTrendText(revenueChange, activeRange),
      trendColor: getTrendColor(revenueChange),
      trendIcon: getTrendIcon(revenueChange),
      icon: (
        <svg width="22" height="16" viewBox="0 0 24 18" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="22" height="14" rx="2" />
          <path d="M1 7h22" />
        </svg>
      ),
    },
    {
      label: 'Tickets Sold',
      value: formattedTickets,
      trend: getTrendText(ticketsChange, activeRange),
      trendColor: getTrendColor(ticketsChange),
      trendIcon: getTrendIcon(ticketsChange),
      icon: (
        <svg width="20" height="16" viewBox="0 0 24 18" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9h20M9 1v16M15 1v16" />
          <rect x="2" y="1" width="20" height="16" rx="2" />
        </svg>
      ),
    },
    {
      label: 'Active Events',
      value: formattedEvents,
      trend: getTrendText(eventsChange, activeRange),
      trendColor: getTrendColor(eventsChange),
      trendIcon: getTrendIcon(eventsChange),
      icon: (
        <svg width="18" height="20" viewBox="0 0 22 24" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="20" height="19" rx="2" />
          <path d="M16 2v4M6 2v4M1 10h20" />
        </svg>
      ),
    },
    {
      label: 'New Users',
      value: formattedUsers,
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
      <div style={{ display: 'flex', gap: '27px', alignItems: 'stretch', height: '380px' }}>

        {/* Revenue Trend Chart */}
        <RevenueChart data={chartData} activeRange={activeRange} />

        {/* Upcoming Events */}
        <UpcomingEvents events={upcomingEventsList} loading={loading} />
      </div>
    </div>
  );
}