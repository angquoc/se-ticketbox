// src/components/revenue/PaymentStatusBadge.tsx

import { PaymentStatus } from '@/types/revenue';

export default function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, { bg: string; color: string; border: string }> = {
    Paid:    { bg: '#DCFCE7', color: '#166534', border: '#BBF7D0' },
    Failed:  { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
    Pending: { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' },
  };
  const s = styles[status];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 500,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}
