'use client';
import { useState } from 'react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────
type EventStatus = 'Upcoming' | 'Ongoing' | 'Sold Out';

interface TicketTier {
  id: string;
  name: string;
  price: number;
  capacity: number;
  purchaseLimit: number;
  soldOut?: boolean;
}

interface Event {
  id: string;
  name: string;
  genre: string;
  date: string;
  venue: string;
  status: EventStatus;
  ticketTiers: TicketTier[];
}

// ── Mock Data ─────────────────────────────────────────────────────────
const mockEvents: Event[] = [
  {
    id: '1',
    name: 'Neon Nights Festival',
    genre: 'Electronic / Dance',
    date: 'Oct 14, 2024',
    venue: 'Echo Arena',
    status: 'Upcoming',
    ticketTiers: [
      { id: 't1', name: 'VIP Pass',           price: 250, capacity: 500,  purchaseLimit: 4 },
      { id: 't2', name: 'Standard Admission', price: 85,  capacity: 5000, purchaseLimit: 8 },
      { id: 't3', name: 'Early Bird',         price: 65,  capacity: 1000, purchaseLimit: 4, soldOut: true },
    ],
  },
  {
    id: '2',
    name: 'The Midnight Tour',
    genre: 'Synthwave',
    date: 'Nov 02, 2024',
    venue: 'The Roxy Theatre',
    status: 'Sold Out',
    ticketTiers: [
      { id: 't4', name: 'General Admission',  price: 120, capacity: 1200, purchaseLimit: 6, soldOut: true },
    ],
  },
  {
    id: '3',
    name: 'Summer Sonic 24',
    genre: 'Multi-genre',
    date: 'Aug 15, 2024',
    venue: 'Makuhari Messe',
    status: 'Ongoing',
    ticketTiers: [
      { id: 't5', name: 'VIP Pass',           price: 250, capacity: 500,  purchaseLimit: 4 },
      { id: 't6', name: 'Standard Admission', price: 85,  capacity: 5000, purchaseLimit: 8 },
      { id: 't7', name: 'Early Bird',         price: 65,  capacity: 1000, purchaseLimit: 4, soldOut: true },
    ],
  },
  {
    id: '4',
    name: 'Acoustic Sessions',
    genre: 'Indie / Folk',
    date: 'Dec 10, 2024',
    venue: 'Bluebird Cafe',
    status: 'Upcoming',
    ticketTiers: [
      { id: 't8', name: 'General Admission',  price: 45,  capacity: 300,  purchaseLimit: 4 },
      { id: 't9', name: 'Front Row',          price: 95,  capacity: 50,   purchaseLimit: 2 },
    ],
  },
  {
    id: '5',
    name: 'Jazz Under the Stars',
    genre: 'Jazz / Soul',
    date: 'Jan 18, 2025',
    venue: 'Rooftop Garden',
    status: 'Upcoming',
    ticketTiers: [
      { id: 't10', name: 'Standard', price: 60, capacity: 400, purchaseLimit: 6 },
    ],
  },
];

// ── Status Badge ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: EventStatus }) {
  const styles: Record<EventStatus, { bg: string; color: string }> = {
    Upcoming: { bg: '#DCFCE7', color: '#166534' },
    Ongoing:  { bg: '#DBEAFE', color: '#1E40AF' },
    'Sold Out': { bg: '#FEE2E2', color: '#991B1B' },
  };
  const s = styles[status];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      width: 'fit-content',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 500,
      background: s.bg,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>{status}</span>
  );
}

// ── Ticket Configuration Panel ────────────────────────────────────────
function TicketConfigPanel({
  event,
  onClose,
}: {
  event: Event;
  onClose: () => void;
}) {
  const [tiers, setTiers] = useState<TicketTier[]>(event.ticketTiers);

  const updateTier = (id: string, field: 'price' | 'capacity' | 'purchaseLimit', val: number) => {
    setTiers((prev) => prev.map((t) => t.id === id ? { ...t, [field]: val } : t));
  };

  const addTier = () => {
    const newTier: TicketTier = {
      id: `new-${Date.now()}`,
      name: 'New Tier',
      price: 0,
      capacity: 100,
      purchaseLimit: 4,
    };
    setTiers((prev) => [...prev, newTier]);
  };

  const removeTier = (id: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div style={{
      width: '300px',
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
          <p style={{ fontSize: '13px', color: '#434654', margin: '2px 0 0' }}>{event.name}</p>
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
                {tier.soldOut && (
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
                  Price ($)
                </label>
                <input
                  type="number"
                  value={tier.price}
                  onChange={(e) => updateTier(tier.id, 'price', Number(e.target.value))}
                  disabled={tier.soldOut}
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #C3C5D7',
                    borderRadius: '4px',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: tier.soldOut ? '#9CA3AF' : '#191B23',
                    background: tier.soldOut ? '#F9FAFB' : '#FFFFFF',
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
                  value={tier.capacity}
                  onChange={(e) => updateTier(tier.id, 'capacity', Number(e.target.value))}
                  disabled={tier.soldOut}
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #C3C5D7',
                    borderRadius: '4px',
                    padding: '0 10px',
                    fontSize: '13px',
                    color: tier.soldOut ? '#9CA3AF' : '#191B23',
                    background: tier.soldOut ? '#F9FAFB' : '#FFFFFF',
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
                  value={tier.purchaseLimit}
                  onChange={(e) => updateTier(tier.id, 'purchaseLimit', Number(e.target.value))}
                  disabled={tier.soldOut}
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #C3C5D7',
                    borderRadius: '4px',
                    padding: '0 32px 0 10px',
                    fontSize: '13px',
                    color: tier.soldOut ? '#9CA3AF' : '#191B23',
                    background: tier.soldOut ? '#F9FAFB' : '#FFFFFF',
                    fontFamily: 'var(--font-sans)',
                    outline: 'none',
                    appearance: 'none',
                    cursor: tier.soldOut ? 'default' : 'pointer',
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

// ── Main Page ─────────────────────────────────────────────────────────
export default function EventsPage() {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [currentPage] = useState(1);
  const totalPages = 5;

  const handleEdit = (event: Event) => {
    setEditingEvent((prev) => (prev?.id === event.id ? null : event));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontWeight: 700,
            fontSize: '30px',
            lineHeight: '36px',
            letterSpacing: '-0.6px',
            color: '#191B23',
            margin: 0,
          }}>Events</h1>
          <p style={{
            fontWeight: 400,
            fontSize: '14px',
            lineHeight: '20px',
            color: '#434654',
            margin: '4px 0 0',
          }}>Manage upcoming concerts, festivals, and venue configurations.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '34px', padding: '0 14px',
            border: '1px solid #C3C5D7', borderRadius: '4px',
            background: '#FFFFFF', color: '#434654',
            fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '34px', padding: '0 14px',
            border: '1px solid #C3C5D7', borderRadius: '4px',
            background: '#FFFFFF', color: '#434654',
            fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* ── Content: Table + Config Panel ── */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flex: 1, minHeight: 0 }}>

        {/* Event Roster Table */}
        <div style={{
          flex: 1,
          background: '#FFFFFF',
          border: '1px solid #C3C5D7',
          borderRadius: '8px',
          boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Table head bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid #C3C5D7',
          }}>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#191B23' }}>Event Roster</span>
            <span style={{ fontSize: '13px', color: '#434654' }}>Showing 1-10 of 45</span>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.2fr 1.4fr 0.9fr 0.7fr',
            padding: '10px 20px',
            borderBottom: '1px solid #C3C5D7',
            background: '#FAFAFA',

            justifyItems: 'center',
            textAlign: 'center',
          }}>
            {['EVENT NAME', 'DATE', 'VENUE', 'STATUS', 'ACTIONS'].map((col) => (
              <span key={col} style={{
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.6px',
                color: '#434654',
                textTransform: 'uppercase',
                justifySelf: col === 'EVENT NAME' ? 'start' : undefined,
                textAlign: col === 'EVENT NAME' ? 'left' : undefined,
              }}>{col}</span>
            ))}
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {mockEvents.map((event) => {
              const isEditing = editingEvent?.id === event.id;
              return (
                <div
                  key={event.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.2fr 1.4fr 0.9fr 0.7fr',
                    padding: '14px 20px',
                    borderBottom: '1px solid #C3C5D7',
                    alignItems: 'center',
                    justifyItems: 'center',
                    textAlign: 'center',
                    background: isEditing ? '#F0F5FF' : '#FFFFFF',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Event Name */}
                  <div style={{ justifySelf: 'start', textAlign: 'left' }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: '#191B23', margin: 0 }}>{event.name}</p>
                    <p style={{ fontSize: '12px', color: '#434654', margin: '2px 0 0' }}>{event.genre}</p>
                  </div>

                  {/* Date */}
                  <span style={{ fontSize: '13px', color: '#434654' }}>{event.date}</span>

                  {/* Venue */}
                  <span style={{ fontSize: '13px', color: '#434654' }}>{event.venue}</span>

                  {/* Status */}
                  <StatusBadge status={event.status} />

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <Link
                      href={`/events/${event.id}`}
                      style={{
                        background: 'none', border: 'none',
                        padding: '4px 0',
                        color: '#434654', fontSize: '13px', fontWeight: 500,
                        cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        textDecoration: 'none',
                      }}
                    >
                      View
                    </Link>
                    <span style={{ color: '#C3C5D7', fontSize: '12px' }}>|</span>
                    {isEditing ? (
                      <button
                        onClick={() => setEditingEvent(null)}
                        style={{
                          background: '#003298', border: 'none',
                          borderRadius: '4px', padding: '4px 12px',
                          color: '#FFFFFF', fontSize: '13px', fontWeight: 500,
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Editing
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEdit(event)}
                        style={{
                          background: 'none', border: 'none',
                          padding: '4px 0',
                          color: '#003298', fontSize: '13px', fontWeight: 500,
                          cursor: 'pointer', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 20px',
            borderTop: '1px solid #C3C5D7',
          }}>
            <button
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#434654', display: 'flex', alignItems: 'center', padding: '4px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span style={{ fontSize: '13px', color: '#434654' }}>
              Page <strong style={{ color: '#191B23' }}>{currentPage}</strong> of {totalPages}
            </span>
            <button
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#434654', display: 'flex', alignItems: 'center', padding: '4px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Ticket Configuration Panel — hiện khi click Edit */}
        {editingEvent && (
          <TicketConfigPanel
            event={editingEvent}
            onClose={() => setEditingEvent(null)}
          />
        )}
      </div>
    </div>
  );
}