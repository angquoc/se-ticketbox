import React, { useState } from 'react';
import type { Concert, TicketType } from '@/types/api';
import { createTicketType, updateTicketType, deleteTicketType } from '@/services/concertService';

interface TicketConfigPanelProps {
  event: Concert;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export default function TicketConfigPanel({ event, onClose, onSaveSuccess }: TicketConfigPanelProps) {
  // Use either the event's ticketTypes or an empty array
  const [tiers, setTiers] = useState<TicketType[]>(event.ticketTypes ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTier = (id: string, field: keyof TicketType, val: any) => {
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const safeNum = (val: any) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };
    try {
      const originalTiers = event.ticketTypes ?? [];
      const deletedTiers = originalTiers.filter(
        (orig) => !tiers.some((t) => t.id === orig.id)
      );

      // Delete removed tiers
      for (const t of deletedTiers) {
        await deleteTicketType(event.id, t.id);
      }

      // Add or update existing tiers
      for (const t of tiers) {
        if (t.id.startsWith('new-')) {
          await createTicketType(event.id, {
            name: t.name,
            price: safeNum(t.price),
            totalQty: safeNum(t.totalQty),
            maxPerUser: safeNum(t.maxPerUser) || 4,
            saleStartsAt: event.saleStartsAt || new Date().toISOString(),
            saleEndsAt: event.saleEndsAt || undefined,
          });

        } else {
          const orig = originalTiers.find((o) => o.id === t.id);
          if (orig) {
            const priceChanged = safeNum(orig.price) !== safeNum(t.price);
            const totalQtyChanged = safeNum(orig.totalQty) !== safeNum(t.totalQty);
            const maxPerUserChanged = safeNum(orig.maxPerUser) !== safeNum(t.maxPerUser);
            const nameChanged = String(orig.name || '') !== String(t.name || '');

            console.log(`Checking tier ${t.id} (${t.name}):`, {
              priceChanged,
              totalQtyChanged,
              maxPerUserChanged,
              nameChanged,
              orig: { name: orig.name, price: orig.price, totalQty: orig.totalQty, maxPerUser: orig.maxPerUser },
              new: { name: t.name, price: t.price, totalQty: t.totalQty, maxPerUser: t.maxPerUser }
            });

            if (priceChanged || totalQtyChanged || maxPerUserChanged || nameChanged) {
              console.log(`Updating tier ${t.id} in DB...`);
              await updateTicketType(event.id, t.id, {
                name: t.name,
                price: safeNum(t.price),
                totalQty: safeNum(t.totalQty),
                maxPerUser: safeNum(t.maxPerUser) || 4,
              });
            }
          }
        }
      }

      if (onSaveSuccess) {
        onSaveSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save ticket config:', err);
      setError(
        err?.response?.data?.message ||
          'Failed to save configuration. Check capacity limits or if tickets are already sold.'
      );
    } finally {
      setSaving(false);
    }
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
                <input
                  type="text"
                  value={tier.name}
                  onChange={(e) => updateTier(tier.id, 'name', e.target.value)}
                  disabled={saving || tier.status === 'SOLD_OUT'}
                  style={{
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#191B23',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px dashed #C3C5D7',
                    padding: '2px 0',
                    outline: 'none',
                    width: '120px',
                  }}
                />
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
                disabled={saving}
                style={{
                  background: 'none', border: 'none', cursor: saving ? 'default' : 'pointer',
                  color: '#6B7280', padding: '2px', display: 'flex',
                  opacity: saving ? 0.5 : 1,
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
                  disabled={saving || tier.status === 'SOLD_OUT'}
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #C3C5D7',
                    borderRadius: '4px',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: (saving || tier.status === 'SOLD_OUT') ? '#9CA3AF' : '#191B23',
                    background: (saving || tier.status === 'SOLD_OUT') ? '#F9FAFB' : '#FFFFFF',
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
                  disabled={saving || tier.status === 'SOLD_OUT'}
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #C3C5D7',
                    borderRadius: '4px',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: (saving || tier.status === 'SOLD_OUT') ? '#9CA3AF' : '#191B23',
                    background: (saving || tier.status === 'SOLD_OUT') ? '#F9FAFB' : '#FFFFFF',
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
                  disabled={saving || tier.status === 'SOLD_OUT'}
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #C3C5D7',
                    borderRadius: '4px',
                    padding: '0 32px 0 10px',
                    fontSize: '13px',
                    color: (saving || tier.status === 'SOLD_OUT') ? '#9CA3AF' : '#191B23',
                    background: (saving || tier.status === 'SOLD_OUT') ? '#F9FAFB' : '#FFFFFF',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    appearance: 'none',
                    cursor: (saving || tier.status === 'SOLD_OUT') ? 'default' : 'pointer',
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
        {error && (
          <p style={{ color: '#BA1A1A', fontSize: '12px', margin: '0 0 12px', fontWeight: 500, lineHeight: '16px' }}>
            {error}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1,
              height: '36px',
              border: '1px solid #C3C5D7',
              borderRadius: '4px',
              background: '#FFFFFF',
              color: '#434654',
              fontSize: '13px',
              fontWeight: 500,
              cursor: saving ? 'default' : 'pointer',
              fontFamily: 'var(--font-sans)',
              opacity: saving ? 0.6 : 1,
            }}
          >
            Discard Changes
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              height: '36px',
              border: 'none',
              borderRadius: '4px',
              background: saving ? '#6B8CC7' : '#003298',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {saving ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>
      </div>

    </div>
  );
}
