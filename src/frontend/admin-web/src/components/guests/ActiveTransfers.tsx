import React from 'react';
import { Transfer } from '@/types/guests';

export default function ActiveTransfers({ transfers, onRemove }: {
  transfers: Transfer[];
  onRemove: (id: string) => void;
}) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      borderRadius: '8px',
      boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
      padding: '20px',
      width: '280px',
      flexShrink: 0,
      alignSelf: 'flex-start',
    }}>
      <p style={{ fontWeight: 600, fontSize: '14px', color: '#191B23', margin: '0 0 16px' }}>
        Active Transfers
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {transfers.map((t) => (
          <div key={t.id}>
            {/* File row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: t.complete ? 0 : '6px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
                {/* Icon */}
                <div style={{ flexShrink: 0, marginTop: '1px' }}>
                  {t.complete ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  )}
                </div>
                {/* Text */}
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize: '13px', fontWeight: 500, color: '#191B23',
                    margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.name}
                  </p>
                  <p style={{ fontSize: '12px', color: t.complete ? '#166534' : '#434654', margin: '1px 0 0' }}>
                    {t.complete ? '1.2 MB · Complete' : `Uploading... ${t.progress}%`}
                  </p>
                </div>
              </div>
              {/* Remove btn */}
              <button
                onClick={() => onRemove(t.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '0 0 0 6px', flexShrink: 0 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {/* Progress bar */}
            {!t.complete && (
              <div style={{ height: '4px', background: '#E7E7F3', borderRadius: '2px', overflow: 'hidden', marginLeft: '23px' }}>
                <div style={{
                  height: '100%',
                  width: `${t.progress}%`,
                  background: '#003298',
                  borderRadius: '2px',
                  transition: 'width 0.3s',
                }} />
              </div>
            )}
          </div>
        ))}
        {transfers.length === 0 && (
          <p style={{ fontSize: '13px', color: '#6B7280', textAlign: 'center', padding: '8px 0' }}>
            No active transfers
          </p>
        )}
      </div>
    </div>
  );
}
