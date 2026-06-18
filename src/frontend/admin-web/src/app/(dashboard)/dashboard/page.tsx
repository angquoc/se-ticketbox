'use client';
import { useState, useEffect, useMemo } from 'react';
import StatCard, { StatCardProps } from '@/components/dashboard/StatCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import UpcomingEvents, { UpcomingEventData } from '@/components/dashboard/UpcomingEvents';
import { getConcerts, getConcertById } from '@/services/concertService';
import { getAdminOrders, Order } from '@/services/orderService';
import type { Concert } from '@/types/api';

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

  const [loading, setLoading] = useState(true);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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

        // 2. Fetch details for each concert to get ticketTypes
        const concertsData = await Promise.all(
          response.data.map(c => getConcertById(c.id).catch(() => null))
        );

        // Filter out any failed requests
        const validConcerts = concertsData.filter((c): c is Concert => c !== null);
        setConcerts(validConcerts);

        // 3. Fetch paid orders
        const ordersResponse = await getAdminOrders(1, 1000, 'PAID');
        setOrders(ordersResponse.data);

        // 4. Compute totals
        let totalRevenue = 0;
        let ticketsSold = 0;
        let activeEvents = 0;

        validConcerts.forEach(c => {
          // Count active events (PUBLISHED or SALE_OPEN)
          if (c.status === 'PUBLISHED' || c.status === 'SALE_OPEN') {
            activeEvents++;
          }
        });

        // Sum from real paid orders list
        ordersResponse.data.forEach(o => {
          totalRevenue += o.totalAmountInVnd;
          ticketsSold += o.ticketCount;
        });

        setTotals(prev => ({
          ...prev,
          totalRevenue,
          ticketsSold,
          activeEvents,
        }));

        // 5. Extract and format upcoming events (excluding DRAFT and CANCELLED)
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
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // ── Range Computations ──────────────────────────────────────────────────
  const { chartData, revenueChange, ticketsChange, eventsChange } = useMemo(() => {
    if (orders.length === 0 && concerts.length === 0) {
      return {
        chartData: [],
        revenueChange: 0,
        ticketsChange: 0,
        eventsChange: 0,
      };
    }

    const rangeMs = {
      '30 Days': 30 * 24 * 60 * 60 * 1000,
      '7 Days': 7 * 24 * 60 * 60 * 1000,
      '24 Hours': 24 * 60 * 60 * 1000,
    }[activeRange];

    const now = new Date();
    const currentStart = new Date(now.getTime() - rangeMs);
    const previousStart = new Date(now.getTime() - 2 * rangeMs);

    const getPaidAtDate = (o: Order) => {
      return o.paidAt ? new Date(o.paidAt) : new Date(o.createdAt);
    };

    // Filter paid orders for current and previous periods
    const currentOrders = orders.filter(o => {
      const d = getPaidAtDate(o);
      return d >= currentStart && d <= now;
    });

    const previousOrders = orders.filter(o => {
      const d = getPaidAtDate(o);
      return d >= previousStart && d < currentStart;
    });

    // Compute sums for comparison
    const currentRevenue = currentOrders.reduce((sum, o) => sum + o.totalAmountInVnd, 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + o.totalAmountInVnd, 0);

    const currentTickets = currentOrders.reduce((sum, o) => sum + o.ticketCount, 0);
    const previousTickets = previousOrders.reduce((sum, o) => sum + o.ticketCount, 0);

    const calculateChangePct = (curr: number, prev: number) => {
      if (prev === 0) {
        return curr > 0 ? 100 : 0;
      }
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    const revChange = calculateChangePct(currentRevenue, previousRevenue);
    const tixChange = calculateChangePct(currentTickets, previousTickets);

    // Compute event creations change
    const activeConcerts = concerts.filter(c => c.status === 'PUBLISHED' || c.status === 'SALE_OPEN');
    const currentEventsCount = activeConcerts.filter(c => {
      const d = new Date(c.createdAt);
      return d >= currentStart && d <= now;
    }).length;
    const previousEventsCount = activeConcerts.filter(c => {
      const d = new Date(c.createdAt);
      return d >= previousStart && d < currentStart;
    }).length;

    const evsChange = calculateChangePct(currentEventsCount, previousEventsCount);

    // Build chart data based on active range
    const chartPoints: Array<{ day: string; value: number;[key: string]: any }> = [];

    if (activeRange === '24 Hours') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hour = d.getHours();
        const ampm = hour >= 12 ? 'pm' : 'am';
        const hour12 = hour % 12 || 12;
        const label = `${hour12}${ampm}`;
        chartPoints.push({
          day: label,
          hourKey: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`,
          value: 0,
        });
      }

      currentOrders.forEach(o => {
        const d = getPaidAtDate(o);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        const slot = chartPoints.find(p => p.hourKey === key);
        if (slot) {
          slot.value += o.totalAmountInVnd;
        }
      });
    } else {
      const daysCount = activeRange === '7 Days' ? 7 : 30;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        chartPoints.push({
          day: label,
          dateKey: d.toDateString(),
          value: 0,
        });
      }

      currentOrders.forEach(o => {
        const d = getPaidAtDate(o);
        const key = d.toDateString();
        const slot = chartPoints.find(p => p.dateKey === key);
        if (slot) {
          slot.value += o.totalAmountInVnd;
        }
      });
    }

    return {
      chartData: chartPoints,
      revenueChange: revChange,
      ticketsChange: tixChange,
      eventsChange: evsChange,
    };
  }, [activeRange, orders, concerts]);

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
      <div style={{ display: 'flex', gap: '27px', alignItems: 'stretch' }}>

        {/* Revenue Trend Chart */}
        <RevenueChart data={chartData} activeRange={activeRange} />

        {/* Upcoming Events */}
        <UpcomingEvents events={upcomingEventsList} loading={loading} />
      </div>
    </div>
  );
}