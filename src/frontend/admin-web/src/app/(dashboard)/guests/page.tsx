'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { getAdminConcerts, uploadFile, getUploadedFiles, getConcertGuests } from '@/services/concertService';
import { Guest, Transfer } from '@/types/guests';
import TicketBadge from '@/components/guests/TicketBadge.tsx';
import StatusCell from '@/components/guests/StatusCell.tsx';
import WarnIcon from '@/components/guests/WarnIcon.tsx';
import ActiveTransfers from '@/components/guests/ActiveTransfers.tsx';
import type { Concert, UploadedFile } from '@/types/api';
import { ConcertStatusBadge, UploadStatusBadge } from '@/components/ui/Badge';

// We will load real guest data from the database.

// ── Main Page ──────────────────────────────────────────────────────────
export default function GuestsPage() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState<string>('');
  const [loadingConcerts, setLoadingConcerts] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileTypeRef = useRef<'ARTIST_PRESS_KIT' | 'GUEST_LIST_CSV'>('GUEST_LIST_CSV');

  // Load guests list from DB
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  // Load concerts list
  useEffect(() => {
    getAdminConcerts(1, 100)
      .then((res) => {
        setConcerts(res.data);
        if (res.data.length > 0) setSelectedConcertId(res.data[0].id);
      })
      .catch(() => setConcerts([]))
      .finally(() => setLoadingConcerts(false));
  }, []);

  const refreshGuests = useCallback(async (concertId: string) => {
    if (!concertId) return;
    setLoadingGuests(true);
    try {
      const data = await getConcertGuests(concertId);
      const mapped: Guest[] = data.map((g, idx) => ({
        row: idx + 1,
        name: g.fullName,
        email: g.email || '—',
        phone: g.phone || '—',
        ticketType: g.sponsorName || 'GUEST',
        status: g.checkedInAt ? 'Checked In' : 'Valid',
      }));
      setGuests(mapped);
    } catch {
      setGuests([]);
    } finally {
      setLoadingGuests(false);
    }
  }, []);

  // Load uploaded files + guest list khi đổi concert
  useEffect(() => {
    if (!selectedConcertId) {
      setUploadedFiles([]);
      setGuests([]);
      return;
    }
    getUploadedFiles(selectedConcertId)
      .then((files) => setUploadedFiles(files))
      .catch(() => setUploadedFiles([]));
    refreshGuests(selectedConcertId);
  }, [selectedConcertId, refreshGuests]);

  const errorCount = guests.filter(g => g.status !== 'Valid' && g.status !== 'Checked In').length;
  const validCount = guests.filter(g => g.status === 'Valid' || g.status === 'Checked In').length;

  const handleRemoveTransfer = (id: string) => {
    setTransfers(prev => prev.filter(t => t.id !== id));
  };

  const doUpload = useCallback(async (file: File, purpose: 'ARTIST_PRESS_KIT' | 'GUEST_LIST_CSV') => {
    if (!selectedConcertId) {
      setUploadError('Vui lòng chọn sự kiện trước khi upload.');
      return;
    }
    setUploadError(null);

    const transferId = `upload-${Date.now()}-${file.name}`;
    setTransfers(prev => [{
      id: transferId,
      name: file.name,
      progress: 10,
      complete: false,
    }, ...prev]);

    try {
      await uploadFile(selectedConcertId, file, purpose);

      setTransfers(prev => prev.map(t =>
        t.id === transferId ? { ...t, progress: undefined, complete: true } : t
      ));

      // Refresh uploaded files list
      const files = await getUploadedFiles(selectedConcertId);
      setUploadedFiles(files);
      // Refresh guests list
      await refreshGuests(selectedConcertId);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Upload thất bại. Vui lòng thử lại.';
      setUploadError(Array.isArray(msg) ? msg.join(', ') : msg);
      setTransfers(prev => prev.filter(t => t.id !== transferId));
    }
  }, [selectedConcertId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(file => {
      const purpose = file.name.endsWith('.pdf') ? 'ARTIST_PRESS_KIT' : 'GUEST_LIST_CSV';
      doUpload(file, purpose);
    });
  }, [doUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(file => {
      doUpload(file, fileTypeRef.current);
    });
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Page Header ── */}
      <div>
        <h1 style={{
          fontWeight: 700, fontSize: '30px', lineHeight: '36px',
          letterSpacing: '-0.6px', color: '#191B23', margin: 0,
        }}>
          Ticket &amp; Guest Upload Management
        </h1>
        <p style={{ fontWeight: 400, fontSize: '14px', lineHeight: '20px', color: '#434654', margin: '4px 0 0' }}>
          Upload CSV guest lists or PDF artist profiles. The system will automatically validate records before import.
        </p>
      </div>

      {/* ── Concert Selector ── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #C3C5D7',
        borderRadius: '8px',
        padding: '16px 20px',
        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#191B23', flexShrink: 0 }}>
          Target Event:
        </label>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <select
            value={selectedConcertId}
            onChange={(e) => setSelectedConcertId(e.target.value)}
            disabled={loadingConcerts}
            style={{
              width: '100%',
              height: '34px',
              border: '1px solid #C3C5D7',
              borderRadius: '4px',
              padding: '0 28px 0 10px',
              fontSize: '13px',
              color: '#191B23',
              background: '#FFFFFF',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
            }}
          >
            {loadingConcerts ? (
              <option>Loading events...</option>
            ) : concerts.length === 0 ? (
              <option>No events found</option>
            ) : (
              concerts.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))
            )}
          </select>
          <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6B7280' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>

        {selectedConcertId && (() => {
          const currentConcert = concerts.find(c => c.id === selectedConcertId);
          return currentConcert ? <ConcertStatusBadge status={currentConcert.status} /> : null;
        })()}
      </div>

      {/* Error banner */}
      {uploadError && (
        <div style={{
          padding: '10px 16px',
          background: '#FEE2E2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          color: '#991B1B',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {uploadError}
          <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', fontSize: '16px', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── File Import + Active Transfers row ── */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

        {/* File Import Card */}
        <div style={{
          flex: 1, minWidth: 0,
          background: '#FFFFFF',
          border: '1px solid #C3C5D7',
          borderRadius: '8px',
          boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
          padding: '20px',
        }}>
          {/* Card top */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#434654" strokeWidth="1.8" strokeLinecap="round">
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#191B23' }}>File Import</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                onClick={() => { fileTypeRef.current = 'GUEST_LIST_CSV'; fileInputRef.current?.click(); }}
                disabled={!selectedConcertId}
                style={{
                  height: '28px', padding: '0 12px',
                  border: '1px solid #C3C5D7', borderRadius: '4px',
                  background: '#FFFFFF', color: '#434654',
                  fontSize: '12px', fontWeight: 500, cursor: selectedConcertId ? 'pointer' : 'not-allowed',
                  opacity: selectedConcertId ? 1 : 0.5,
                  fontFamily: 'var(--font-sans)',
                }}
              >Upload CSV</button>
              <button
                onClick={() => { fileTypeRef.current = 'ARTIST_PRESS_KIT'; fileInputRef.current?.click(); }}
                disabled={!selectedConcertId}
                style={{
                  height: '28px', padding: '0 12px',
                  border: '1px solid #C3C5D7', borderRadius: '4px',
                  background: '#FFFFFF', color: '#434654',
                  fontSize: '12px', fontWeight: 500, cursor: selectedConcertId ? 'pointer' : 'not-allowed',
                  opacity: selectedConcertId ? 1 : 0.5,
                  fontFamily: 'var(--font-sans)',
                }}
              >Upload PDF</button>
              <span style={{ fontSize: '12px', color: '#6B7280', background: '#F3F4F6', padding: '2px 10px', borderRadius: '4px' }}>
                CSV, PDF (Max 50MB)
              </span>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => { if (selectedConcertId) fileInputRef.current?.click(); }}
            style={{
              border: `1.5px dashed ${isDragging ? '#003298' : selectedConcertId ? '#C3C5D7' : '#E5E7EB'}`,
              borderRadius: '8px',
              background: isDragging ? '#F0F5FF' : !selectedConcertId ? '#F9FAFB' : '#FAFAFA',
              padding: '44px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: selectedConcertId ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s, border-color 0.15s',
              userSelect: 'none',
            }}
          >
            {/* Icon circle */}
            <div style={{
              width: '52px', height: '52px',
              background: '#E7E7F3',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '8px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#434654" strokeWidth="1.8" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>

            <p style={{ fontWeight: 600, fontSize: '14px', color: selectedConcertId ? '#191B23' : '#9CA3AF', margin: 0 }}>
              {selectedConcertId ? 'Drag & drop files here' : 'Select an event first'}
            </p>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
              {selectedConcertId ? 'or click to browse from your computer' : 'Choose a target event before uploading'}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.pdf"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {/* Active Transfers */}
        <ActiveTransfers transfers={transfers} onRemove={handleRemoveTransfer} />
      </div>

      {/* ── Uploaded Files History ── */}
      {uploadedFiles.length > 0 && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #C3C5D7',
          borderRadius: '8px',
          boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #C3C5D7', background: '#FAFAFA' }}>
            <p style={{ fontWeight: 600, fontSize: '14px', color: '#191B23', margin: 0 }}>Upload History</p>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>Files previously uploaded to this event</p>
          </div>
          {uploadedFiles.map((f, i) => {
            return (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 20px',
                borderBottom: i < uploadedFiles.length - 1 ? '1px solid #C3C5D7' : 'none',
              }}>
                <div>
                  <p style={{ fontWeight: 500, fontSize: '13px', color: '#191B23', margin: 0 }}>{f.originalName}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>
                    {f.purpose.replace(/_/g, ' ')} · {Math.round(f.sizeBytes / 1024)}KB
                  </p>
                </div>
                <UploadStatusBadge status={f.status} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Guest List Table ── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #C3C5D7',
        borderRadius: '8px',
        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #C3C5D7',
        }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '15px', color: '#191B23', margin: 0 }}>Guest List</p>
            <p style={{ fontSize: '13px', color: '#434654', margin: '2px 0 0' }}>
              {guests.length} guest records in database
            </p>
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '48px minmax(0, 1.5fr) minmax(0, 2fr) minmax(0, 1.5fr) 140px 140px',
          gap: '16px',
          padding: '10px 20px',
          borderBottom: '1px solid #C3C5D7',
          background: '#FAFAFA',
        }}>
          {['Row', 'Name', 'Email', 'Phone', 'Ticket Type', 'Status'].map((col) => (
            <span key={col} style={{
              fontSize: '11px', fontWeight: 500,
              letterSpacing: '0.6px', textTransform: 'uppercase', color: '#434654',
            }}>{col}</span>
          ))}
        </div>

        {/* Rows */}
        {loadingGuests ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
            <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #C3C5D7', borderTopColor: '#003298', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '8px' }} />
            <div>Loading guests...</div>
          </div>
        ) : guests.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
            No guests found for this event. Try importing a CSV list.
          </div>
        ) : (
          guests.map((guest, i) => (
            <div
              key={guest.row}
              style={{
                display: 'grid',
                gridTemplateColumns: '48px minmax(0, 1.5fr) minmax(0, 2fr) minmax(0, 1.5fr) 140px 140px',
                gap: '16px',
                padding: '12px 20px',
                borderBottom: i < guests.length - 1 ? '1px solid #C3C5D7' : 'none',
                alignItems: 'center',
                background: (guest.status !== 'Valid' && guest.status !== 'Checked In') ? '#FFF9F9' : '#FFFFFF',
              }}
            >
              <span style={{ fontSize: '13px', color: (guest.status !== 'Valid' && guest.status !== 'Checked In') ? '#991B1B' : '#434654', fontWeight: (guest.status !== 'Valid' && guest.status !== 'Checked In') ? 600 : 400 }}>
                {guest.row}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#191B23', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={guest.name}>{guest.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ fontSize: '13px', color: guest.emailError ? '#991B1B' : '#434654', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={guest.email}>{guest.email}</span>
                {guest.emailError && <WarnIcon />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ fontSize: '13px', color: guest.phoneError ? '#991B1B' : '#434654', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={guest.phone}>{guest.phone}</span>
                {guest.phoneError && <WarnIcon />}
              </div>
              <div><TicketBadge type={guest.ticketType} /></div>
              <StatusCell status={guest.status} />
            </div>
          ))
        )}

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderTop: '1px solid #C3C5D7',
          background: '#FAFAFA',
        }}>
          <span style={{ fontSize: '13px', color: '#434654' }}>Showing {guests.length} entries</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 500 }}>
            {errorCount > 0 && (
              <>
                <span style={{ color: '#991B1B' }}>{errorCount} Errors found</span>
                <span style={{ color: '#C3C5D7' }}>|</span>
              </>
            )}
            <span style={{ color: '#166534' }}>{validCount} Valid</span>
          </div>
        </div>
      </div>
    </div>
  );
}
