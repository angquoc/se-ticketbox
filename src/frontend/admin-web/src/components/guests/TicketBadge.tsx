import React from 'react';
import { TicketType } from '@/types/guests';

export default function TicketBadge({ type }: { type: TicketType }) {
  const styles: Record<TicketType, { bg: string; color: string }> = {
    'VIP ALL-ACCESS': { bg: '#003298', color: '#FFFFFF' },
    'GENERAL':        { bg: '#E7E7F3', color: '#434654' },
    'STAFF':          { bg: '#191B23', color: '#FFFFFF' },
  };
  const s = styles[type];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '3px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.3px',
      background: s.bg,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>{type}</span>
  );
}
