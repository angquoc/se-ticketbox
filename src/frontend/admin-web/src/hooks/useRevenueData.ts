/**
 * useRevenueData.ts
 * Hook lấy dữ liệu Revenue thực từ API /admin/orders và /admin/concerts.
 * Thay thế mock data trong revenueMockData.ts.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAdminOrders } from '@/services/orderService';
import { getAdminConcerts } from '@/services/concertService';
import type { RevenueFilters } from '@/types/revenue';
import type { Concert } from '@/types/api';

export interface Transaction {
  id: string;
  date: string;
  event: string;
  customer: string;
  amount: number;
  paymentStatus: 'Paid' | 'Failed' | 'Refunded' | 'Pending';
  provider: string;
}

const PER_PAGE = 5;

export function useRevenueData() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<RevenueFilters>({
    event: 'all',
    dateFrom: '',
    dateTo: '',
    method: 'All Methods',
  });
  const [appliedFilters, setAppliedFilters] = useState<RevenueFilters>(filters);
  const [currentPage, setCurrentPage] = useState(1);

  // Load concerts list (cho filter dropdown)
  useEffect(() => {
    getAdminConcerts(1, 100)
      .then((res) => setConcerts(res.data))
      .catch(() => setConcerts([]));
  }, []);

  // Load tất cả orders (PAID + PAYMENT_FAILED + REFUNDED)
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [paidRes, failedRes] = await Promise.all([
        getAdminOrders(1, 200, 'PAID'),
        getAdminOrders(1, 200, 'PAYMENT_FAILED'),
      ]);

      const mapStatus = (status: string): Transaction['paymentStatus'] => {
        if (status === 'PAID') return 'Paid';
        if (status === 'PAYMENT_FAILED') return 'Failed';
        if (status === 'REFUNDED') return 'Refunded';
        return 'Pending';
      };

      const mapToTransaction = (o: any): Transaction => ({
        id: o.id,
        date: o.paidAt || o.createdAt,
        event: o.concertTitle || 'Unknown Event',
        customer: o.userId?.slice(0, 8) || '—',
        amount: o.totalAmountInVnd,
        paymentStatus: mapStatus(o.status),
        provider: 'MOCK_GATEWAY',
      });

      const combined = [
        ...paidRes.data.map(mapToTransaction),
        ...failedRes.data.map(mapToTransaction),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAllTransactions(combined);
    } catch (err) {
      console.error('Failed to load revenue data:', err);
      setError('Không thể tải dữ liệu doanh thu. Vui lòng thử lại.');
      setAllTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Client-side filter
  const filtered = useMemo(() => {
    return allTransactions.filter((tx) => {
      // Filter by concert
      if (appliedFilters.event !== 'all') {
        if (!tx.event.toLowerCase().includes(appliedFilters.event.toLowerCase())) {
          return false;
        }
      }

      // Filter by payment method (provider)
      if (appliedFilters.method !== 'All Methods' && tx.provider !== appliedFilters.method) {
        return false;
      }

      // Filter by date range
      if (appliedFilters.dateFrom) {
        if (new Date(tx.date) < new Date(appliedFilters.dateFrom)) return false;
      }
      if (appliedFilters.dateTo) {
        if (new Date(tx.date) > new Date(appliedFilters.dateTo + 'T23:59:59Z')) return false;
      }

      return true;
    });
  }, [allTransactions, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageTx = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const filteredRevenue = filtered
    .filter((tx) => tx.paymentStatus === 'Paid')
    .reduce((s, tx) => s + tx.amount, 0);

  const totalRevenue = allTransactions
    .filter((tx) => tx.paymentStatus === 'Paid')
    .reduce((s, tx) => s + tx.amount, 0);

  const handleApply = () => {
    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  const handleReset = () => {
    const reset: RevenueFilters = { event: 'all', dateFrom: '', dateTo: '', method: 'All Methods' };
    setFilters(reset);
    setAppliedFilters(reset);
    setCurrentPage(1);
  };

  return {
    loading,
    error,
    concerts,
    allTransactions,
    filtered,
    pageTx,
    totalRevenue: appliedFilters.event === 'all' && appliedFilters.method === 'All Methods' ? totalRevenue : filteredRevenue,
    transactionCount: appliedFilters.event === 'all' && appliedFilters.method === 'All Methods' ? allTransactions.filter(t => t.paymentStatus === 'Paid').length : filtered.length,
    currentPage,
    totalPages,
    filters,
    setFilters,
    appliedFilters,
    handleApply,
    handleReset,
    setCurrentPage,
    reload: loadOrders,
  };
}
