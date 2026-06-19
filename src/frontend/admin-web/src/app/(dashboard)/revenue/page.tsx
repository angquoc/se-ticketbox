'use client';
import { useRevenueData } from '@/hooks/useRevenueData';
import RevenueFilterBar from '@/components/revenue/RevenueFilterBar';
import RevenueSummaryCard from '@/components/revenue/RevenueSummaryCard';
import TransactionTable from '@/components/revenue/TransactionTable';

export default function RevenuePage() {
  const {
    loading,
    error,
    concerts,
    pageTx,
    totalRevenue,
    transactionCount,
    currentPage,
    totalPages,
    filters,
    setFilters,
    handleApply,
    handleReset,
    setCurrentPage,
  } = useRevenueData();

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

        {/* Export CSV (placeholder — future feature) */}
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

      {/* Error state */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#FEE2E2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#991B1B',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* ── Summary Cards Grid ── */}
      <RevenueSummaryCard
        totalRevenue={totalRevenue}
        transactionCount={transactionCount}
      />

      {/* ── Filter Bar ── */}
      <RevenueFilterBar
        filters={filters}
        onChange={setFilters}
        onApply={handleApply}
        onReset={handleReset}
        concerts={concerts}
      />

      {/* ── Transaction Table ── */}
      <TransactionTable
        transactions={pageTx as any}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={transactionCount}
        onPageChange={setCurrentPage}
        loading={loading}
      />
    </div>
  );
}
