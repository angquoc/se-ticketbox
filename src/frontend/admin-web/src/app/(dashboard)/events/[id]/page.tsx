'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SectionCard from '@/components/ui/SectionCard';
import { InfoRow } from '@/components/ui/FormField';
import TicketTypeRow from '@/components/events/TicketTypeRow';
import UploadDropzone from '@/components/events/UploadDropzone';
import QuickStatCard from '@/components/events/QuickStatCard';
import StatusStepper from '@/components/events/StatusStepper';
import UploadedFileItem from '@/components/events/UploadedFileItem';
import TicketConfigPanel from '@/components/events/TicketConfigPanel';
import { useEventDetailData } from '@/hooks/useEventDetailData';
import { formatVnd, formatDate } from '@/utils/format';

interface EventDetailPageProps {
  params: {
    id: string;
  };
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const router = useRouter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const {
    concert,
    loading,
    uploadingPdf,
    uploadingCsv,
    handlePdfUpload,
    handleCsvUpload,
    handleStatusChange,
    updatingStatus,
    refreshConcert,
  } = useEventDetailData(params.id);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#434654' }}>Loading event details...</div>;
  }

  if (!concert) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#BA1A1A' }}>Event not found.</div>;
  }

  const ticketTypes = concert.ticketTypes ?? [];
  const uploadedFiles = concert.uploadedFiles ?? [];

  // Computed stats
  const totalRevenue = ticketTypes.reduce((sum, tt) => sum + tt.soldQty * tt.price, 0);
  const totalSold = ticketTypes.reduce((sum, tt) => sum + tt.soldQty, 0);
  const totalCapacity = ticketTypes.reduce((sum, tt) => sum + tt.totalQty, 0);
  const sellThrough = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>

      {/* ── Breadcrumb ── */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
        <Link href="/events" style={{ color: '#434654', textDecoration: 'none' }}>Events</Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={{ color: '#191B23', fontWeight: 500 }}>{concert.title}</span>
      </nav>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontWeight: 700, fontSize: '28px', letterSpacing: '-0.5px', color: '#191B23', margin: 0 }}>
              {concert.title}
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: '#434654', margin: 0 }}>
            {concert.venue} · {formatDate(concert.startsAt)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => router.back()}
            style={{
              height: '34px', padding: '0 14px',
              border: '1px solid #C3C5D7', borderRadius: '4px',
              background: '#FFFFFF', color: '#434654',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <QuickStatCard
          icon={
            <svg width="22" height="16" viewBox="0 0 24 18" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="22" height="14" rx="2" />
              <path d="M1 7h22" />
            </svg>
          }
          label="Total Revenue"
          value={formatVnd(totalRevenue)}
        />
        <QuickStatCard
          icon={
            <svg width="20" height="16" viewBox="0 0 24 18" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9h20M9 1v16M15 1v16" />
              <rect x="2" y="1" width="20" height="16" rx="2" />
            </svg>
          }
          label="Tickets Sold"
          value={`${totalSold.toLocaleString()} / ${totalCapacity.toLocaleString()}`}
        />
        <QuickStatCard
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003298" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          }
          label="Sell-through Rate"
          value={`${sellThrough}%`}
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Event Info */}
          <SectionCard title="Event Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InfoRow label="Concert Title" value={concert.title} />
              <InfoRow label="Venue" value={concert.venue} />
              <InfoRow label="Starts At" value={formatDate(concert.startsAt)} />
              <InfoRow label="Ends At" value={formatDate(concert.endsAt)} />
              {concert.saleStartsAt && <InfoRow label="Sale Opens" value={formatDate(concert.saleStartsAt)} />}
              {concert.saleEndsAt && <InfoRow label="Sale Closes" value={formatDate(concert.saleEndsAt)} />}
            </div>
            {concert.description && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E7E7F3' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>
                  Description
                </p>
                <p style={{ fontSize: '14px', color: '#434654', margin: 0, lineHeight: '22px' }}>
                  {concert.description}
                </p>
              </div>
            )}
            {/* Cover Image */}
            {concert.coverImageUrl && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E7E7F3' }}>
                <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>
                  Cover Image
                </p>
                <img
                  src={concert.coverImageUrl}
                  alt={`${concert.title} cover`}
                  style={{
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid #C3C5D7',
                  }}
                />
                <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '6px 0 0', wordBreak: 'break-all' }}>
                  {concert.coverImageUrl}
                </p>
              </div>
            )}
          </SectionCard>

          {/* Ticket Types */}
          <SectionCard
            title="Ticket Types"
            bodyPadding="0"
            action={
              <button
                onClick={() => setIsConfigOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#003298',
                  fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  padding: 0,
                }}
              >
                Edit
              </button>
            }
          >
            {/* Column header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.8fr 1fr 1.5fr 0.8fr',
                padding: '8px 12px',
                background: '#FAFAFA',
                margin: '0',
              }}
            >
              {['TICKET TYPE', 'PRICE', 'CAPACITY', 'STATUS'].map((col) => (
                <span key={col} style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.6px', color: '#9CA3AF', textTransform: 'uppercase' }}>
                  {col}
                </span>
              ))}
            </div>

            {ticketTypes.map((tt) => (
              <TicketTypeRow
                key={tt.id}
                ticketType={tt}
              />
            ))}
          </SectionCard>

          {/* Artist Bio */}
          {concert.artistBio && (
            <SectionCard title="Artist Bio (AI Generated)">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '999px', background: '#F0F4FF', color: '#003298', fontSize: '11px', fontWeight: 600, flexShrink: 0 }}>
                  ✦ AI
                </span>
                <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '3px 0 0' }}>
                  Generated from PDF press kit. Review before publishing.
                </p>
              </div>
              <p style={{ fontSize: '14px', color: '#434654', margin: 0, lineHeight: '22px' }}>
                {concert.artistBio}
              </p>
            </SectionCard>
          )}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Status Workflow */}
          <SectionCard title="Concert Status">
            <StatusStepper
              current={concert.status}
              onStatusChange={handleStatusChange}
              updating={updatingStatus}
            />
          </SectionCard>

          {/* Uploads */}
          <SectionCard title="File Uploads">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Existing files list */}
              {uploadedFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.4px', textTransform: 'uppercase', color: '#9CA3AF', margin: 0 }}>
                    Uploaded Files
                  </p>
                  {uploadedFiles.map((uf) => (
                    <UploadedFileItem key={uf.id} file={uf} />
                  ))}
                </div>
              )}

              {/* PDF dropzone */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.4px', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>
                  PDF Press Kit
                </p>
                <UploadDropzone
                  accept=".pdf,application/pdf"
                  label="Upload PDF Press Kit"
                  hint="AI will generate artist bio from this file"
                  onFile={handlePdfUpload}
                  loading={uploadingPdf}
                />
              </div>

              {/* CSV dropzone */}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.4px', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 8px' }}>
                  Guest List CSV
                </p>
                <UploadDropzone
                  accept=".csv,text/csv"
                  label="Upload Guest List CSV"
                  hint="fullName, email, phone, sponsorName"
                  onFile={handleCsvUpload}
                  loading={uploadingCsv}
                />
              </div>
            </div>
          </SectionCard>

          {/* Seat Map */}
          {concert.seatMapUrl && (
            <SectionCard title="Seat Map">
              <img
                src={concert.seatMapUrl}
                alt={`${concert.title} seat map`}
                style={{
                  width: '100%',
                  borderRadius: '6px',
                  border: '1px solid #C3C5D7',
                  display: 'block',
                }}
              />
              <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '8px 0 0', wordBreak: 'break-all' }}>
                {concert.seatMapUrl}
              </p>
            </SectionCard>
          )}

          {/* Organizer */}
          {concert.organizer && (
            <SectionCard title="Organizer">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoRow label="Name" value={concert.organizer.fullName ?? '—'} />
                <InfoRow label="Email" value={concert.organizer.email ?? '—'} />
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* ── Ticket Config Modal ── */}
      {isConfigOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(25, 27, 35, 0.4)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{ maxHeight: '90vh', display: 'flex', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', borderRadius: '8px', overflow: 'hidden' }}>
            <TicketConfigPanel
              event={concert}
              onClose={() => setIsConfigOpen(false)}
              onSaveSuccess={refreshConcert}
            />
          </div>
        </div>
      )}
    </div>
  );
}
