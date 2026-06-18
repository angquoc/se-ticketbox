'use client';
import { useState, useMemo } from 'react';
import RevenueFilterBar from '@/components/revenue/RevenueFilterBar';
import RevenueSummaryCard from '@/components/revenue/RevenueSummaryCard';
import TransactionTable from '@/components/revenue/TransactionTable';
import { RevenueFilters } from '@/types/revenue';
import { ALL_TRANSACTIONS, TOTAL_COUNT, TOTAL_REVENUE } from '@/lib/revenueMockData';

const PER_PAGE = 5;

export default function RevenuePage() {
  const [filters, setFilters] = useState<RevenueFilters>({
    event: 'all',
    dateFrom: '',
    dateTo: '',
    method: 'All Methods',
  });
  const [appliedFilters, setAppliedFilters] = useState<RevenueFilters>(filters);
  const [currentPage, setCurrentPage] = useState(1);

  // Client-side filter on mock data
  const filtered = useMemo(() => {
    return ALL_TRANSACTIONS.filter(tx => {
      if (appliedFilters.event !== 'all') {
        const slug = appliedFilters.event;
        const eventMatch =
          (slug === 'summer-music-2024' && tx.event.includes('Summer Music')) ||
          (slug === 'tech-conference'   && tx.event.includes('Tech Conference')) ||
          (slug === 'local-food-wine'   && tx.event.includes('Local Food'));
        if (!eventMatch) return false;
      }
      if (appliedFilters.method !== 'All Methods' && tx.provider !== appliedFilters.method) {
        return false;
      }
      if (appliedFilters.dateFrom) {
        if (new Date(tx.date) < new Date(appliedFilters.dateFrom)) return false;
      }
      if (appliedFilters.dateTo) {
        if (new Date(tx.date) > new Date(appliedFilters.dateTo + 'T23:59:59Z')) return false;
      }
      return true;
    });
  }, [appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(TOTAL_COUNT / PER_PAGE));
  const pageTx = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const filteredRevenue = appliedFilters.event === 'all' && appliedFilters.method === 'All Methods'
    ? TOTAL_REVENUE
    : filtered.filter(tx => tx.paymentStatus === 'Paid').reduce((s, tx) => s + tx.amount, 0);

  const filteredCount = appliedFilters.event === 'all' && appliedFilters.method === 'All Methods'
    ? TOTAL_COUNT
    : filtered.length;

  const handleApply = () => {
    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontWeight: 700, fontSize: '30px', lineHeight: '36px',
            letterSpacing: '-0.6px', color: '#191B23', margin: 0,
          }}>Revenue Details</h1>
          <p style={{ fontWeight: 400, fontSize: '14px', color: '#434654', margin: '4px 0 0' }}>
            Comprehensive financial tracking and transaction logs.
          </p>
        </div>

        {/* Export CSV */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          height: '34px', padding: '0 16px',
          border: '1px solid #C3C5D7', borderRadius: '4px',
          background: '#FFFFFF', color: '#434654',
          fontSize: '13px', fontWeight: 500,
          cursor: 'pointer', fontFamily: 'var(--font-sans)',
          flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Filters + Summary ── */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        {/* Filter bar takes remaining space */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <RevenueFilterBar
            filters={filters}
            onChange={setFilters}
            onApply={handleApply}
          />
        </div>
        {/* Summary card fixed width */}
        <RevenueSummaryCard
          totalRevenue={filteredRevenue}
          transactionCount={filteredCount}
        />
      </div>

      {/* ── Transaction Table ── */}
      <TransactionTable
        transactions={pageTx}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={filteredCount}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
