'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Concert, TicketType, UploadedFile, ConcertStatus } from '@/types/api';
import { formatVnd, formatDate, formatBytes } from '@/utils/format';
import { ConcertStatusBadge, UploadStatusBadge } from '@/components/ui/Badge';
import SectionCard from '@/components/ui/SectionCard';
import { InlineSpinner } from '@/components/ui/Spinner';
import { InfoRow } from '@/components/ui/FormField';
import TicketTypeRow from '@/components/events/TicketTypeRow';
import UploadDropzone from '@/components/events/UploadDropzone';

// ── Mock Data (TODO: thay bằng getConcertById(params.id)) ──────────────

const mockConcert: Concert = {
  id: '1',
  slug: 'neon-nights-festival-2024',
  organizerId: 'org-1',
  organizer: { id: 'org-1', fullName: 'TicketBox Admin', email: 'admin@ticketbox.vn' },
  title: 'Neon Nights Festival',
  description:
    'An electrifying night of electronic music under the stars. Featuring top DJs from around the world, immersive light installations, and an unforgettable atmosphere.',
  artistBio:
    "Neon Nights Festival brings together the best in electronic and dance music. This year's lineup features acclaimed artists known for their boundary-pushing soundscapes and high-energy performances.",
  venue: 'Echo Arena, Los Angeles',
  startsAt: '2024-10-14T19:00:00Z',
  endsAt: '2024-10-15T03:00:00Z',
  saleStartsAt: '2024-08-01T09:00:00Z',
  saleEndsAt: '2024-10-13T23:59:00Z',
  status: 'SALE_OPEN',
  coverImageUrl: null,
  seatMapUrl: null,
  ticketTypes: [
    { id: 'tt-1', concertId: '1', name: 'VIP Pass',          price: 5_750_000, totalQty: 500,  soldQty: 423,  reservedQty: 12, maxPerUser: 4, status: 'ACTIVE',   createdAt: '2024-07-01T00:00:00Z', updatedAt: '2024-09-01T00:00:00Z' },
    { id: 'tt-2', concertId: '1', name: 'Standard Admission', price: 1_955_000, totalQty: 5000, soldQty: 3210, reservedQty: 45, maxPerUser: 8, status: 'ACTIVE',   createdAt: '2024-07-01T00:00:00Z', updatedAt: '2024-09-01T00:00:00Z' },
    { id: 'tt-3', concertId: '1', name: 'Early Bird',         price: 1_495_000, totalQty: 1000, soldQty: 1000, reservedQty: 0,  maxPerUser: 4, status: 'SOLD_OUT', createdAt: '2024-07-01T00:00:00Z', updatedAt: '2024-07-15T00:00:00Z' },
  ],
  uploadedFiles: [
    { id: 'uf-1', concertId: '1', uploadedById: 'org-1', originalName: 'neon-nights-press-kit.pdf', objectKey: 'concerts/1/press-kit.pdf', mimeType: 'application/pdf', sizeBytes: 3_450_000, purpose: 'ARTIST_PRESS_KIT', status: 'COMPLETED',  errorMessage: null, createdAt: '2024-07-10T00:00:00Z', updatedAt: '2024-07-10T00:05:00Z' },
    { id: 'uf-2', concertId: '1', uploadedById: 'org-1', originalName: 'vip-guest-list.csv',        objectKey: 'concerts/1/guest-list.csv', mimeType: 'text/csv',            sizeBytes: 48_000,     purpose: 'GUEST_LIST_CSV',    status: 'PROCESSING', errorMessage: null, createdAt: '2024-09-15T00:00:00Z', updatedAt: '2024-09-15T00:01:00Z' },
  ],
  createdAt: '2024-07-01T00:00:00Z',
  updatedAt: '2024-09-15T00:00:00Z',
};

// ── Sub-components (dùng riêng trong trang này) ────────────────────────

/** Stat card nhỏ trong Quick Stats row */
function QuickStatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #C3C5D7',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0px 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <p
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#434654',
          margin: '0 0 8px',
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
        }}
      >
        {icon} {label}
      </p>
      <p
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#191B23',
          margin: 0,
          letterSpacing: '-0.3px',
        }}
      >
        {value}
      </p>
    </div>
  );
}

/** Stepper trạng thái concert trong sidebar */
const CONCERT_STATUS_STEPS: ConcertStatus[] = [
  'DRAFT', 'PUBLISHED', 'SALE_OPEN', 'SALE_CLOSED', 'COMPLETED',
];

const concertStatusLabel: Record<ConcertStatus, string> = {
  DRAFT: 'Draft', PUBLISHED: 'Published', SALE_OPEN: 'Sale Open',
  SALE_CLOSED: 'Sale Closed', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

function StatusStepper({ current }: { current: ConcertStatus }) {
  const currentIdx = CONCERT_STATUS_STEPS.indexOf(current);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {CONCERT_STATUS_STEPS.map((step, i) => {
        const isPast = i < currentIdx;
        const isCurrent = step === current;
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                border: isCurrent ? '2px solid #003298' : isPast ? '2px solid #22C55E' : '2px solid #D1D5DB',
                background: isCurrent ? '#003298' : isPast ? '#22C55E' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isPast && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {isCurrent && (
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
              )}
            </div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: isCurrent ? 600 : 400,
                color: isCurrent ? '#191B23' : isPast ? '#434654' : '#9CA3AF',
              }}
            >
              {concertStatusLabel[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** File item hiển thị trong danh sách uploaded files */
function UploadedFileItem({ file }: { file: UploadedFile }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px',
        padding: '10px 12px',
        background: '#FAFAFA', borderRadius: '6px',
        border: '1px solid #E7E7F3',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '1px' }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '12px', fontWeight: 500, color: '#191B23', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.originalName}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <UploadStatusBadge status={file.status} />
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{formatBytes(file.sizeBytes)}</span>
        </div>
        {file.errorMessage && (
          <p style={{ fontSize: '11px', color: '#991B1B', margin: '4px 0 0' }}>{file.errorMessage}</p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const router = useRouter();

  // TODO: const params = useParams<{ id: string }>();
  // TODO: useEffect(() => { getConcertById(params.id).then(setConcert); }, [params.id]);
  const concert: Concert = mockConcert;
  const ticketTypes: TicketType[] = mockConcert.ticketTypes ?? [];
  const uploadedFiles: UploadedFile[] = mockConcert.uploadedFiles ?? [];

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  const handlePdfUpload = useCallback(async (file: File) => {
    setUploadingPdf(true);
    try {
      // TODO: await uploadFile(concert.id, file, 'ARTIST_PRESS_KIT');
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      setUploadingPdf(false);
    }
  }, []);

  const handleCsvUpload = useCallback(async (file: File) => {
    setUploadingCsv(true);
    try {
      // TODO: await uploadFile(concert.id, file, 'GUEST_LIST_CSV');
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      setUploadingCsv(false);
    }
  }, []);

  // Computed stats
  const totalRevenue = ticketTypes.reduce((sum, tt) => sum + tt.soldQty * tt.price, 0);
  const totalSold     = ticketTypes.reduce((sum, tt) => sum + tt.soldQty, 0);
  const totalCapacity = ticketTypes.reduce((sum, tt) => sum + tt.totalQty, 0);
  const sellThrough   = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

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
            <ConcertStatusBadge status={concert.status} />
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
          <button
            style={{
              height: '34px', padding: '0 16px',
              border: 'none', borderRadius: '4px',
              background: '#003298', color: '#FFFFFF',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Edit Event
          </button>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <QuickStatCard icon="💰" label="Total Revenue"   value={formatVnd(totalRevenue)} />
        <QuickStatCard icon="🎫" label="Tickets Sold"    value={`${totalSold.toLocaleString()} / ${totalCapacity.toLocaleString()}`} />
        <QuickStatCard icon="📊" label="Sell-through Rate" value={`${sellThrough}%`} />
      </div>

      {/* ── Main Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Event Info */}
          <SectionCard title="Event Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <InfoRow label="Concert Title" value={concert.title} />
              <InfoRow label="Venue"         value={concert.venue} />
              <InfoRow label="Starts At"     value={formatDate(concert.startsAt)} />
              <InfoRow label="Ends At"       value={formatDate(concert.endsAt)} />
              {concert.saleStartsAt && <InfoRow label="Sale Opens"  value={formatDate(concert.saleStartsAt)} />}
              {concert.saleEndsAt   && <InfoRow label="Sale Closes" value={formatDate(concert.saleEndsAt)} />}
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
          </SectionCard>

          {/* Ticket Types */}
          <SectionCard title="Ticket Types" bodyPadding="0">
            {/* Column header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.8fr 1fr 1.5fr 0.8fr 0.6fr',
                padding: '8px 12px',
                background: '#FAFAFA',
                margin: '0',
              }}
            >
              {['TICKET TYPE', 'PRICE', 'CAPACITY', 'STATUS', ''].map((col) => (
                <span key={col} style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.6px', color: '#9CA3AF', textTransform: 'uppercase' }}>
                  {col}
                </span>
              ))}
            </div>

            {ticketTypes.map((tt) => (
              <TicketTypeRow key={tt.id} ticketType={tt} />
            ))}

            {/* Add Ticket Type button */}
            <div style={{ padding: '12px' }}>
              <button
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '8px 12px', width: '100%',
                  border: '1px dashed #C3C5D7', borderRadius: '4px',
                  background: 'transparent', color: '#003298',
                  fontSize: '12px', fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  transition: 'border-color 0.15s',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Ticket Type
              </button>
            </div>
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
            <StatusStepper current={concert.status} />
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

          {/* Organizer */}
          <SectionCard title="Organizer">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <InfoRow label="Name"  value={concert.organizer?.fullName ?? '—'} />
              <InfoRow label="Email" value={concert.organizer?.email ?? '—'} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
