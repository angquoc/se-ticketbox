import React from 'react';
import type { EventFormErrors } from '@/types/events';

interface ValidationSummaryProps {
  errors: EventFormErrors;
}

export default function ValidationSummary({ errors }: ValidationSummaryProps) {
  const messages = Object.values(errors);
  if (messages.length === 0) return null;
  return (
    <div
      style={{
        padding: '12px 16px',
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: '6px',
      }}
    >
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#991B1B', margin: '0 0 6px' }}>
        Please fix the following errors:
      </p>
      <ul style={{ margin: 0, paddingLeft: '16px' }}>
        {messages.map((msg, i) => (
          <li key={i} style={{ fontSize: '12px', color: '#BA1A1A' }}>
            {msg}
          </li>
        ))}
      </ul>
    </div>
  );
}
