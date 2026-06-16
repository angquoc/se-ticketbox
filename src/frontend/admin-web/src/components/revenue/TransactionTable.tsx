// src/components/revenue/TransactionTable.tsx
'use client';

import { Transaction } from '@/types/revenue';
import PaymentStatusBadge from './PaymentStatusBadge';

interface Props {
  transactions: Transaction[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

const COL_WIDTHS = '140px 1.6fr 1.2fr 100px 1.3fr 110px';

function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 500,
      letterSpacing: '0.6px',
      textTransform: 'uppercase',
      color: '#434654',
    }}>
      {children}
    </span>
  );
}

function PageBtn({
  children,
  active,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        border: active ? '1px solid #003298' : '1px solid #C3C5D7',
        background: active ? '#003298' : '#FFFFFF',
        color: active ? '#FFFFFF' : disabled ? '#C3C5D7' : '#434654',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </button>
  );
}

export default function TransactionTable({
  transactions,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
}: Props) {
  const perPage = 5;
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, totalCount);

  // Show at most 3 page buttons around current
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      borderRadius: '8px',
      boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: COL_WIDTHS,
        padding: '11px 20px',
        borderBottom: '1px solid #C3C5D7',
        background: '#FAFAFA',
        gap: '12px',
      }}>
        <ColHeader>Transaction ID</ColHeader>
        <ColHeader>Event</ColHeader>
        <ColHeader>Ticket Type</ColHeader>
        <ColHeader>Amount</ColHeader>
        <ColHeader>Date</ColHeader>
        <ColHeader>Payment Status</ColHeader>
      </div>

      {/* Rows */}
      {transactions.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
          No transactions found.
        </div>
      ) : (
        transactions.map((tx, i) => (
          <div
            key={tx.id}
            style={{
              display: 'grid',
              gridTemplateColumns: COL_WIDTHS,
              padding: '13px 20px',
              borderBottom: i < transactions.length - 1 ? '1px solid #C3C5D7' : 'none',
              alignItems: 'center',
              gap: '12px',
              background: '#FFFFFF',
            }}
          >
            {/* TX ID */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: '#003298',
              fontWeight: 500,
            }}>
              {tx.id}
            </span>

            {/* Event */}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#191B23' }}>
              {tx.event}
            </span>

            {/* Ticket Type */}
            <span style={{ fontSize: '13px', color: '#434654' }}>
              {tx.ticketType}
            </span>

            {/* Amount */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: '#191B23',
              fontWeight: 500,
            }}>
              ${tx.amount.toFixed(2)}
            </span>

            {/* Date */}
            <span style={{ fontSize: '13px', color: '#434654' }}>
              {new Date(tx.date).toLocaleString('en-US', {
                month: 'short', day: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
              })}
            </span>

            {/* Status */}
            <PaymentStatusBadge status={tx.paymentStatus} />
          </div>
        ))
      )}

      {/* Footer: count + pagination */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderTop: '1px solid #C3C5D7',
        background: '#FAFAFA',
      }}>
        <span style={{ fontSize: '13px', color: '#434654' }}>
          Showing {start} to {end} of {totalCount.toLocaleString()} entries
        </span>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Prev */}
          <PageBtn
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </PageBtn>

          {pages.map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} style={{ width: '30px', textAlign: 'center', fontSize: '13px', color: '#6B7280' }}>
                …
              </span>
            ) : (
              <PageBtn
                key={p}
                active={p === currentPage}
                onClick={() => onPageChange(p as number)}
              >
                {p}
              </PageBtn>
            )
          )}

          {/* Next */}
          <PageBtn
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </PageBtn>
        </div>
      </div>
    </div>
  );
}
