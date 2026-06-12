'use client';
import { useState, useRef, useCallback } from 'react';
import { Guest, Transfer } from '@/components/guests/types.tsx';
import TicketBadge from '@/components/guests/TicketBadge.tsx';
import StatusCell from '@/components/guests/StatusCell.tsx';
import WarnIcon from '@/components/guests/WarnIcon.tsx';
import ActiveTransfers from '@/components/guests/ActiveTransfers.tsx';

// ── Mock Data ─────────────────────────────────────────────────────────
const mockGuests: Guest[] = [
  { row: 1, name: 'Eleanor Shellstrop', email: 'eleanor@example.com',  phone: '+1 555-0198',      ticketType: 'VIP ALL-ACCESS', status: 'Valid' },
  { row: 2, name: 'Chidi Anagonye',     email: 'chidi@example.com',   phone: '+1 555-0199',      ticketType: 'GENERAL',        status: 'Duplicate Email', emailError: true },
  { row: 3, name: 'Tahani Al-Jamil',    email: 'tahani@example.com',  phone: '+44 20 7946 0958', ticketType: 'VIP ALL-ACCESS', status: 'Valid' },
  { row: 4, name: 'Jason Mendoza',      email: 'jason.m@example.com', phone: '555-XYZ',          ticketType: 'GENERAL',        status: 'Invalid Phone', phoneError: true },
  { row: 5, name: 'Michael',            email: 'michael@example.com', phone: '+1 555-0200',      ticketType: 'STAFF',          status: 'Valid' },
];

const initialTransfers: Transfer[] = [
  { id: 'f1', name: 'Guest_List_VIP.csv',     progress: 65, complete: false },
  { id: 'f2', name: 'Artist_Profiles_Q3.pdf', complete: true },
];

// ── Main Page ──────────────────────────────────────────────────────────
export default function GuestsPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errorCount = mockGuests.filter(g => g.status !== 'Valid').length;
  const validCount = mockGuests.filter(g => g.status === 'Valid').length;

  const handleRemoveTransfer = (id: string) => {
    setTransfers(prev => prev.filter(t => t.id !== id));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(file => {
      setTransfers(prev => [{
        id: `upload-${Date.now()}-${file.name}`,
        name: file.name,
        progress: 0,
        complete: false,
      }, ...prev]);
    });
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(file => {
      setTransfers(prev => [{
        id: `upload-${Date.now()}-${file.name}`,
        name: file.name,
        progress: 0,
        complete: false,
      }, ...prev]);
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
            <span style={{
              fontSize: '12px', color: '#6B7280',
              background: '#F3F4F6', padding: '2px 10px', borderRadius: '4px',
            }}>CSV, PDF (Max 50MB)</span>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `1.5px dashed ${isDragging ? '#003298' : '#C3C5D7'}`,
              borderRadius: '8px',
              background: isDragging ? '#F0F5FF' : '#FAFAFA',
              padding: '44px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
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

            <p style={{ fontWeight: 600, fontSize: '14px', color: '#191B23', margin: 0 }}>
              Drag &amp; drop files here
            </p>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
              or click to browse from your computer
            </p>

            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              style={{
                marginTop: '10px',
                padding: '6px 20px',
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
              Select Files
            </button>
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

      {/* ── Data Preview Table ── */}
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
          alignItems: 'flex-start',
          padding: '16px 20px',
          borderBottom: '1px solid #C3C5D7',
        }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '15px', color: '#191B23', margin: 0 }}>Data Preview</p>
            <p style={{ fontSize: '13px', color: '#434654', margin: '2px 0 0' }}>
              Validating 124 records from Guest_List_VIP.csv
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button style={{
              height: '34px', padding: '0 16px',
              border: '1px solid #C3C5D7', borderRadius: '4px',
              background: '#FFFFFF', color: '#434654',
              fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>Cancel</button>
            <button style={{
              height: '34px', padding: '0 16px',
              border: 'none', borderRadius: '4px',
              background: '#003298', color: '#FFFFFF',
              fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>Import Valid Records</button>
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '48px 1.5fr 2fr 1.5fr 140px 140px',
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
        {mockGuests.map((guest, i) => (
          <div
            key={guest.row}
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 1.5fr 2fr 1.5fr 140px 140px',
              gap: '16px',
              padding: '12px 20px',
              borderBottom: i < mockGuests.length - 1 ? '1px solid #C3C5D7' : 'none',
              alignItems: 'center',
              background: guest.status !== 'Valid' ? '#FFF9F9' : '#FFFFFF',
            }}
          >
            {/* Row # */}
            <span style={{
              fontSize: '13px',
              color: guest.status !== 'Valid' ? '#991B1B' : '#434654',
              fontWeight: guest.status !== 'Valid' ? 600 : 400,
            }}>
              {guest.row}
            </span>

            {/* Name */}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#191B23' }}>{guest.name}</span>

            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '13px',
                color: guest.emailError ? '#991B1B' : '#434654',
                fontFamily: 'var(--font-mono)',
              }}>{guest.email}</span>
              {guest.emailError && <WarnIcon />}
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '13px',
                color: guest.phoneError ? '#991B1B' : '#434654',
                fontFamily: 'var(--font-mono)',
              }}>{guest.phone}</span>
              {guest.phoneError && <WarnIcon />}
            </div>

            {/* Ticket Type */}
            <div>
              <TicketBadge type={guest.ticketType} />
            </div>

            {/* Status */}
            <StatusCell status={guest.status} />
          </div>
        ))}

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderTop: '1px solid #C3C5D7',
          background: '#FAFAFA',
        }}>
          <span style={{ fontSize: '13px', color: '#434654' }}>Showing 1-5 of 124</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 500 }}>
            <span style={{ color: '#991B1B' }}>{errorCount} Errors found</span>
            <span style={{ color: '#C3C5D7' }}>|</span>
            <span style={{ color: '#166534' }}>{validCount} Valid</span>
          </div>
        </div>
      </div>
    </div>
  );
}
