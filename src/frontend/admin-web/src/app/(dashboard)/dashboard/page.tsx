'use client';
import { useState, useEffect } from 'react';
import StatCard, { StatCardProps } from '@/components/dashboard/StatCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import UpcomingEvents, { UpcomingEventData } from '@/components/dashboard/UpcomingEvents';
import { getConcerts, getConcertById } from '@/services/concertService';

// ── Data ──────────────────────────────────────────────────────────────
const revenueData30 = [
  { day: 'May 9', value: 520000000 },
  { day: 'May 12', value: 580000000 },
  { day: 'May 15', value: 630000000 },
  { day: 'May 18', value: 610000000 },
  { day: 'May 21', value: 750000000 },
  { day: 'May 24', value: 820000000 },
  { day: 'May 27', value: 950000000 },
  { day: 'May 30', value: 1030000000 },
  { day: 'Jun 2', value: 1120000000 },
  { day: 'Jun 5', value: 1245920000 },
];

const revenueData7 = [
  { day: 'May 30', value: 1030000000 },
  { day: 'May 31', value: 1070000000 },
  { day: 'Jun 1', value: 1090000000 },
  { day: 'Jun 2', value: 1120000000 },
  { day: 'Jun 3', value: 1160000000 },
  { day: 'Jun 4', value: 1200000000 },
  { day: 'Jun 5', value: 1245920000 },
];

const revenueData24 = [
  { day: '6am', value: 1180000000 },
  { day: '9am', value: 1200000000 },
  { day: '12pm', value: 1215000000 },
  { day: '3pm', value: 1230000000 },
  { day: '6pm', value: 1240000000 },
  { day: '9pm', value: 1245920000 },
];

const dataMap = { '30 Days': revenueData30, '7 Days': revenueData7, '24 Hours': revenueData24 };

// ── Main Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [activeRange, setActiveRange] = useState<'30 Days' | '7 Days' | '24 Hours'>('30 Days');
  const chartData = dataMap[activeRange];

  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    totalRevenue: 0,
    ticketsSold: 0,
    activeEvents: 0,
    newUsers: 892, // mock value as no user list endpoint exists
  });
  const [upcomingEventsList, setUpcomingEventsList] = useState<UpcomingEventData[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        // 1. Fetch all concerts
        const response = await getConcerts(1, 100);
        console.log(response);

        // 2. Fetch details for each concert to get ticketTypes
        const concerts = await Promise.all(
          response.data.map(c => getConcertById(c.id).catch(() => null))
        );

        // Filter out any failed requests
        const validConcerts = concerts.filter((c): c is NonNullable<typeof c> => c !== null);

        // 3. Compute totals
        let totalRevenue = 0;
        let ticketsSold = 0;
        let activeEvents = 0;

        validConcerts.forEach(c => {
          // Count active events (PUBLISHED or SALE_OPEN)
          if (c.status === 'PUBLISHED' || c.status === 'SALE_OPEN') {
            activeEvents++;
          }

          // Accumulate tickets sold and revenue from ticket types
          if (c.ticketTypes) {
            c.ticketTypes.forEach(tt => {
              ticketsSold += tt.soldQty;
              totalRevenue += tt.soldQty * tt.price;
            });
          }
        });

        setTotals(prev => ({
          ...prev,
          totalRevenue,
          ticketsSold,
          activeEvents,
        }));

        // 4. Extract and format upcoming events (excluding DRAFT and CANCELLED)
        const displayConcerts = validConcerts
          .filter(c => c.status !== 'DRAFT' && c.status !== 'CANCELLED')
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

        const bgs = ['#D0E1FB', '#E7E7F3', '#FCE8E6', '#E6F4EA'];
        const textColors = ['#003298', '#434654', '#C5221F', '#137333'];

        const mappedEvents: UpcomingEventData[] = displayConcerts.slice(0, 4).map((c, index) => {
          let eventTotalQty = 0;
          let eventSoldQty = 0;

          if (c.ticketTypes) {
            c.ticketTypes.forEach(tt => {
              eventTotalQty += tt.totalQty;
              eventSoldQty += tt.soldQty;
            });
          }

          const pct = eventTotalQty > 0 ? Math.round((eventSoldQty / eventTotalQty) * 100) : 0;

          const formatQty = (qty: number) => {
            if (qty >= 1000) {
              return `${(qty / 1000).toFixed(1).replace('.0', '')}k`;
            }
            return qty.toString();
          };

          return {
            name: c.title,
            venue: c.venue.split(',')[0] || c.venue,
            day: new Date(c.startsAt).getDate(),
            pct,
            sold: formatQty(eventSoldQty),
            total: formatQty(eventTotalQty),
            bg: bgs[index % bgs.length],
            textColor: textColors[index % textColors.length],
          };
        });

        setUpcomingEventsList(mappedEvents);
      } catch (err) {
        console.error('Failed to load real dashboard metrics:', err);
        // Keep fallback mock values on error
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

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
      value: formattedTickets,
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
      value: formattedEvents,
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
      <div style={{ display: 'flex', gap: '27px', alignItems: 'stretch' }}>

        {/* Revenue Trend Chart */}
        <RevenueChart data={chartData} activeRange={activeRange} />

        {/* Upcoming Events */}
        <UpcomingEvents events={upcomingEventsList} loading={loading} />
      </div>
    </div>
  );
}