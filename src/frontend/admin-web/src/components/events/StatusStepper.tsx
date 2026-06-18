import React from 'react';
import type { ConcertStatus } from '@/types/api';

const CONCERT_STATUS_STEPS: ConcertStatus[] = [
  'DRAFT', 'PUBLISHED', 'SALE_OPEN', 'SALE_CLOSED', 'COMPLETED',
];

const concertStatusLabel: Record<ConcertStatus, string> = {
  DRAFT: 'Draft', PUBLISHED: 'Published', SALE_OPEN: 'Sale Open',
  SALE_CLOSED: 'Sale Closed', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

interface StatusStepperProps {
  current: ConcertStatus;
}

export default function StatusStepper({ current }: StatusStepperProps) {
  const currentIdx = CONCERT_STATUS_STEPS.indexOf(current);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {CONCERT_STATUS_STEPS.map((step, i) => {
        const isPast = i < currentIdx;
        const isCurrent = step === current;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                border: isCurrent ? '2px solid #003298' : isPast ? '2px solid #22C55E' : '2px solid #D1D5DB',
                background: isCurrent ? '#003298' : isPast ? '#22C55E' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isPast && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {isCurrent && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
              )}
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: isCurrent ? 600 : 400,
                color: isCurrent ? '#191B23' : isPast ? '#434654' : '#9CA3AF',
              }}
            >
              {concertStatusLabel[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
