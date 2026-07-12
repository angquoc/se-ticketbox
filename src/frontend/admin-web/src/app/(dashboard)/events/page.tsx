'use client';
import Link from 'next/link';
import { ConcertStatusBadge } from '@/components/ui/Badge';
import TicketConfigPanel from '@/components/events/TicketConfigPanel';
import { useEventsData } from '@/hooks/useEventsData';
import { formatDate } from '@/utils/format';
import Pagination from '@/components/ui/Pagination';

import { useAuth } from '@/components/providers/AuthProvider';

// ── Main Page ─────────────────────────────────────────────────────────
export default function EventsPage() {
  const { isAdmin } = useAuth();
  const {
    concerts,
    total,
    loading,
    currentPage,
    totalPages,
    editingEvent,
    handleEdit,
    setEditingEvent,
    handlePageChange,
    refresh,
  } = useEventsData();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, minHeight: 0 }}>

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
          }}>{isAdmin ? 'All Events' : 'My Events'}</h1>
          <p style={{
            fontWeight: 400,
            fontSize: '14px',
            lineHeight: '20px',
            color: '#434654',
            margin: '4px 0 0',
          }}>{isAdmin ? 'Manage all concerts and festivals.' : 'Manage your upcoming concerts and events.'}</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/events/new" style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '34px', padding: '0 14px',
            border: 'none', borderRadius: '4px',
            background: '#003298', color: '#FFFFFF',
            fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            textDecoration: 'none',
          }}>
            + Create Event
          </Link>
        </div>
      </div>

      {/* ── Content: Table + Config Panel ── */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'stretch', flex: 1, minHeight: 0 }}>

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
            <span style={{ fontSize: '13px', color: '#434654' }}>
              {loading ? 'Loading…' : `Showing 1-${concerts.length} of ${total}`}
            </span>
          </div>

          {/* Column headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.7fr)',
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
          <div style={{ flex: 1, overflowY: 'auto', minHeight: '300px' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#434654' }}>Loading events...</div>
            ) : concerts.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#434654' }}>No events found.</div>
            ) : (
              concerts.map((event) => {
                const isEditing = editingEvent?.id === event.id;
                return (
                  <div
                    key={event.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 0.7fr)',
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
                    <div style={{ justifySelf: 'start', textAlign: 'left', width: '100%', overflow: 'hidden' }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', color: '#191B23', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={event.title}>{event.title}</p>
                      <p style={{ fontSize: '12px', color: '#434654', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={event.organizer?.fullName || 'TicketBox'}>{event.organizer?.fullName || 'TicketBox'}</p>
                    </div>

                    {/* Date */}
                    <span style={{ fontSize: '13px', color: '#434654', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{formatDate(event.startsAt)}</span>

                    {/* Venue */}
                    <span style={{ fontSize: '13px', color: '#434654', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }} title={event.venue}>{event.venue}</span>

                    {/* Status */}
                    <ConcertStatusBadge status={event.status} />

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
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={total}
              onPageChange={handlePageChange}
              perPage={5}
            />
          )}
        </div>

        {/* Ticket Configuration Panel — hiện khi click Edit */}
        {editingEvent && (
          <TicketConfigPanel
            event={editingEvent}
            onClose={() => setEditingEvent(null)}
            onSaveSuccess={refresh}
          />
        )}

      </div>
    </div>
  );
}