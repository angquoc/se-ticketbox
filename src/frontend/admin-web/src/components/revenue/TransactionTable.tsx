// src/components/revenue/TransactionTable.tsx
'use client';

import { useState } from 'react';
import { Transaction } from '@/types/revenue';
import PaymentStatusBadge from './PaymentStatusBadge';
import { formatVnd } from '@/utils/format';
import Pagination from '@/components/ui/Pagination';

interface Props {
  transactions: Transaction[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

const COL_WIDTHS = '180px 1.6fr 1fr 130px 1.3fr 110px';

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

export default function TransactionTable({
  transactions,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  loading = false,
}: Props) {
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const perPage = 5;

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
        alignItems: 'center',
      }}>
        <ColHeader>Transaction ID</ColHeader>
        <ColHeader>Event</ColHeader>
        <ColHeader>Customer</ColHeader>
        <ColHeader>Amount</ColHeader>
        <ColHeader>Date</ColHeader>
        <ColHeader>Status</ColHeader>
      </div>

      {/* Rows */}
      {loading ? (
        <div style={{ padding: '64px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
          <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #C3C5D7', borderTopColor: '#003298', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '8px' }} />
          <div>Loading transactions...</div>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ padding: '64px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
          No transactions found.
        </div>
      ) : (
        transactions.map((tx, i) => (
          <div
            key={tx.id}
            onMouseEnter={() => setHoveredRowId(tx.id)}
            onMouseLeave={() => setHoveredRowId(null)}
            style={{
              display: 'grid',
              gridTemplateColumns: COL_WIDTHS,
              padding: '13px 20px',
              borderBottom: i < transactions.length - 1 ? '1px solid rgba(195, 197, 215, 0.3)' : 'none',
              alignItems: 'center',
              gap: '12px',
              background: hoveredRowId === tx.id ? '#F8FAFC' : '#FFFFFF',
              transition: 'background 0.15s ease',
            }}
          >
            {/* TX ID */}
            <div style={{ justifySelf: 'start' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#003298',
                fontWeight: 600,
                background: '#EFF6FF',
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #DBEAFE',
                display: 'inline-block',
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {tx.id}
              </span>
            </div>

            {/* Event */}
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#191B23' }}>
              {tx.event}
            </span>

            {/* Customer */}
            <span style={{ fontSize: '13px', color: '#434654', fontFamily: 'var(--font-mono)' }}>
              {'customer' in tx ? (tx as any).customer : '—'}
            </span>

            {/* Amount */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: '#191B23',
              fontWeight: 600,
            }}>
              {formatVnd(tx.amount)}
            </span>

            {/* Date */}
            <span style={{ fontSize: '13px', color: '#434654' }}>
              {new Date(tx.date).toLocaleString('en-US', {
                month: 'short', day: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: false,
              })}
            </span>

            {/* Status */}
            <div>
              <PaymentStatusBadge status={tx.paymentStatus} />
            </div>
          </div>
        ))
      )}

      {/* Footer: count + pagination */}
      {totalPages > 0 && (
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={onPageChange}
          perPage={perPage}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
