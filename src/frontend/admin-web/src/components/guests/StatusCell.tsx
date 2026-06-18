import React from 'react';
import { GuestStatus } from '@/types/guests';

export default function StatusCell({ status }: { status: GuestStatus }) {
  if (status === 'Valid') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#166534', fontSize: '13px', fontWeight: 500 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Valid
      </span>
    );
  }
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#991B1B', fontSize: '13px', fontWeight: 500 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {status}
    </span>
  );
}
