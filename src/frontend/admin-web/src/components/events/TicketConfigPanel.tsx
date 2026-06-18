import React, { useState } from 'react';
import type { Concert, TicketType } from '@/types/api';

interface TicketConfigPanelProps {
  event: Concert;
  onClose: () => void;
}

export default function TicketConfigPanel({ event, onClose }: TicketConfigPanelProps) {
  // Use either the event's ticketTypes or an empty array
  const [tiers, setTiers] = useState<TicketType[]>(event.ticketTypes ?? []);

  const updateTier = (id: string, field: 'price' | 'totalQty' | 'maxPerUser', val: number) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: val } : t))
    );
  };

  const addTier = () => {
    const newTier: TicketType = {
      id: `new-${Date.now()}`,
      concertId: event.id,
      name: 'New Tier',
      price: 0,
      totalQty: 100,
      soldQty: 0,
      reservedQty: 0,
      maxPerUser: 4,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTiers((prev) => [...prev, newTier]);
  };

  const removeTier = (id: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div style={{
      width: '320px',
      flexShrink: 0,
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
    }}>
      {/* Panel Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '20px 20px 12px',
        borderBottom: '1px solid #C3C5D7',
        flexShrink: 0,
      }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: '15px', color: '#191B23', margin: 0 }}>Ticket Configuration</p>
          <p style={{ fontSize: '13px', color: '#434654', margin: '2px 0 0' }}>{event.title}</p>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#434654', padding: '2px', display: 'flex', alignItems: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Ticket Types header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px 8px',
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 600, fontSize: '12px', letterSpacing: '0.6px', textTransform: 'uppercase', color: '#434654' }}>
          Ticket Types
        </span>
        <button
          onClick={addTier}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#003298', fontSize: '12px', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: '4px', padding: 0,
            fontFamily: 'var(--font-sans)',
          }}
        >
          + Add Tier
        </button>
      </div>

      {/* Tiers list — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {tiers.map((tier) => (
          <div key={tier.id} style={{
            borderTop: '1px solid #C3C5D7',
            padding: '16px 0',
          }}>
            {/* Tier name + delete */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#191B23' }}>{tier.name}</span>
                {tier.status === 'SOLD_OUT' && (
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '3px',
                    background: '#434654',
                    color: '#FFFFFF',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.4px',
                  }}>SOLD OUT</span>
                )}
              </div>
              <button
                onClick={() => removeTier(tier.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6B7280', padding: '2px', display: 'flex',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>

            {/* Price + Capacity row */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#434654', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Price (VND)
                </label>
                <input
                  type="number"
                  value={tier.price}
                  onChange={(e) => updateTier(tier.id, 'price', Number(e.target.value))}
                  disabled={tier.status === 'SOLD_OUT'}
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #C3C5D7',
                    borderRadius: '4px',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: tier.status === 'SOLD_OUT' ? '#9CA3AF' : '#191B23',
                    background: tier.status === 'SOLD_OUT' ? '#F9FAFB' : '#FFFFFF',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#434654', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                  Capacity
                </label>
                <input
                  type="number"
                  value={tier.totalQty}
                  onChange={(e) => updateTier(tier.id, 'totalQty', Number(e.target.value))}
                  disabled={tier.status === 'SOLD_OUT'}
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #C3C5D7',
                    borderRadius: '4px',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: tier.status === 'SOLD_OUT' ? '#9CA3AF' : '#191B23',
                    background: tier.status === 'SOLD_OUT' ? '#F9FAFB' : '#FFFFFF',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Purchase Limit */}
            <div>
              <label style={{ fontSize: '11px', color: '#434654', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                Purchase Limit (Per Order)
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={tier.maxPerUser}
                  onChange={(e) => updateTier(tier.id, 'maxPerUser', Number(e.target.value))}
                  disabled={tier.status === 'SOLD_OUT'}
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #C3C5D7',
                    borderRadius: '4px',
                    padding: '0 32px 0 10px',
                    fontSize: '13px',
                    color: tier.status === 'SOLD_OUT' ? '#9CA3AF' : '#191B23',
                    background: tier.status === 'SOLD_OUT' ? '#F9FAFB' : '#FFFFFF',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    appearance: 'none',
                    cursor: tier.status === 'SOLD_OUT' ? 'default' : 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  {[2, 4, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>{n} Tickets</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#434654' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Status + Action Buttons */}
      <div style={{ borderTop: '1px solid #C3C5D7', padding: '16px 20px', flexShrink: 0 }}>
        <p style={{ fontWeight: 600, fontSize: '11px', letterSpacing: '0.6px', textTransform: 'uppercase', color: '#434654', margin: '0 0 12px' }}>
          Sales Status
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              height: '36px',
              border: '1px solid #C3C5D7',
              borderRadius: '4px',
              background: '#FFFFFF',
              color: '#434654',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Discard Changes
          </button>
          <button
            onClick={() => {
              // Simulating save
              onClose();
            }}
            style={{
              flex: 1,
              height: '36px',
              border: 'none',
              borderRadius: '4px',
              background: '#003298',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
