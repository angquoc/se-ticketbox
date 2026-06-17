/**
 * Badge.tsx
 * Tập hợp các Status Badge dùng trong admin-web.
 * Tuân thủ bảng màu chuẩn trong ui-admin-web.md.
 */

import type { ConcertStatus, TicketTypeStatus, UploadedFileStatus } from '@/types/api';

// ── Config Maps ────────────────────────────────────────────────────────

const concertStatusConfig: Record<ConcertStatus, { label: string; bg: string; color: string }> = {
  DRAFT:       { label: 'Draft',       bg: '#F3F4F6', color: '#4B5563' },
  PUBLISHED:   { label: 'Published',   bg: '#EFF6FF', color: '#1D4ED8' },
  SALE_OPEN:   { label: 'Sale Open',   bg: '#DCFCE7', color: '#166534' },
  SALE_CLOSED: { label: 'Sale Closed', bg: '#FEF9C3', color: '#854D0E' },
  COMPLETED:   { label: 'Completed',   bg: '#E7E7F3', color: '#191B23' },
  CANCELLED:   { label: 'Cancelled',   bg: '#FEE2E2', color: '#991B1B' },
};

const ticketStatusConfig: Record<TicketTypeStatus, { label: string; bg: string; color: string }> = {
  ACTIVE:   { label: 'Active',   bg: '#DCFCE7', color: '#166534' },
  INACTIVE: { label: 'Inactive', bg: '#F3F4F6', color: '#4B5563' },
  SOLD_OUT: { label: 'Sold Out', bg: '#FEE2E2', color: '#991B1B' },
};

const uploadStatusConfig: Record<
  UploadedFileStatus,
  { label: string; bg: string; color: string; dot: string }
> = {
  PENDING:               { label: 'Pending',             bg: '#F3F4F6', color: '#4B5563', dot: '#9CA3AF' },
  PROCESSING:            { label: 'Processing…',         bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
  COMPLETED:             { label: 'Completed',            bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
  COMPLETED_WITH_ERRORS: { label: 'Completed w/ Errors', bg: '#FEF9C3', color: '#854D0E', dot: '#EAB308' },
  FAILED:                { label: 'Failed',               bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

// ── Badge Components ───────────────────────────────────────────────────

export interface ConcertStatusBadgeProps {
  status: ConcertStatus;
}

export function ConcertStatusBadge({ status }: ConcertStatusBadgeProps) {
  const cfg = concertStatusConfig[status];
  return (
    <span
      style={{
        padding: '3px 12px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

export interface TicketStatusBadgeProps {
  status: TicketTypeStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const cfg = ticketStatusConfig[status];
  return (
    <span
      style={{
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

export interface UploadStatusBadgeProps {
  status: UploadedFileStatus;
}

export function UploadStatusBadge({ status }: UploadStatusBadgeProps) {
  const cfg = uploadStatusConfig[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 500,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}
