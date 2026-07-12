'use client';
import { useState } from 'react';

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
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        border: active ? '1px solid #003298' : '1px solid #C3C5D7',
        background: active ? '#003298' : hovered ? '#F3F4F6' : '#FFFFFF',
        color: active ? '#FFFFFF' : disabled ? '#C3C5D7' : '#434654',
        fontSize: '13px',
        fontWeight: active ? 600 : 500,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font-sans)',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  perPage?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  perPage = 20, // default limit is 20 for users, 5 for events, we can pass it
}: PaginationProps) {
  const start = totalCount > 0 ? (currentPage - 1) * perPage + 1 : 0;
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
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </PageBtn>

        {pages.map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} style={{ width: '30px', textAlign: 'center', fontSize: '13px', color: '#434654' }}>
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
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </PageBtn>
      </div>
    </div>
  );
}
