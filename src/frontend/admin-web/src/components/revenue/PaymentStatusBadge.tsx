// src/components/revenue/PaymentStatusBadge.tsx

import { PaymentStatus } from '@/types/revenue';

export default function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const styles: Record<PaymentStatus, { bg: string; color: string; border: string; dot: string }> = {
    Paid:    { bg: '#DCFCE7', color: '#166534', border: '#BBF7D0', dot: '#22C55E' },
    Failed:  { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA', dot: '#EF4444' },
    Pending: { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB', dot: '#9CA3AF' },
  };
  const s = styles[status] || styles.Pending;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: s.dot,
        flexShrink: 0,
      }} />
      {status}
    </span>
  );
}
