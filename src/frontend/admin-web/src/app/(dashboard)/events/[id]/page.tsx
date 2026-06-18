'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ConcertStatusBadge } from '@/components/ui/Badge';
import SectionCard from '@/components/ui/SectionCard';
import { InfoRow } from '@/components/ui/FormField';
import TicketTypeRow from '@/components/events/TicketTypeRow';
import UploadDropzone from '@/components/events/UploadDropzone';
import QuickStatCard from '@/components/events/QuickStatCard';
import StatusStepper from '@/components/events/StatusStepper';
import UploadedFileItem from '@/components/events/UploadedFileItem';
import { useEventDetailData } from '@/hooks/useEventDetailData';
import { formatVnd, formatDate } from '@/utils/format';

interface EventDetailPageProps {
  params: {
    id: string;
  };
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const router = useRouter();
  const {
    concert,
    loading,
    uploadingPdf,
    uploadingCsv,
    handlePdfUpload,
    handleCsvUpload,
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
          {concert.organizer && (
            <SectionCard title="Organizer">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoRow label="Name"  value={concert.organizer.fullName ?? '—'} />
                <InfoRow label="Email" value={concert.organizer.email ?? '—'} />
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
