import React from 'react';

export interface UpcomingEventData {
  name: string;
  venue: string;
  day: number;
  pct: number;
  sold: string | number;
  total: string | number;
  bg: string;
  textColor: string;
}

interface UpcomingEventsProps {
  events?: UpcomingEventData[];
  loading?: boolean;
}

export default function UpcomingEvents({ events = [], loading = false }: UpcomingEventsProps) {
  return (
    <div style={{
      width: '300px',
      flexShrink: 0,
      background: '#FFFFFF',
      border: '1px solid #C3C5D7',
      boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
      borderRadius: '8px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '16px', lineHeight: '24px', color: '#191B23' }}>
          Upcoming Events
        </span>
        <a href="/events" style={{ fontWeight: 500, fontSize: '12px', lineHeight: '16px', color: '#003298', textDecoration: 'none' }}>
          View All
        </a>
      </div>

      {/* Event rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
        {loading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                borderBottom: i < 3 ? '1px solid rgba(195,197,215,0.3)' : 'none',
                borderRadius: '4px',
                opacity: 0.6,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '2px', background: '#F1F3F9', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <div style={{ width: '80%', height: '12px', background: '#F1F3F9', borderRadius: '2px' }} />
                  <div style={{ width: '50%', height: '10px', background: '#F1F3F9', borderRadius: '2px' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', width: '60px' }}>
                <div style={{ width: '25px', height: '10px', background: '#F1F3F9', borderRadius: '2px' }} />
                <div style={{ width: '45px', height: '10px', background: '#F1F3F9', borderRadius: '2px' }} />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          // Empty State
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 8px',
            textAlign: 'center',
            color: '#6B7280',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', opacity: 0.5 }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>No upcoming events</span>
          </div>
        ) : (
          events.map((ev, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px',
                borderBottom: i < events.length - 1 ? '1px solid rgba(195,197,215,0.3)' : 'none',
                borderRadius: '4px',
              }}
            >
              {/* Left: date badge + name/venue */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '2px',
                  background: ev.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontWeight: 600, fontSize: '20px', lineHeight: '28px', color: ev.textColor }}>
                    {ev.day}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontWeight: 600,
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#191B23',
                    margin: 0,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                  }}>{ev.name}</p>
                  <p style={{
                    fontWeight: 400,
                    fontSize: '13px',
                    lineHeight: '18px',
                    color: '#434654',
                    margin: 0,
                  }}>{ev.venue}</p>
                </div>
              </div>

              {/* Right: pct + sold */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, marginLeft: '8px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: '13px',
                  lineHeight: '18px',
                  color: '#191B23',
                  whiteSpace: 'nowrap',
                }}>{ev.pct}%</span>
                <span style={{
                  fontWeight: 400,
                  fontSize: '13px',
                  lineHeight: '18px',
                  color: '#434654',
                  whiteSpace: 'nowrap',
                }}>Sold</span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: '13px',
                  lineHeight: '18px',
                  color: '#191B23',
                  whiteSpace: 'nowrap',
                }}>{ev.sold}/{ev.total}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

