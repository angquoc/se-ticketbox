/**
 * TicketTypeRow.tsx
 * Một hàng dữ liệu trong bảng Ticket Types trên trang /events/[id].
 * Hiển thị tên vé, giá, capacity bar, status badge, và nút Edit.
 */

import type { TicketType } from '@/types/api';
import { TicketStatusBadge } from '@/components/ui/Badge';
import CapacityBar from '@/components/events/CapacityBar';
import { formatVnd } from '@/utils/format';

export interface TicketTypeRowProps {
  ticketType: TicketType;
}

export default function TicketTypeRow({ ticketType }: TicketTypeRowProps) {
  const tt = ticketType;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1.8fr 1fr 1.5fr 0.8fr',
        padding: '14px 12px',
        borderTop: '1px solid #F3F4F6',
        alignItems: 'center',
      }}
    >
      {/* Name + max per order */}
      <div>
        <p style={{ fontWeight: 600, fontSize: '13px', color: '#191B23', margin: '0 0 2px' }}>
          {tt.name}
        </p>
        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
          max {tt.maxPerUser} / order
        </p>
      </div>

      {/* Price */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#191B23' }}>
        {formatVnd(tt.price)}
      </span>

      {/* Capacity bar */}
      <CapacityBar sold={tt.soldQty} reserved={tt.reservedQty} total={tt.totalQty} />

      {/* Status badge */}
      <TicketStatusBadge status={tt.status} />
    </div>
  );
}
