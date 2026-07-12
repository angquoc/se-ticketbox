import { useState, useEffect, useMemo } from 'react';
import { getAdminConcerts, getAdminConcertById } from '@/services/concertService';
import { getAdminOrders, Order } from '@/services/orderService';
import { getUsers } from '@/services/userService';
import type { Concert } from '@/types/api';

export function useDashboardData(activeRange: '30 Days' | '7 Days' | '24 Hours', isAdmin: boolean = false) {
  const [loading, setLoading] = useState(true);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totals, setTotals] = useState({
    totalRevenue: 0,
    ticketsSold: 0,
    activeEvents: 0,
    newUsers: 0,
  });
  const [upcomingEventsList, setUpcomingEventsList] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [response, ordersResponse] = await Promise.all([
          getAdminConcerts(1, 100),
          getAdminOrders(1, 1000, 'PAID')
        ]);

        let newUsers = 0;
        if (isAdmin) {
          try {
            const usersRes = await getUsers(1, 1);
            newUsers = usersRes.meta.total;
          } catch (e) {
            console.error('Failed to load users:', e);
          }
        }

        const concertsData = await Promise.all(
          response.data.map((c) => getAdminConcertById(c.id).catch(() => null))
        );

        const validConcerts = concertsData.filter((c): c is Concert => c !== null);
        setConcerts(validConcerts);
        setOrders(ordersResponse.data);

        let totalRevenue = 0;
        let ticketsSold = 0;
        let activeEvents = 0;

        validConcerts.forEach((c) => {
          if (c.status === 'PUBLISHED' || c.status === 'SALE_OPEN') {
            activeEvents++;
          }
        });

        ordersResponse.data.forEach((o) => {
          totalRevenue += o.totalAmountInVnd;
          ticketsSold += o.ticketCount;
        });

        setTotals((prev) => ({
          ...prev,
          totalRevenue,
          ticketsSold,
          activeEvents,
          newUsers,
        }));

        const displayConcerts = validConcerts
          .filter((c) => c.status !== 'DRAFT' && c.status !== 'CANCELLED')
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

        const bgs = ['#D0E1FB', '#E7E7F3', '#FCE8E6', '#E6F4EA'];
        const textColors = ['#003298', '#434654', '#C5221F', '#137333'];

        const mappedEvents = displayConcerts.slice(0, 4).map((c, index) => {
          let eventTotalQty = 0;
          let eventSoldQty = 0;

          if (c.ticketTypes) {
            c.ticketTypes.forEach((tt) => {
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

    const currentOrders = orders.filter((o) => {
      const d = getPaidAtDate(o);
      return d >= currentStart && d <= now;
    });

    const previousOrders = orders.filter((o) => {
      const d = getPaidAtDate(o);
      return d >= previousStart && d < currentStart;
    });

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

    const activeConcerts = concerts.filter((c) => c.status === 'PUBLISHED' || c.status === 'SALE_OPEN');
    const currentEventsCount = activeConcerts.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= currentStart && d <= now;
    }).length;
    const previousEventsCount = activeConcerts.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= previousStart && d < currentStart;
    }).length;

    const evsChange = calculateChangePct(currentEventsCount, previousEventsCount);

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

      currentOrders.forEach((o) => {
        const d = getPaidAtDate(o);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
        const slot = chartPoints.find((p) => p.hourKey === key);
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

      currentOrders.forEach((o) => {
        const d = getPaidAtDate(o);
        const key = d.toDateString();
        const slot = chartPoints.find((p) => p.dateKey === key);
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

  return {
    loading,
    totals,
    upcomingEventsList,
    chartData,
    revenueChange,
    ticketsChange,
    eventsChange,
  };
}
