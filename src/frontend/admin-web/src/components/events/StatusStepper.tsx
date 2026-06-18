'use client';

import React, { useState } from 'react';
import type { ConcertStatus } from '@/types/api';

// ── Config ──────────────────────────────────────────────────────────────

/** Chỉ DRAFT ↔ PUBLISHED là admin điều khiển thủ công.
 *  Các trạng thái còn lại do hệ thống tự động dựa theo thời gian. */
const MANUAL_STATUSES: ConcertStatus[] = ['DRAFT', 'PUBLISHED'];

const AUTO_STATUSES: ConcertStatus[] = ['SALE_OPEN', 'SALE_CLOSED', 'COMPLETED'];

const STATUS_LABEL: Record<ConcertStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  SALE_OPEN: 'Sale Open',
  SALE_CLOSED: 'Sale Closed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const STATUS_HINT: Partial<Record<ConcertStatus, string>> = {
  DRAFT: 'Hidden from customers. Continue editing before publishing.',
  PUBLISHED: 'Visible to customers. Tickets go on sale automatically.',
  SALE_OPEN: 'Triggered automatically when Sale Start date is reached.',
  SALE_CLOSED: 'Triggered automatically when Sale End date is reached.',
  COMPLETED: 'Triggered automatically when the event ends.',
};

// ── Sub-components ──────────────────────────────────────────────────────

function DotIcon({ color, children }: { color: string; children?: React.ReactNode }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      background: color, border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

interface StatusStepperProps {
  current: ConcertStatus;
  onStatusChange?: (newStatus: ConcertStatus) => void;
  updating?: boolean;
}

export default function StatusStepper({ current, onStatusChange, updating }: StatusStepperProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);

  const isDraft = current === 'DRAFT';
  const isPublished = current === 'PUBLISHED';
  const isCancelled = current === 'CANCELLED';
  const isAutoPhase = AUTO_STATUSES.includes(current);
  const isCompleted = current === 'COMPLETED';
  const canManuallySwitch = (isDraft || isPublished) && !isCancelled && !!onStatusChange;
  const canCancel = (isDraft || isPublished) && !!onStatusChange;

  const handleToggle = () => {
    if (!onStatusChange || updating) return;
    onStatusChange(isDraft ? 'PUBLISHED' : 'DRAFT');
  };

  const handleConfirmCancel = () => {
    if (!onStatusChange || updating) return;
    onStatusChange('CANCELLED');
    setConfirmCancel(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Section 1: Manual control (DRAFT / PUBLISHED) ── */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 10px' }}>
          Visibility
        </p>

        {isCancelled ? (
          <div style={{
            padding: '12px 14px', borderRadius: '6px',
            background: '#FEE2E2', border: '1px solid #FECACA',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <DotIcon color="#BA1A1A">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </DotIcon>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B' }}>Cancelled</span>
              <p style={{ fontSize: '12px', color: '#B91C1C', margin: '2px 0 0' }}>This event has been cancelled and is no longer accessible.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Toggle button DRAFT ↔ PUBLISHED */}
            <div style={{
              display: 'flex',
              border: '1px solid #C3C5D7',
              borderRadius: '6px',
              overflow: 'hidden',
              opacity: (isAutoPhase || isCompleted) ? 0.5 : 1,
            }}>
              {MANUAL_STATUSES.map((s) => {
                const isActive = current === s;
                return (
                  <button
                    key={s}
                    onClick={() => !isActive && canManuallySwitch && !isAutoPhase && !isCompleted && handleToggle()}
                    disabled={updating || isAutoPhase || isCompleted}
                    style={{
                      flex: 1,
                      padding: '9px 0',
                      border: 'none',
                      background: isActive ? '#003298' : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#434654',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      cursor: (!isActive && canManuallySwitch && !isAutoPhase && !isCompleted) ? 'pointer' : 'default',
                      fontFamily: 'var(--font-sans)',
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                );
              })}
            </div>

            {/* Hint text */}
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              {(isAutoPhase || isCompleted)
                ? 'Status is now managed automatically by the system.'
                : STATUS_HINT[current]}
            </p>

            {/* Saving indicator */}
            {updating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  border: '2px solid #C3C5D7', borderTopColor: '#003298',
                  animation: 'spin 0.7s linear infinite',
                }} />
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Saving…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 2: Automatic timeline ── */}
      <div>
        <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 10px' }}>
          Automatic Timeline
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {AUTO_STATUSES.map((step, i) => {
            const isCurrentAuto = current === step;
            const isPastAuto = AUTO_STATUSES.indexOf(current) > i && current !== 'DRAFT' && current !== 'PUBLISHED';

            return (
              <div key={step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {/* Connector + dot */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                  alignSelf: 'stretch',
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: isCurrentAuto ? '#003298' : isPastAuto ? '#22C55E' : '#F3F4F6',
                    border: `2px solid ${isCurrentAuto ? '#003298' : isPastAuto ? '#22C55E' : '#D1D5DB'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isPastAuto && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {isCurrentAuto && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                    )}
                  </div>
                  {i < AUTO_STATUSES.length - 1 && (
                    <div style={{
                      width: 2,
                      flexGrow: 1,
                      minHeight: '16px',
                      background: isPastAuto ? '#22C55E' : '#E5E7EB',
                    }} />
                  )}
                </div>

                {/* Label */}
                <div style={{ paddingBottom: i < AUTO_STATUSES.length - 1 ? '16px' : 0, paddingTop: 0 }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: isCurrentAuto ? 600 : 400,
                    color: isCurrentAuto ? '#191B23' : isPastAuto ? '#434654' : '#9CA3AF',
                    lineHeight: '16px',
                  }}>
                    {STATUS_LABEL[step]}
                  </span>
                  {isCurrentAuto && (
                    <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>
                      {STATUS_HINT[step]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Cancel Event ── */}
      {canCancel && !isCancelled && (
        <div style={{ paddingTop: '12px', borderTop: '1px solid #E7E7F3' }}>
          {!confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              disabled={updating}
              style={{
                width: '100%',
                padding: '7px 0',
                background: 'none',
                border: '1px solid #FECACA',
                borderRadius: '4px',
                color: '#991B1B',
                fontSize: '12px',
                fontWeight: 500,
                cursor: updating ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!updating) (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
            >
              Cancel Event
            </button>
          ) : (
            /* Confirm dialog inline */
            <div style={{
              padding: '14px',
              borderRadius: '6px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BA1A1A" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#991B1B', margin: 0 }}>Confirm Cancellation</p>
                  <p style={{ fontSize: '12px', color: '#B91C1C', margin: '4px 0 0', lineHeight: '18px' }}>
                    This action cannot be undone. The event will be hidden and all pending ticket sales will be voided.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setConfirmCancel(false)}
                  style={{
                    flex: 1, padding: '7px 0',
                    background: '#FFFFFF', border: '1px solid #C3C5D7',
                    borderRadius: '4px', color: '#434654',
                    fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'background 0.15s',
                  }}
                >
                  Keep Event
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={updating}
                  style={{
                    flex: 1, padding: '7px 0',
                    background: '#BA1A1A', border: 'none',
                    borderRadius: '4px', color: '#FFFFFF',
                    fontSize: '12px', fontWeight: 600,
                    cursor: updating ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { if (!updating) (e.currentTarget as HTMLButtonElement).style.background = '#991B1B'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#BA1A1A'; }}
                >
                  Yes, Cancel Event
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
