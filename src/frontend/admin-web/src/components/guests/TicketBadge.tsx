import React from 'react';

export default function TicketBadge({ type }: { type: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    'VIP ALL-ACCESS': { bg: '#003298', color: '#FFFFFF' },
    'GENERAL':        { bg: '#E7E7F3', color: '#434654' },
    'STAFF':          { bg: '#191B23', color: '#FFFFFF' },
  };
  const s = styles[type] || { bg: '#F3F4F6', color: '#434654' };
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
