import React from 'react';

const upcomingEvents = [
  { day: 12, name: 'Summer Music Festival', venue: 'San Francisco, CA', pct: 85, sold: '2.4k', total: '3k', bg: '#D0E1FB', textColor: '#54647A' },
  { day: 15, name: 'Tech Conference 2024', venue: 'Austin, TX',         pct: 62, sold: '620',  total: '1k', bg: '#E7E7F3', textColor: '#434654' },
  { day: 18, name: 'Standup Comedy Night', venue: 'New York, NY',       pct: 98, sold: '490',  total: '500', bg: '#E7E7F3', textColor: '#434654' },
  { day: 22, name: 'Food & Wine Expo',     venue: 'Chicago, IL',        pct: 45, sold: '900',  total: '2k', bg: '#E7E7F3', textColor: '#434654' },
];

export default function UpcomingEvents() {
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
        {upcomingEvents.map((ev, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px',
              borderBottom: i < upcomingEvents.length - 1 ? '1px solid rgba(195,197,215,0.3)' : 'none',
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
        ))}
      </div>
    </div>
  );
}
